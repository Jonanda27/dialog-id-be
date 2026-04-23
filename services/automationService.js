import db from '../models/index.js';
// Import fungsi spesifik dari domain lain untuk di-trigger oleh sistem
import { resolveDispute } from './disputeService.js';
import { processRefundPayout } from './paymentService.js';

/**
 * Membatalkan pesanan yang belum dibayar/melewati batas waktu SLA pembayaran.
 */
export const autoCancelOrder = async (orderId) => {
    const t = await db.sequelize.transaction();

    try {
        const order = await db.Order.findByPk(orderId, {
            include: [{ model: db.OrderItem, as: 'items' }],
            transaction: t, lock: t.LOCK.UPDATE
        });

        if (!order) throw { statusCode: 404, message: 'Order tidak ditemukan' };

        // Hanya bisa membatalkan pesanan yang belum dikirim
        if (order.status !== 'pending_payment' && order.status !== 'paid') {
            throw { statusCode: 400, message: `Order dengan status ${order.status} tidak dapat dibatalkan otomatis.` };
        }

        // 1. Ubah status Order dan Escrow
        order.status = 'cancelled';
        await order.save({ transaction: t });

        const escrow = await db.Escrow.findOne({ where: { order_id: orderId }, transaction: t, lock: t.LOCK.UPDATE });
        if (escrow) {
            escrow.status = 'refunded';
            await escrow.save({ transaction: t });
        }

        // 2. Kembalikan Stok Produk (Atomik)
        for (const item of order.items) {
            const product = await db.Product.findByPk(item.product_id, { transaction: t, lock: t.LOCK.UPDATE });
            if (product) {
                await product.update({ stock: product.stock + item.qty }, { transaction: t });
            }
        }

        await t.commit();
        return { order_id: order.id, status: 'cancelled', message: 'Stok berhasil dikembalikan.' };
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

/**
 * Menghanguskan tiket grading jika pembeli tidak checkout dalam 3x24 jam.
 */
export const expireGradingRequest = async (gradingId) => {
    const t = await db.sequelize.transaction();
    try {
        const grading = await db.GradingRequest.findByPk(gradingId, { transaction: t, lock: t.LOCK.UPDATE });
        if (!grading) throw { statusCode: 404, message: 'Grading ticket tidak ditemukan' };

        if (grading.status !== 'MEDIA_READY') {
            throw { statusCode: 400, message: 'Status tidak valid untuk expire otomatis.' };
        }

        grading.status = 'EXPIRED';
        await grading.save({ transaction: t });

        await t.commit();
        return grading;
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

// =========================================================================
// ⚡ FASE LENGKAP: EKSEKUTOR OTOMATISASI DISPUTE & REFUND
// =========================================================================

/**
 * Mengeksekusi paksa penyelesaian sengketa (Case 1, 3, 4).
 * Mendelegasikan ke resolveDispute yang bertindak sebagai "Admin/Sistem Tertinggi".
 */
export const autoResolveDispute = async (disputeId, resolution, notes, refundAmount = 0) => {
    try {
        // Fungsi resolveDispute tidak memvalidasi storeId/buyerId,
        // sehingga aman dipanggil oleh Worker (Sistem).
        // Fungsi tersebut juga sudah menangani Pessimistic Lock & penciptaan RefundPayout.
        const result = await resolveDispute(disputeId, resolution, notes, refundAmount);
        return result;
    } catch (error) {
        console.error(`[AUTOMATION] Gagal memproses auto-resolve sengketa ${disputeId}:`, error);
        throw error;
    }
};

/**
 * Menyetujui pengembalian barang secara paksa (Case 2: Seller Unresponsive).
 * Bypass aturan acceptReturn di disputeService yang membutuhkan storeId.
 */
export const forceAcceptReturn = async (disputeId) => {
    const t = await db.sequelize.transaction();
    try {
        const dispute = await db.Dispute.findByPk(disputeId, { transaction: t, lock: t.LOCK.UPDATE });
        if (!dispute) throw { statusCode: 404, message: 'Dispute tidak ditemukan' };

        if (dispute.status !== 'open') {
            throw { statusCode: 400, message: 'Hanya sengketa dengan status open yang bisa di-auto-accept.' };
        }

        // Ubah status dan catat waktu absolut SLA
        dispute.status = 'returning';
        dispute.accepted_at = new Date(); // Kunci hitung mundur SLA 3 hari bagi pembeli (Case 3)
        dispute.admin_decision_notes = 'SYSTEM AUTO-ACCEPT: Penjual melewati batas waktu 2x24 jam untuk merespon komplain. Retur disetujui otomatis.';

        await dispute.save({ transaction: t });
        await t.commit();

        return dispute;
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

/**
 * Memproses ulang transfer dana ke pembeli yang sempat gagal (Case 5).
 * Mendelegasikan ke paymentService.
 */
export const retryRefundPayout = async (payoutId) => {
    try {
        // Memanggil fungsi paymentService yang memiliki instansiasi API Payment Gateway
        const result = await processRefundPayout(payoutId);
        return result;
    } catch (error) {
        console.error(`[AUTOMATION] Gagal retry pencairan dana refund ${payoutId}:`, error);
        throw error;
    }
};