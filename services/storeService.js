// File: dialog-id-be/services/storeService.js
import db from '../models/index.js';

class StoreService {
    /**
     * Mendaftarkan toko baru untuk user.
     * Menggunakan validasi one-to-one dan unique constraint.
     */
    static async createStore(userId, storeData) {
        const { name, description } = storeData;

        // 1. Validasi One-to-One: Pastikan user belum punya toko
        const existingStore = await db.Store.findOne({ where: { user_id: userId } });
        if (existingStore) {
            const error = new Error('User ini sudah memiliki toko. Satu akun hanya diperbolehkan memiliki satu toko.');
            error.statusCode = 409; // Conflict
            throw error;
        }

        // 2. Validasi Unique Name: Pastikan nama toko belum dipakai orang lain
        const nameTaken = await db.Store.findOne({ where: { name } });
        if (nameTaken) {
            const error = new Error('Nama toko sudah digunakan. Silakan pilih nama lain.');
            error.statusCode = 409;
            throw error;
        }

        // 3. Buat toko dengan status pending
        const newStore = await db.Store.create({
            user_id: userId,
            name,
            description,
            status: 'pending', // Default status sesuai aturan bisnis
        });

        return newStore;
    }

    /**
     * Memperbarui dokumen KYC (KTP) toko.
     */
    static async uploadKYC(storeId, ktpUrl) {
        const store = await db.Store.findByPk(storeId);
        if (!store) {
            const error = new Error('Toko tidak ditemukan.');
            error.statusCode = 404;
            throw error;
        }

        // Konsistensi Path: Menghilangkan '/public' jika di-pass dari Multer
        store.ktp_url = ktpUrl.replace('/public', '');
        await store.save();

        return store;
    }

    /**
     * Mengambil profil toko berdasarkan ID User.
     */
    static async getStoreByUserId(userId) {
        return await db.Store.findOne({ where: { user_id: userId } });
    }

    /**
     * Mengambil saldo aktif toko beserta riwayat mutasi finansialnya.
     * Memisahkan query Balance dan Transactions demi performa baca yang optimal.
     */
    static async getStoreWallet(storeId) {
        // 1. Ambil data saldo utama secara real-time
        const store = await db.Store.findByPk(storeId, {
            attributes: ['id', 'balance']
        });

        if (!store) {
            const error = new Error('Toko tidak ditemukan.');
            error.statusCode = 404;
            throw error;
        }

        // 2. Ambil riwayat mutasi (Wallet Transactions)
        const transactions = await db.WalletTransaction.findAll({
            where: { store_id: storeId },
            order: [['created_at', 'DESC']]
        });

        return {
            balance: store.balance,
            transactions: transactions
        };
    }
}

export default StoreService;