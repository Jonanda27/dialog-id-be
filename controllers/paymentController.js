import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import * as paymentService from '../services/paymentService.js';

export const simulateWebhook = asyncHandler(async (req, res) => {
    const { order_id, payment_method, payment_reference } = req.body;

    const result = await paymentService.handleWebhook(order_id, {
        payment_method,
        payment_reference
    });

    return successResponse(
        res,
        200,
        'Webhook berhasil diproses, status pesanan menjadi Lunas (paid).',
        result
    );
});

export const createSession = asyncHandler(async (req, res) => {
    const { order_id } = req.body;

    if (!order_id) {
        return res.status(400).json({ success: false, message: 'Order ID wajib diisi' });
    }

    const sessionData = await paymentService.createIpaymuSession(order_id);

    return successResponse(
        res,
        201,
        'Sesi pembayaran berhasil dibuat',
        sessionData
    );
});

export const ipaymuCallback = asyncHandler(async (req, res) => {
    // iPaymu mengirim data dalam format x-www-form-urlencoded
    const callbackData = req.body;
    
    console.log("[iPaymu Callback Received]:", callbackData);

    // Kirim ke service untuk update database
    await paymentService.processCallback(callbackData);

    // WAJIB: iPaymu butuh respon teks "OK" atau JSON sukses agar tidak kirim ulang
    return res.status(200).json({ success: true, message: 'Callback Berhasil' });
});