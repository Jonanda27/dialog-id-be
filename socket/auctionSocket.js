import jwt from 'jsonwebtoken';
import AuctionRedisService from '../services/auctionRedisService.js';

export default function initializeAuctionSocket(io) {
    // 1. Isolasi Namespace: Memisahkan koneksi lelang dari notifikasi atau chat reguler
    const auctionNamespace = io.of('/auction');

    // 2. Middleware Autentikasi (High Cohesion)
    auctionNamespace.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;

        if (!token) {
            return next(new Error('Authentication error: Token missing'));
        }

        try {
            const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
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
         * Saat user masuk ke halaman khusus lelang
         */
        socket.on('JOIN_AUCTION', async (payload) => {
            const { auctionId } = payload;
            const roomName = `auction:${auctionId}`;
            const userId = socket.user.id;

            // Masukkan socket user ke dalam "Kamar" spesifik lelang ini
            socket.join(roomName);
            console.log(`[SOCKET] User ${userId} bergabung ke room ${roomName}`);

            try {
                // PERBAIKAN TAHAP 3: Mengambil State Komposit (Harga, Klasemen Top 3, dan History)
                const currentState = await AuctionRedisService.getAuctionStatePayload(auctionId, userId);

                // Sinkronisasi awal layar client dengan kebenaran absolut dari memori Redis
                socket.emit('SYNC_AUCTION_STATE', currentState);
            } catch (error) {
                console.error(`[SOCKET] Gagal melakukan sinkronisasi awal untuk ${auctionId}:`, error);
            }
        });

        /**
         * Event: SUBMIT_BID
         * Saat user menekan tombol "Bid Dinamis"
         */
        socket.on('SUBMIT_BID', async (payload) => {
            const { auctionId, expectedPrice, increment } = payload;
            const userId = socket.user.id;

            try {
                // Delegasi eksekusi atomik ke Redis Service (LUA Script)
                const result = await AuctionRedisService.placeBid(
                    auctionId,
                    userId,
                    expectedPrice,
                    increment // Bertindak sebagai batas bawah minimum increment
                );

                if (result.success) {
                    // PERBAIKAN TAHAP 3: Broadcast State Terkini (Single Source of Truth)
                    // Mengubah event lama 'NEW_HIGHEST_BID' menjadi 'AUCTION_STATE_UPDATED' 
                    // agar layar client (Top 3 dan History) merender ulang secara serentak.
                    auctionNamespace.to(`auction:${auctionId}`).emit('AUCTION_STATE_UPDATED', {
                        auctionId: auctionId,
                        newPrice: result.newPrice,
                        winnerId: result.winnerId,
                        topBidders: result.topBidders,
                        recentLog: result.recentLog,
                        timestamp: new Date().toISOString()
                    });
                }
            } catch (error) {
                // Logging internal untuk Server Observability (Mencatat Race Condition / Cooldown Timeout)
                console.error(`[SOCKET ❌ BID_REJECTED] User: ${userId} | Auction: ${auctionId} | Expected: ${expectedPrice} | Reason: ${error.message}`);

                // ERROR ISOLATION: 
                // Melempar error spesifik (misal: "Harga telah naik, minimum bid saat ini Rp...")
                // HANYA ke client yang gagal, tanpa mengganggu layar user lain di room tersebut.
                socket.emit('BID_ERROR', {
                    auctionId: auctionId,
                    message: error.message
                });
            }
        });

        /**
         * Event: LEAVE_AUCTION
         * Bersih-bersih saat komponen React di unmount (User pindah halaman)
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