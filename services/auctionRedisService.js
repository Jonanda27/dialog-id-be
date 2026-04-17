import Redis from 'ioredis';

// Inisialisasi koneksi Redis (sesuaikan dengan environment variable Anda)
const redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null,
});

/**
 * LUA SCRIPT: Jantung dari sistem Anti-Spam dan Anti Race-Condition.
 * Script ini dieksekusi SECARA ATOMIK di dalam engine Redis.
 * * KEYS[1] = auction:{id}:price       (Current Price)
 * KEYS[2] = auction:{id}:cooldown:{user_id} (Cooldown flag)
 * KEYS[3] = auction:{id}:winner      (Current Highest Bidder)
 * KEYS[4] = auction:{id}:freeze      (Freeze indicator)
 * * ARGV[1] = expectedPrice (Harga yang diklik oleh user)
 * ARGV[2] = increment     (Kenaikan tetap / Fixed Increment)
 * ARGV[3] = userId        (ID User yang melakukan bid)
 */
const placeBidLuaScript = `
    -- 1. Cek masa tenang (Freeze)
    local is_frozen = redis.call('GET', KEYS[4])
    if is_frozen == '1' then
        return {err = 'FREEZE_MODE'}
    end

    -- 2. Cek Anti-Spam (Cooldown 5 Detik)
    local is_cooldown = redis.call('EXISTS', KEYS[2])
    if is_cooldown == 1 then
        return {err = 'COOLDOWN'}
    end

    -- 3. Cek Sinkronisasi Harga (Race Condition Handler)
    local current_price = tonumber(redis.call('GET', KEYS[1]) or '0')
    local expected = tonumber(ARGV[1])
    local increment = tonumber(ARGV[2])

    -- Jika harga ekspektasi dari frontend TIDAK SAMA dengan (harga sekarang + increment)
    -- Berarti ada user lain yang menang sepersekian milidetik sebelumnya.
    if expected ~= (current_price + increment) then
        return {err = 'PRICE_CHANGED', current_price = current_price}
    end

    -- 4. Lolos semua validasi -> Eksekusi State Baru
    redis.call('SET', KEYS[1], expected)
    redis.call('SET', KEYS[3], ARGV[3])
    
    -- Set Cooldown 5 detik untuk user ini di lelang ini
    redis.call('SET', KEYS[2], '1', 'EX', 5)

    return expected
`;

// Daftarkan command baru di instance redis
redis.defineCommand('atomicBid', {
    numberOfKeys: 4,
    lua: placeBidLuaScript,
});

class AuctionRedisService {
    /**
     * Mempersiapkan state awal saat status lelang berpindah dari SCHEDULED ke ACTIVE
     * Dieksekusi oleh Worker/Cron saat start_time tercapai.
     */
    static async initializeAuction(auctionId, startPrice) {
        const pipeline = redis.pipeline();
        pipeline.set(`auction:${auctionId}:price`, startPrice);
        pipeline.del(`auction:${auctionId}:winner`);
        pipeline.del(`auction:${auctionId}:freeze`);
        await pipeline.exec();

        console.log(`[REDIS] Lelang ${auctionId} diinisialisasi dengan harga dasar ${startPrice}`);
        return true;
    }

    /**
     * Memproses masuknya Bid dari User
     * Dieksekusi oleh Socket.io Gateway
     */
    static async placeBid(auctionId, userId, expectedPrice, increment) {
        const priceKey = `auction:${auctionId}:price`;
        const cooldownKey = `auction:${auctionId}:cooldown:${userId}`;
        const winnerKey = `auction:${auctionId}:winner`;
        const freezeKey = `auction:${auctionId}:freeze`;

        try {
            // Panggil Lua Script yang sudah didefinisikan
            const result = await redis.atomicBid(
                priceKey,
                cooldownKey,
                winnerKey,
                freezeKey,
                expectedPrice,
                increment,
                userId
            );

            // Menangani Custom Error dari Lua Script
            if (result && result.err) {
                switch (result.err) {
                    case 'FREEZE_MODE':
                        throw new Error('Lelang sedang dalam masa sinkronisasi data akhir (Masa Tenang). Bid ditutup.');
                    case 'COOLDOWN':
                        throw new Error('Tunggu 5 detik sebelum melakukan bid kembali.');
                    case 'PRICE_CHANGED':
                        throw new Error(`Harga telah meloncat ke Rp${result.current_price}. UI Anda sedang disinkronisasi.`);
                    default:
                        throw new Error('Terjadi kesalahan tidak terduga pada sistem lelang.');
                }
            }

            // Jika sukses, result berisi new_price
            return {
                success: true,
                newPrice: result,
                winnerId: userId
            };

        } catch (error) {
            // Lempar error ke layer Socket untuk di-emit ke client spesifik
            throw error;
        }
    }

    /**
     * Mengunci lelang 15 detik sebelum waktu habis (Masa Tenang)
     * Dieksekusi oleh FastAPI Worker / Node Scheduler
     */
    static async freezeAuction(auctionId) {
        const freezeKey = `auction:${auctionId}:freeze`;

        // Kunci masuknya bid baru
        await redis.set(freezeKey, '1');

        // Ambil hasil pemenang terakhir dan harga final
        const finalPrice = await redis.get(`auction:${auctionId}:price`);
        const winnerId = await redis.get(`auction:${auctionId}:winner`);

        console.log(`[REDIS] Lelang ${auctionId} masuk status FREEZE. Pemenang sementata: ${winnerId || 'TIDAK ADA'}`);

        return {
            finalPrice: finalPrice ? parseFloat(finalPrice) : 0,
            winnerId: winnerId || null
        };
    }

    /**
     * Mengambil data state terkini (Untuk UI yang baru re-render/refresh)
     */
    static async getAuctionState(auctionId) {
        const [currentPrice, winnerId, isFrozen] = await Promise.all([
            redis.get(`auction:${auctionId}:price`),
            redis.get(`auction:${auctionId}:winner`),
            redis.get(`auction:${auctionId}:freeze`),
        ]);

        return {
            currentPrice: currentPrice ? parseFloat(currentPrice) : 0,
            winnerId: winnerId || null,
            isFrozen: isFrozen === '1'
        };
    }

    /**
     * Membersihkan key di memori setelah lelang masuk status COMPLETED / HANDOVER / FAILED
     */
    static async clearAuctionMemory(auctionId) {
        // Mengambil semua key cooldown yang terkait dengan lelang ini
        const cooldownKeys = await redis.keys(`auction:${auctionId}:cooldown:*`);

        const keysToDelete = [
            `auction:${auctionId}:price`,
            `auction:${auctionId}:winner`,
            `auction:${auctionId}:freeze`,
            ...cooldownKeys
        ];

        if (keysToDelete.length > 0) {
            await redis.del(...keysToDelete);
        }

        console.log(`[REDIS] Garbage collection untuk lelang ${auctionId} selesai.`);
    }
}

export default AuctionRedisService;