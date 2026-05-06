import db from '../models/index.js';
import { Op, fn, col, literal } from 'sequelize';

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

export const getRefundList = async () => {
    return await db.Order.findAll({
        where: { 
            status: 'cancelled' // Hanya pesanan yang batal 
        },
        include: [
            {
                model: db.Escrow,
                as: 'escrow',
                where: { status: 'refunded' }, // Hanya dana yang siap di-refund 
                attributes: ['id', 'amount_held', 'status', 'updated_at']
            },
            {
                model: db.User,
                as: 'buyer',
                attributes: ['id', 'full_name', 'email'],
                include: [
                    {
                        model: db.UserBankAccount, // Model baru yang kita buat tadi
                        as: 'bankAccounts',
                        attributes: ['bank_name', 'bank_account_number', 'bank_account_name']
                    }
                ]
            },
            {
                model: db.Store,
                as: 'store',
                attributes: ['id', 'name']
            }
        ],
        order: [['updated_at', 'DESC']]
    });
};

/**
 * Mendapatkan data ringkasan untuk kartu Dashboard Admin
 */
export const getDashboardStats = async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Total GMV Bulan Ini (Berdasarkan pesanan yang sudah dibayar)
    const totalGMV = await db.Order.sum('grand_total', {
        where: {
            status: { [Op.in]: ['paid', 'processing', 'shipped', 'delivered', 'completed'] },
            created_at: { [Op.gte]: startOfMonth }
        }
    });

    // 2. Total Pengguna Aktif (Buyer & Seller)
    const totalUsers = await db.User.count({
        where: { role: { [Op.ne]: 'admin' } }
    });

    // 3. Total Toko Terdaftar
    const totalStores = await db.Store.count();

    // 4. Dispute & Resolusi (Dispute aktif/open)
    const activeDisputes = await db.Dispute.count({
        where: { status: { [Op.ne]: 'resolved' } }
    });

    // 5. Antrean Verifikasi (Toko pending)
    const pendingVerification = await db.Store.count({
        where: { status: 'pending' }
    });

    return {
        total_gmv: totalGMV || 0,
        total_users: totalUsers,
        total_stores: totalStores,
        active_disputes: activeDisputes,
        pending_verification: pendingVerification
    };
};

/**
 * Mendapatkan data analitik transaksi 7 hari terakhir untuk Chart
 */
export const getTransactionAnalytics = async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const analytics = await db.Order.findAll({
        attributes: [
            [fn('DATE', col('created_at')), 'date'],
            [fn('COUNT', col('id')), 'count'],
            [fn('SUM', col('grand_total')), 'total']
        ],
        where: {
            created_at: { [Op.gte]: sevenDaysAgo },
            status: { [Op.ne]: 'cancelled' }
        },
        group: [fn('DATE', col('created_at'))],
        order: [[fn('DATE', col('created_at')), 'ASC']]
    });

    return analytics;
};

/**
 * Mendapatkan Log Aktivitas Terbaru (Kombinasi dari berbagai tabel)
 */
export const getRecentActivities = async () => {
    // Simulasi aktivitas terbaru dari DB (Bisa dikembangkan lebih lanjut)
    const newStores = await db.Store.findAll({
        limit: 2,
        order: [['created_at', 'DESC']],
        attributes: ['name', 'created_at', 'status']
    });

    const recentDisputes = await db.Dispute.findAll({
        limit: 2,
        order: [['created_at', 'DESC']],
        include: [{ model: db.Order, as: 'order', attributes: ['id'] }]
    });

    // Mapping menjadi format log yang seragam
    const logs = [
        ...newStores.map(s => ({ type: 'STORE_REGISTRATION', message: `${s.name} menunggu verifikasi dokumen KYC.`, time: s.created_at })),
        ...recentDisputes.map(d => ({ type: 'DISPUTE_TRANSACTION', message: `Komplain pesanan baru masuk terkait alasan: ${d.reason}`, time: d.created_at }))
    ];

    return logs.sort((a, b) => b.time - a.time);
};