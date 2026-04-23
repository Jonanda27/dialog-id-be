import 'dotenv/config';
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    console.error("[REDIS] ❌ ERROR: REDIS_URL tidak ditemukan di .env!");
}

const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
});

redis.on('connect', () => {
    console.log('[REDIS] 🚀 Terhubung ke Cloud Redis (Upstash) ✅');
});

redis.on('error', (err) => {
    console.error('[REDIS] ❌ Gagal Koneksi:', err.message);
});

/**
 * LUA SCRIPT: Jantung dari sistem Dynamic Bid, Anti-Spam, dan Anti Race-Condition.
 * Dieksekusi SECARA ATOMIK (Thread-Safe) di dalam engine C Redis.
 * * KEYS[1] = auction:{id}:price              (Current Price - String)
 * KEYS[2] = auction:{id}:cooldown:{user_id} (Cooldown flag - String)
 * KEYS[3] = auction:{id}:freeze             (Freeze indicator - String)
 * KEYS[4] = auction:{id}:leaderboard        (Klasemen Top Bidders - ZSET)
 * KEYS[5] = auction:{id}:history            (Riwayat log berjalan - List)
 * * ARGV[1] = expectedPrice    (Harga dinamis yang diajukan oleh user)
 * ARGV[2] = minimumIncrement (Batas bawah minimum kenaikan / Bare Minimum)
 * ARGV[3] = userId           (ID User yang melakukan bid)
 * ARGV[4] = historyPayload   (String JSON berisi data log untuk List history)
 */
const placeBidLuaScript = `
    -- 1. Cek masa tenang (Freeze)
    local is_frozen = redis.call('GET', KEYS[3])
    if is_frozen == '1' then
        return {err = 'FREEZE_MODE'}
    end

    -- 2. Cek Anti-Spam (Cooldown 5 Detik)
    local is_cooldown = redis.call('EXISTS', KEYS[2])
    if is_cooldown == 1 then
        return {err = 'COOLDOWN'}
    end

    -- 3. Cek Threshold Dynamic Bid (Race Condition Handler)
    local current_price = tonumber(redis.call('GET', KEYS[1]) or '0')
    local expected = tonumber(ARGV[1])
    local min_increment = tonumber(ARGV[2])

    -- Jika harga ekspektasi kurang dari (harga sekarang + minimum increment), tolak!
    if expected < (current_price + min_increment) then
        return {err = 'PRICE_TOO_LOW', current_price = current_price, min_increment = min_increment}
    end

    -- 4. Lolos semua validasi -> Update Harga Tertinggi Mutlak
    redis.call('SET', KEYS[1], expected)
    
    -- 5. Hitung Klasemen (Sorted Set). Score = expected price, Member = userId
    redis.call('ZADD', KEYS[4], expected, ARGV[3])

    -- 6. Catat Log Riwayat (List). Insert ke index 0, lalu potong otomatis max 50 log (Memory Management)
    redis.call('LPUSH', KEYS[5], ARGV[4])
    redis.call('LTRIM', KEYS[5], 0, 49)

    -- 7. Set Cooldown 5 detik untuk user ini di lelang ini
    redis.call('SET', KEYS[2], '1', 'EX', 5)

    return expected
`;

// Daftarkan command baru di instance redis dengan 5 KEYS
redis.defineCommand('atomicBid', {
    numberOfKeys: 5,
    lua: placeBidLuaScript,
});

class AuctionRedisService {
    /**
     * Mempersiapkan state awal saat status lelang berpindah dari SCHEDULED ke ACTIVE.
     * Membersihkan key lama dari ZSET dan List agar tidak terjadi 'dirty data'.
     */
    static async initializeAuction(auctionId, startPrice) {
        const pipeline = redis.pipeline();
        pipeline.set(`auction:${auctionId}:price`, startPrice);
        pipeline.del(`auction:${auctionId}:freeze`);
        pipeline.del(`auction:${auctionId}:leaderboard`);
        pipeline.del(`auction:${auctionId}:history`);
        await pipeline.exec();

        console.log(`[REDIS] Lelang ${auctionId} diinisialisasi dengan harga dasar ${startPrice}`);
        return true;
    }

    /**
     * Memproses masuknya Bid Dinamis dari User
     */
    static async placeBid(auctionId, userId, expectedPrice, minimumIncrement) {
        const priceKey = `auction:${auctionId}:price`;
        const cooldownKey = `auction:${auctionId}:cooldown:${userId}`;
        const freezeKey = `auction:${auctionId}:freeze`;
        const leaderboardKey = `auction:${auctionId}:leaderboard`;
        const historyKey = `auction:${auctionId}:history`;

        // Rakit payload JSON untuk disimpan ke dalam Redis List
        const timestamp = new Date().toISOString();
        const historyPayload = JSON.stringify({ userId, amount: expectedPrice, timestamp });

        try {
            const result = await redis.atomicBid(
                priceKey,
                cooldownKey,
                freezeKey,
                leaderboardKey,
                historyKey,
                expectedPrice,
                minimumIncrement,
                userId,
                historyPayload
            );

            // Menangani Custom Error dari eksekusi C Engine (Lua Script)
            if (result && result.err) {
                switch (result.err) {
                    case 'FREEZE_MODE':
                        throw new Error('Lelang sedang dalam masa sinkronisasi data akhir (Masa Tenang). Bid ditutup.');
                    case 'COOLDOWN':
                        throw new Error('Sistem mendeteksi spam. Tunggu 5 detik sebelum melakukan bid kembali.');
                    case 'PRICE_TOO_LOW':
                        const reqMin = result.current_price + result.min_increment;
                        throw new Error(`Harga telah naik. Minimum bid yang valid saat ini adalah Rp${reqMin}.`);
                    default:
                        throw new Error('Terjadi kesalahan tidak terduga pada mesin konkurensi lelang.');
                }
            }

            // Ambil klasemen 3 teratas yang paling baru secara realtime
            const topBidders = await this.getTopBidders(auctionId, 3);

            return {
                success: true,
                newPrice: result,
                winnerId: userId,
                topBidders: topBidders,
                recentLog: JSON.parse(historyPayload) // Dikembalikan agar bisa dibroadcast terpisah jika perlu
            };

        } catch (error) {
            throw error; // Lempar ke layer SocketGateway
        }
    }

    /**
     * Mengambil struktur Data State utuh untuk payload awal Websocket (SYNC_AUCTION_STATE)
     * Menggunakan Redis Pipeline agar eksekusi 4 query berjalan dalam 1 network trip.
     */
    static async getAuctionStatePayload(auctionId, userId = null) {
        const pipeline = redis.pipeline();

        pipeline.get(`auction:${auctionId}:price`);
        pipeline.get(`auction:${auctionId}:freeze`);
        pipeline.zrevrange(`auction:${auctionId}:leaderboard`, 0, 2, 'WITHSCORES'); // Top 3
        pipeline.lrange(`auction:${auctionId}:history`, 0, 49); // 50 Log Terakhir

        if (userId) {
            pipeline.exists(`auction:${auctionId}:cooldown:${userId}`);
        }

        const results = await pipeline.exec();

        const currentPrice = results[0][1];
        const isFrozen = results[1][1];
        const rawLeaderboard = results[2][1];
        const rawHistory = results[3][1];

        let isOnCooldown = false;
        if (userId && results[4]) {
            isOnCooldown = results[4][1] === 1;
        }

        // Parsing ZSET Array [member, score, member, score] menjadi Array Object
        const topBidders = [];
        for (let i = 0; i < rawLeaderboard.length; i += 2) {
            topBidders.push({
                userId: rawLeaderboard[i],
                amount: parseFloat(rawLeaderboard[i + 1])
            });
        }

        return {
            currentPrice: currentPrice ? parseFloat(currentPrice) : 0,
            isFrozen: isFrozen === '1',
            topBidders: topBidders,
            recentHistory: rawHistory.map(item => JSON.parse(item)),
            isOnCooldown: isOnCooldown
        };
    }

    /**
     * Helper Method untuk mengekstrak Top Bidders dari ZSET
     */
    static async getTopBidders(auctionId, limit = 3) {
        const rawData = await redis.zrevrange(`auction:${auctionId}:leaderboard`, 0, limit - 1, 'WITHSCORES');
        const topBidders = [];
        for (let i = 0; i < rawData.length; i += 2) {
            topBidders.push({
                userId: rawData[i],
                amount: parseFloat(rawData[i + 1])
            });
        }
        return topBidders;
    }

    /**
     * Mengunci lelang 15 detik sebelum waktu habis (Masa Tenang)
     */
    static async freezeAuction(auctionId) {
        const freezeKey = `auction:${auctionId}:freeze`;
        await redis.set(freezeKey, '1');

        const finalPrice = await redis.get(`auction:${auctionId}:price`);

        // Pemenang ditarik mutlak dari posisi Peringkat 1 di klasemen ZSET
        const top1 = await redis.zrevrange(`auction:${auctionId}:leaderboard`, 0, 0);
        const winnerId = top1.length > 0 ? top1[0] : null;

        console.log(`[REDIS] Lelang ${auctionId} masuk status FREEZE. Pemenang sementara: ${winnerId || 'TIDAK ADA'}`);

        return {
            finalPrice: finalPrice ? parseFloat(finalPrice) : 0,
            winnerId: winnerId
        };
    }

    /**
     * Membersihkan seluruh key di memori setelah evaluasi/handover selesai (Garbage Collection)
     */
    static async clearAuctionMemory(auctionId) {
        const cooldownKeys = await redis.keys(`auction:${auctionId}:cooldown:*`);

        const keysToDelete = [
            `auction:${auctionId}:price`,
            `auction:${auctionId}:freeze`,
            `auction:${auctionId}:leaderboard`,
            `auction:${auctionId}:history`,
            ...cooldownKeys
        ];

        if (keysToDelete.length > 0) {
            await redis.del(...keysToDelete);
        }

        console.log(`[REDIS] Garbage collection untuk lelang ${auctionId} selesai membebaskan ${keysToDelete.length} key.`);
    }
}

export default AuctionRedisService;