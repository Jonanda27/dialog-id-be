import db from '../models/index.js';

export const openDispute = async (orderId, buyerId, reason, files) => {
    const t = await db.sequelize.transaction();

    try {
        // 1. Ambil Data Order dengan Pessimistic Lock
        const order = await db.Order.findByPk(orderId, { transaction: t, lock: t.LOCK.UPDATE });
        if (!order) throw { statusCode: 404, message: 'Pesanan tidak ditemukan.' };

        if (order.buyer_id !== buyerId) throw { statusCode: 403, message: 'Bukan pesanan Anda.' };

        if (order.status !== 'shipped' && order.status !== 'delivered') {
            throw { statusCode: 400, message: 'Dispute hanya bisa diajukan untuk pesanan yang sudah dikirim.' };
        }

        // 2. Ubah Status Order
        order.status = 'disputed';
        await order.save({ transaction: t });

        // 3. Bekukan Dana Escrow
        const escrow = await db.Escrow.findOne({ where: { order_id: orderId }, transaction: t, lock: t.LOCK.UPDATE });
        if (!escrow || escrow.status !== 'held') {
            throw { statusCode: 400, message: 'Dana Escrow tidak valid atau sudah cair.' };
        }
        escrow.status = 'frozen';
        await escrow.save({ transaction: t });

        // 4. Buat Record Dispute
        const dispute = await db.Dispute.create({
            order_id: orderId,
            buyer_id: buyerId,
            store_id: order.store_id,
            reason: reason,
            status: 'open'
        }, { transaction: t });

        // 5. Simpan Media Bukti (Jika Ada)
        if (files && files.length > 0) {
            const mediaData = files.map(file => ({
                dispute_id: dispute.id,
                uploader_id: buyerId,
                media_url: `/public/uploads/disputes/${file.filename}`
            }));
            // Asumsikan model DisputeMedia ada
            // await db.DisputeMedia.bulkCreate(mediaData, { transaction: t });
        }

        await t.commit();
        return dispute;
    } catch (error) {
        await t.rollback();
        const err = new Error(error.message || 'Gagal membuka dispute.');
        err.statusCode = error.statusCode || 500;
        throw err;
    }
};

/**
 * Resolusi sengketa oleh Admin
 * @param {string} disputeId 
 * @param {string} resolutionType - 'refund_full', 'reject_buyer', 'refund_partial'
 * @param {string} adminNotes 
 * @param {number} refundAmount - Khusus untuk refund_partial
 */
export const resolveDispute = async (disputeId, resolutionType, adminNotes, refundAmount = 0) => {
    const t = await db.sequelize.transaction();

    try {
        // 1. Pessimistic Lock pada Dispute, Order, dan Escrow
        const dispute = await db.Dispute.findByPk(disputeId, { transaction: t, lock: t.LOCK.UPDATE });
        if (!dispute) throw { statusCode: 404, message: 'Dispute tidak ditemukan.' };
        if (dispute.status === 'resolved') throw { statusCode: 400, message: 'Dispute ini sudah diselesaikan sebelumnya.' };

        const order = await db.Order.findByPk(dispute.order_id, {
            include: [{ model: db.OrderItem, as: 'items' }],
            transaction: t, lock: t.LOCK.UPDATE
        });

        const escrow = await db.Escrow.findOne({
            where: { order_id: dispute.order_id },
            transaction: t, lock: t.LOCK.UPDATE
        });

        // Update status Dispute
        dispute.status = 'resolved';
        dispute.admin_decision_notes = adminNotes;
        await dispute.save({ transaction: t });

        const subtotal = Number(order.subtotal);
        const gradingFee = Number(order.grading_fee);
        const shippingFee = Number(order.shipping_fee);
        const grandTotal = Number(order.grand_total); // subtotal + grading + shipping

        // ==========================================
        // SKENARIO A: REFUND PENUH (Buyer Menang)
        // ==========================================
        if (resolutionType === 'refund_full') {
            order.status = 'cancelled'; // Pesanan dibatalkan
            escrow.status = 'refunded';

            // Kembalikan Stok secara atomik
            for (const item of order.items) {
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

            // Catat mutasi Wallet (CREDIT)
            await db.WalletTransaction.create({
                store_id: order.store_id,
                type: 'CREDIT',
                amount: netToSeller,
                source: 'dispute_won',
                reference_id: dispute.id
            }, { transaction: t });

            // Update Saldo Toko
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

            order.status = 'completed'; // Pesanan tetap dianggap selesai (barang tidak diretur)
            escrow.status = 'released';

            // Sisa uang setelah buyer di-refund akan diberikan ke seller (dipotong admin fee)
            const remainingForSeller = grandTotal - refundAmount;
            const adminFee = remainingForSeller * 0.03; // Admin fee diambil dari sisa uang
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
        } else {
            throw { statusCode: 400, message: 'Tipe resolusi tidak dikenali.' };
        }

        await order.save({ transaction: t });
        await escrow.save({ transaction: t });

        await t.commit();
        return { dispute, order_status: order.status, resolution: resolutionType };

    } catch (error) {
        await t.rollback();
        const err = new Error(error.message || 'Gagal menyelesaikan dispute.');
        err.statusCode = error.statusCode || 500;
        throw err;
    }
};