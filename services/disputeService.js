import db from '../models/index.js';

export const openDispute = async (orderId, buyerId, reason, files) => {
    const t = await db.sequelize.transaction();

    try {
        // 1. Ambil Data Order dengan Pessimistic Lock untuk keamanan transaksi
        const order = await db.Order.findByPk(orderId, { transaction: t, lock: t.LOCK.UPDATE });
        if (!order) throw { statusCode: 404, message: 'Pesanan tidak ditemukan.' };

        if (order.buyer_id !== buyerId) throw { statusCode: 403, message: 'Bukan pesanan Anda.' };

        // Validasi status: Dispute hanya bisa dilakukan jika barang sudah dalam perjalanan atau sampai
        if (order.status !== 'shipped' && order.status !== 'delivered') {
            throw { statusCode: 400, message: 'Dispute hanya bisa diajukan untuk pesanan yang sudah dikirim.' };
        }

        // 2. Ubah Status Order menjadi 'disputed'
        order.status = 'disputed';
        await order.save({ transaction: t });

        // 3. Bekukan Dana Escrow (Ubah status dari 'held' menjadi 'frozen')
        const escrow = await db.Escrow.findOne({ where: { order_id: orderId }, transaction: t, lock: t.LOCK.UPDATE });
        if (!escrow || escrow.status !== 'held') {
            throw { statusCode: 400, message: 'Dana Escrow tidak valid atau sudah cair.' };
        }
        escrow.status = 'frozen';
        await escrow.save({ transaction: t });

        // 4. Buat Record Dispute (Status default: 'open')
        const dispute = await db.Dispute.create({
            order_id: orderId,
            buyer_id: buyerId,
            store_id: order.store_id,
            reason: reason,
            status: 'open'
        }, { transaction: t });

        // 5. Simpan Media Bukti (Cloudinary Integration)
        if (files && files.length > 0) {
            const mediaData = files.map(file => ({
                dispute_id: dispute.id,
                uploader_id: buyerId,
                media_url: file.path
            }));

            await db.DisputeMedia.bulkCreate(mediaData, { transaction: t });
        }

        // Commit transaksi jika semua langkah berhasil
        await t.commit();
        return dispute;
    } catch (error) {
        if (t) await t.rollback();
        const err = new Error(error.message || 'Gagal membuka dispute.');
        err.statusCode = error.statusCode || 500;
        throw err;
    }
};

/**
 * Resolusi sengketa oleh Admin atau Sistem (Worker)
 * @param {string} disputeId 
 * @param {string} resolutionType - 'refund_full', 'reject_buyer', 'refund_partial'
 * @param {string} adminNotes 
 * @param {number} refundAmount - Khusus untuk refund_partial
 */
export const resolveDispute = async (disputeId, resolutionType, adminNotes, refundAmount = 0) => {
    const t = await db.sequelize.transaction();
    try {
        // 1. Ambil ID terkait terlebih dahulu tanpa LOCK
        const initialDispute = await db.Dispute.findByPk(disputeId);
        if (!initialDispute) throw { statusCode: 404, message: 'Dispute tidak ditemukan.' };
        if (initialDispute.status === 'resolved' || initialDispute.status === 'refund_failed') {
            throw { statusCode: 400, message: 'Dispute ini sudah berstatus final.' };
        }

        // 2. Lakukan Pessimistic Lock secara terpisah pada tabel utama
        const dispute = await db.Dispute.findByPk(disputeId, { transaction: t, lock: t.LOCK.UPDATE });
        const order = await db.Order.findByPk(dispute.order_id, { transaction: t, lock: t.LOCK.UPDATE });
        const escrow = await db.Escrow.findOne({
            where: { order_id: dispute.order_id },
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        // 3. Ambil data pendukung (items)
        const orderItems = await db.OrderItem.findAll({
            where: { order_id: order.id },
            transaction: t
        });

        // Update status Dispute
        dispute.status = 'resolved';
        dispute.admin_decision_notes = adminNotes;
        await dispute.save({ transaction: t });

        const subtotal = Number(order.subtotal);
        const gradingFee = Number(order.grading_fee);
        const shippingFee = Number(order.shipping_fee);
        const grandTotal = Number(order.grand_total);

        // ==========================================
        // SKENARIO A: REFUND PENUH (Buyer Menang)
        // ==========================================
        if (resolutionType === 'refund_full') {
            order.status = 'cancelled';
            escrow.status = 'refunded';

            // ⚡ PERBAIKAN FATAL: Buat antrean pencairan dana untuk Pembeli
            await db.RefundPayout.create({
                dispute_id: dispute.id,
                order_id: order.id,
                buyer_id: dispute.buyer_id,
                amount: grandTotal, // Kembalikan 100% uang pembeli
                status: 'pending',
                payout_method: 'SYSTEM_WALLET' // Bisa disesuaikan dengan alur platform Anda
            }, { transaction: t });

            // Kembalikan Stok secara atomik
            for (const item of orderItems) {
                const product = await db.Product.findByPk(item.product_id, { transaction: t, lock: t.LOCK.UPDATE });
                if (product) {
                    await product.update({ stock: product.stock + item.qty }, { transaction: t });
                }
            }
        }
        // ==========================================
        // SKENARIO B: TOLAK KOMPLAIN (Seller Menang)
        // ==========================================
        else if (resolutionType === 'reject_buyer') {
            order.status = 'completed';
            escrow.status = 'released';

            const baseAmount = subtotal + gradingFee;
            const adminFee = baseAmount * 0.03;
            const netToSeller = (baseAmount - adminFee) + shippingFee;

            await db.WalletTransaction.create({
                store_id: order.store_id,
                type: 'CREDIT',
                amount: netToSeller,
                source: 'dispute_won',
                reference_id: dispute.id
            }, { transaction: t });

            const store = await db.Store.findByPk(order.store_id, { transaction: t, lock: t.LOCK.UPDATE });
            store.balance = Number(store.balance) + netToSeller;
            await store.save({ transaction: t });
        }
        // ==========================================
        // SKENARIO C: REFUND PARSIAL (Win-Win Solution)
        // ==========================================
        else if (resolutionType === 'refund_partial') {
            if (refundAmount <= 0 || refundAmount >= grandTotal) {
                throw { statusCode: 400, message: 'Nominal refund parsial tidak valid.' };
            }

            order.status = 'completed';
            escrow.status = 'released';

            // 1. Hitung dan berikan sisa dana ke Seller
            const remainingForSeller = grandTotal - refundAmount;
            const adminFee = remainingForSeller * 0.03;
            const netToSeller = remainingForSeller - adminFee;

            await db.WalletTransaction.create({
                store_id: order.store_id,
                type: 'CREDIT',
                amount: netToSeller,
                source: 'dispute_partial',
                reference_id: dispute.id
            }, { transaction: t });

            const store = await db.Store.findByPk(order.store_id, { transaction: t, lock: t.LOCK.UPDATE });
            store.balance = Number(store.balance) + netToSeller;
            await store.save({ transaction: t });

            // 2. ⚡ PERBAIKAN FATAL: Buat antrean pencairan dana parsial untuk Pembeli
            await db.RefundPayout.create({
                dispute_id: dispute.id,
                order_id: order.id,
                buyer_id: dispute.buyer_id,
                amount: refundAmount,
                status: 'pending',
                payout_method: 'SYSTEM_WALLET'
            }, { transaction: t });
        } else {
            throw { statusCode: 400, message: 'Tipe resolusi tidak dikenali.' };
        }

        await order.save({ transaction: t });
        await escrow.save({ transaction: t });

        await t.commit();
        return { dispute, order_status: order.status, resolution: resolutionType };

    } catch (error) {
        if (t) await t.rollback();
        const err = new Error(error.message || 'Gagal menyelesaikan dispute.');
        err.statusCode = error.statusCode || 500;
        throw err;
    }
};

export const getMyDisputes = async (userId, role) => {
    const whereCondition = role === 'seller'
        ? { store_id: (await db.Store.findOne({ where: { user_id: userId } }))?.id }
        : { buyer_id: userId };

    return await db.Dispute.findAll({
        where: whereCondition,
        attributes: [
            'id', 'order_id', 'buyer_id', 'store_id', 'reason',
            'status', 'return_tracking_number', 'admin_decision_notes',
            // Ambil kolom SLA
            'accepted_at', 'resi_submitted_at', 'arrived_at', 'mediation_start_at',
            'created_at', 'updated_at'
        ],
        include: [
            { model: db.Order, as: 'order' },
            { model: db.DisputeMedia, as: 'media' },
            {
                model: db.User,
                as: 'buyer',
                attributes: ['id', 'full_name', 'email']
            }
        ],
        order: [['created_at', 'DESC']]
    });
};

export const acceptReturn = async (disputeId, storeId) => {
    const dispute = await db.Dispute.findByPk(disputeId);
    if (!dispute || dispute.store_id !== storeId) {
        throw { statusCode: 403, message: 'Akses ditolak.' };
    }

    // ⚡ PERBAIKAN SLA: Catat waktu persetujuan
    dispute.status = 'returning';
    dispute.accepted_at = new Date(); // <-- Kunci untuk Cronjob "Buyer No-Response"

    await dispute.save();
    return dispute;
};

export const submitReturnResi = async (disputeId, buyerId, trackingNumber) => {
    const dispute = await db.Dispute.findByPk(disputeId);

    if (!dispute) {
        throw { statusCode: 404, message: 'Data sengketa tidak ditemukan.' };
    }
    if (dispute.buyer_id !== buyerId) {
        throw { statusCode: 403, message: 'Akses ditolak. Ini bukan komplain Anda.' };
    }

    // ⚡ PERBAIKAN SLA: Catat resi dan waktunya
    dispute.return_tracking_number = trackingNumber;
    dispute.status = 'returning';
    dispute.resi_submitted_at = new Date(); // <-- Menandakan pembeli mematuhi SLA 3 hari

    await dispute.save();
    return dispute;
};

export const confirmReturnReceived = async (disputeId, storeId) => {
    const dispute = await db.Dispute.findByPk(disputeId);

    if (!dispute || dispute.store_id !== storeId) {
        throw { statusCode: 403, message: 'Akses ditolak atau sengketa tidak ditemukan.' };
    }

    if (dispute.status !== 'returning' && dispute.status !== 'arrived_at_seller') {
        throw { statusCode: 400, message: 'Status sengketa tidak valid untuk konfirmasi penerimaan.' };
    }

    // Gunakan fungsi resolveDispute yang sudah ada untuk skenario REFUND PENUH
    // Ini otomatis membatalkan order, membuat RefundPayout, dan kembalikan stok.
    return await resolveDispute(
        disputeId,
        'refund_full',
        'Barang retur telah diterima dan dikonfirmasi manual oleh penjual. Refund disetujui otomatis.'
    );
};