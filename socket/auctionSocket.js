import jwt from 'jsonwebtoken';
import AuctionRedisService from '../services/auctionRedisService.js';

export default function initializeAuctionSocket(io) {
    // 1. Isolasi Namespace: Kita pisahkan koneksi lelang dari notifikasi atau chat reguler
    const auctionNamespace = io.of('/auction');

    // 2. Middleware Autentikasi (High Cohesion)
    // Mencegah koneksi siluman. Hanya user terautentikasi yang bisa menekan bid.
    auctionNamespace.use((socket, next) => {
        // Mendukung token yang dikirim via handshake auth atau headers
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;

        if (!token) {
            return next(new Error('Authentication error: Token missing'));
        }

        try {
            const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
            // Injeksi data user ke dalam objek socket untuk digunakan pada event listener
            socket.user = decoded;
            next();
        } catch (err) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    // 3. Event Listeners
    auctionNamespace.on('connection', (socket) => {
        console.log(`[SOCKET] User ${socket.user.id} terhubung ke namespace /auction`);

        /**
         * Event: JOIN_AUCTION
         * Saat user masuk ke halaman detail produk yang sedang dilelang
         */
        socket.on('JOIN_AUCTION', async (payload) => {
            const { auctionId } = payload;
            const roomName = `auction:${auctionId}`;

            // Masukkan socket user ke dalam "Kamar" spesifik produk ini
            socket.join(roomName);
            console.log(`[SOCKET] User ${socket.user.id} bergabung ke room ${roomName}`);

            try {
                const currentState = await AuctionRedisService.getAuctionState(auctionId);

                // ⚡ TAMBAHKAN BARIS INI: Cek wujud asli data dari Redis
                console.log(`[SOCKET DEBUG] Payload untuk SYNC_AUCTION_STATE:`, JSON.stringify(currentState, null, 2));

                socket.emit('SYNC_AUCTION_STATE', currentState);
            } catch (error) {
                console.error(`[SOCKET] Gagal melakukan sinkronisasi awal untuk ${auctionId}:`, error);
            }
        });

        /**
         * Event: SUBMIT_BID
         * Saat user menekan tombol "Bid +Rp25.000"
         */
        socket.on('SUBMIT_BID', async (payload) => {
            const { auctionId, expectedPrice, increment } = payload;
            const userId = socket.user.id; // Diambil dari token JWT, tidak bisa dimanipulasi dari frontend

            try {
                // Delegasi eksekusi atomik ke Redis Service
                const result = await AuctionRedisService.placeBid(
                    auctionId,
                    userId,
                    expectedPrice,
                    increment
                );

                if (result.success) {
                    // BROADCAST: Harga berhasil naik. 
                    // Pancarkan event 'NEW_HIGHEST_BID' ke SELURUH user yang ada di room ini,
                    // agar layar mereka semua berkedip secara instan dan sinkron ke harga baru.
                    auctionNamespace.to(`auction:${auctionId}`).emit('NEW_HIGHEST_BID', {
                        auctionId: auctionId,
                        newPrice: result.newPrice,
                        winnerId: result.winnerId,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (error) {
                // ⚡ FIX: Tambahkan logging internal untuk visibilitas Server (Observability)
                // Mencatat detail transaksi yang ditolak oleh LUA Script (Race Condition / Cooldown)
                console.error(`[SOCKET ❌ BID_REJECTED] User: ${userId} | Auction: ${auctionId} | Expected: ${expectedPrice} | Reason: ${error.message}`);

                // ERROR ISOLATION: Skenario Cooldown 5 detik atau Jebakan Harga (Race Condition).
                // Kita TIDAK mem-broadcast error ini. Kita hanya melemparnya kembali ke user yang menekan tombol.
                socket.emit('BID_ERROR', {
                    auctionId: auctionId,
                    message: error.message // Berisi pesan dari throw error di Redis Service
                });
            }
        });

        /**
         * Event: LEAVE_AUCTION
         * Bersih-bersih saat komponen React di unmount
         */
        socket.on('LEAVE_AUCTION', (payload) => {
            const { auctionId } = payload;
            socket.leave(`auction:${auctionId}`);
        });

        socket.on('disconnect', () => {
            console.log(`[SOCKET] User ${socket.user.id} terputus dari namespace /auction`);
        });
    });
}