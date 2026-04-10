// middlewares/storeMiddleware.js
import db from "../models/index.js"; // Pastikan path import db benar

export const isStoreApproved = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Unauthorized: User tidak ditemukan' 
            });
        }

        // 1. Cari data toko berdasarkan ID user yang sedang login
        // Sesuaikan 'user_id' dengan nama kolom di tabel Stores kamu
        const store = await db.Store.findOne({ 
            where: { user_id: req.user.id } 
        });

        // 2. Jika toko tidak ditemukan
        if (!store) {
            return res.status(404).json({ 
                success: false, 
                message: 'Toko tidak ditemukan untuk user ini.' 
            });
        }

        // 3. Cek status (Opsional, sesuai nama middleware-nya 'isStoreApproved')
        if (store.status !== 'approved') {
            return res.status(403).json({ 
                success: false, 
                message: `Akses ditolak. Status toko Anda: ${store.status}` 
            });
        }

        // 4. KRUSIAL: Injeksi data store ke dalam object request
        // Agar bisa dibaca oleh Controller sebagai req.store.id
        req.store = store;
        
        next();
    } catch (error) {
        console.error("Error di isStoreApproved Middleware:", error);
        next(error);
    }
};