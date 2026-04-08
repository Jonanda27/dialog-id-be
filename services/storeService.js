import db from '../models/index.js';

export const createStore = async (userId, storeData) => {
    const { name, description } = storeData;

    // 1. Validasi One-to-One: Pastikan user belum punya toko
    const existingStore = await db.Store.findOne({ where: { user_id: userId } });
    if (existingStore) {
        const error = new Error('User ini sudah memiliki toko. Satu akun hanya diperbolehkan memiliki satu toko.');
        error.statusCode = 409;
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
        status: 'pending', // Default status sesuai ERD
    });

    return newStore;
};

export const uploadKYC = async (storeId, ktpUrl) => {
    const store = await db.Store.findByPk(storeId);
    if (!store) {
        const error = new Error('Toko tidak ditemukan.');
        error.statusCode = 404;
        throw error;
    }

    // Update KTP URL
    store.ktp_url = ktpUrl;
    await store.save();

    return store;
};