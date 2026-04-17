import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
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

    const result = await paymentService.handleWebhookSimulation(order_id, {
        payment_method,
        payment_reference
    });

    return successResponse(
        res,
        200,
        'Simulasi berhasil, status pesanan menjadi Lunas (paid).',
        result
    );
});

// Tambahkan fungsi ini di paymentController.js
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

// ⚡ TAMBAHKAN INI: Fungsi untuk Verifikasi Manual ke Midtrans
export const verifyPaymentManual = asyncHandler(async (req, res) => {
    const { billing_id } = req.params;
    const result = await paymentService.verifyBillingStatus(billing_id);
    return successResponse(res, 200, 'Verifikasi status pembayaran berhasil', result);
});

