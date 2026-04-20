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

/**
 * MIDDLEWARE BARU: checkAndRestoreSuspension
 * Fungsi: Memeriksa apakah masa suspend toko sudah habis. Jika sudah, 
 * otomatis mengubah status toko kembali ke 'approved' di database.
 */
export const checkAndRestoreSuspension = async (req, res, next) => {
    try {
        if (!req.user) return next();

        // 1. Cari data toko beserta suspensi aktifnya
        const store = await db.Store.findOne({ 
            where: { user_id: req.user.id },
            include: [{
                model: db.StoreSuspension,
                as: 'suspensions',
                where: { is_active: true },
                required: false
            }]
        });

        // 2. Jika toko sedang disuspend, cek waktunya
        if (store && store.status === 'suspended') {
            const activeSuspension = store.suspensions?.[0];
            const now = new Date();

            if (activeSuspension && activeSuspension.suspended_until && now > new Date(activeSuspension.suspended_until)) {
                // Jalankan transaksi pemulihan status
                const transaction = await db.sequelize.transaction();
                try {
                    // Matikan record suspensi
                    await db.StoreSuspension.update(
                        { is_active: false },
                        { where: { id: activeSuspension.id }, transaction }
                    );

                    // Kembalikan status toko menjadi approved
                    store.status = 'approved';
                    await store.save({ transaction });

                    await transaction.commit();
                    console.log(`[AUTO-UNSUSPEND] Toko ${store.name} otomatis aktif kembali.`);
                } catch (err) {
                    await transaction.rollback();
                    console.error("Gagal menjalankan Auto-Unsuspend:", err);
                }
            }
        }

        next();
    } catch (error) {
        console.error("Error di checkAndRestoreSuspension Middleware:", error);
        next(error);
    }
};