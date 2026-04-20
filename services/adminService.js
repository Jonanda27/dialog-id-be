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

export const suspendStore = async (storeId, duration, unit, reason) => {
    const transaction = await db.sequelize.transaction();
    try {
        const store = await db.Store.findByPk(storeId, { transaction });
        if (!store) throw { statusCode: 404, message: 'Toko tidak ditemukan' };

        let suspendedUntil = new Date();
        if (unit === 'hours') {
            suspendedUntil.setHours(suspendedUntil.getHours() + duration);
        } else if (unit === 'days') {
            suspendedUntil.setDate(suspendedUntil.getDate() + duration);
        } else if (unit === 'permanent') {
            suspendedUntil = new Date('9999-12-31T23:59:59Z');
        }

        // 1. Matikan suspensi aktif sebelumnya (jika ada)
        await db.StoreSuspension.update(
            { is_active: false },
            { where: { store_id: storeId, is_active: true }, transaction }
        );

        // 2. Buat record suspensi baru
        await db.StoreSuspension.create({
            store_id: storeId,
            suspended_until: suspendedUntil,
            reason: reason,
            is_active: true
        }, { transaction });

        // 3. Update status di tabel stores tetap perlu agar query filter lebih cepat
        store.status = 'suspended';
        await store.save({ transaction });

        await transaction.commit();
        return store;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

export const unsuspendStore = async (storeId) => {
    const transaction = await db.sequelize.transaction();
    try {
        const store = await db.Store.findByPk(storeId, { transaction });
        if (!store) throw { statusCode: 404, message: 'Toko tidak ditemukan' };

        // Nonaktifkan semua record suspensi
        await db.StoreSuspension.update(
            { is_active: false },
            { where: { store_id: storeId, is_active: true }, transaction }
        );

        store.status = 'approved';
        await store.save({ transaction });

        await transaction.commit();
        return store;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};