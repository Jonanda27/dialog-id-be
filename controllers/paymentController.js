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