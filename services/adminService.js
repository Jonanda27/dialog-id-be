import db from '../models/index.js';

export const getPendingStores = async () => {
    // Ambil semua toko pending beserta data user (pemiliknya)
    const stores = await db.Store.findAll({
        where: { status: 'pending' },
        include: [{
            model: db.User,
            as: 'owner',
            attributes: ['id', 'email', 'full_name']
        }],
        order: [['created_at', 'ASC']]
    });
    return stores;
};

export const moderateStore = async (storeId, status, rejectReason = null) => {
    const store = await db.Store.findByPk(storeId);
    if (!store) {
        const error = new Error('Toko tidak ditemukan.');
        error.statusCode = 404;
        throw error;
    }

    // Update status toko
    store.status = status;
    // Jika database nantinya punya kolom reject_reason, kita bisa simpan di sini
    // store.reject_reason = rejectReason; 

    await store.save();
    return store;
};