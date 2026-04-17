import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import db from '../models/index.js'; // Akses DB untuk pembersihan tiket otomatis
import * as paymentService from '../services/paymentService.js';

export const createSession = asyncHandler(async (req, res) => {
    const { billing_id } = req.body; // Sekarang menggunakan Billing ID

    if (!billing_id) {
        return res.status(400).json({ success: false, message: 'Billing ID wajib diisi' });
    }

    const sessionData = await paymentService.createMidtransSession(billing_id);

    return successResponse(
        res,
        201,
        'Sesi pembayaran Midtrans berhasil dibuat',
        sessionData
    );
});

export const midtransCallback = asyncHandler(async (req, res) => {
    const notificationData = req.body;

    console.log("[Midtrans Webhook Received]:", notificationData.order_id);

    await paymentService.handleMidtransNotification(notificationData);

    return res.status(200).json({ status: 'OK' });
});

export const simulateWebhook = asyncHandler(async (req, res) => {
    const { order_id, payment_method, payment_reference } = req.body;

    // 1. Eksekusi proses pelunasan di Service Layer (Penamaan dari branch Incoming)
    const result = await paymentService.handleWebhookSimulation(order_id, {
        payment_method,
        payment_reference
    });

    // 2. --- LOGIKA PENYELESAIAN RACE CONDITION (STATE CLEANING DARI HEAD) ---
    // Ambil semua produk yang ada dalam pesanan yang baru saja lunas
    const paidOrder = await db.Order.findByPk(order_id, {
        include: [{ model: db.OrderItem, as: 'items' }]
    });

    if (paidOrder && paidOrder.items) {
        // Ambil daftar ID produk yang terjual
        const purchasedProductIds = paidOrder.items.map(item => item.product_id);

        // Cari semua tiket grading (milik siapapun) yang berhubungan dengan produk ini
        // dan statusnya masih menunggu media atau sudah siap media.
        // Batalkan semuanya karena barang sudah tidak tersedia (Sold Out).
        await db.GradingRequest.update(
            {
                status: 'SYSTEM_CANCELLED',
                // (Opsi): Anda bisa menambahkan catatan di metadata jika kolom tersedia
            },
            {
                where: {
                    product_id: purchasedProductIds,
                    status: ['AWAITING_SELLER_MEDIA', 'MEDIA_READY']
                }
            }
        );

        // Catatan: Notifikasi ke pembeli lain yang tiketnya dibatalkan 
        // sebaiknya dipicu di level Service (Notification Service) agar Cohesion terjaga.
    }

    return successResponse(
        res,
        200,
        'Simulasi berhasil, status pesanan menjadi Lunas (paid) dan tiket grading terkait telah dibatalkan otomatis.',
        result
    );
});

// Endpoint untuk mengambil status billing
export const getBillingStatus = asyncHandler(async (req, res) => {
    const { billing_id } = req.params;

    const result = await paymentService.getBillingDetail(billing_id);

    return successResponse(
        res,
        200,
        'Detail status billing berhasil diambil',
        result
    );
});

/**
 * Note Analis: Fungsi ini secara struktural adalah fungsi Service Layer, 
 * bukan Controller (tidak menerima req, res). 
 * Disarankan untuk memindahkannya ke services/paymentService.js di refactor selanjutnya.
 */
export const getBillingDetail = async (billingId) => {
    const billing = await db.Billing.findByPk(billingId, {
        include: [
            {
                model: db.Order,
                as: 'orders',
                include: [
                    {
                        model: db.OrderItem,
                        as: 'items',
                        include: [{ model: db.Product, as: 'product', attributes: ['name', 'price'] }]
                    }
                ]
            }
        ]
    });

    if (!billing) {
        throw { statusCode: 404, message: 'Data billing tidak ditemukan' };
    }

    // Format output agar sesuai dengan interface PaymentResult di FE
    return {
        billing: billing,
        orders: billing.orders,
        payment_status: billing.status === 'paid' ? 'success' :
            billing.status === 'cancelled' ? 'failure' :
                billing.status === 'expired' ? 'expired' : 'pending'
    };
};

// ⚡ Endpoint untuk Verifikasi Manual ke Midtrans
export const verifyPaymentManual = asyncHandler(async (req, res) => {
    const { billing_id } = req.params;
    const result = await paymentService.verifyBillingStatus(billing_id);
    return successResponse(res, 200, 'Verifikasi status pembayaran berhasil', result);
});