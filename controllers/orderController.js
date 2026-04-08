import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import * as orderService from '../services/orderService.js';

export const checkout = asyncHandler(async (req, res) => {
    const buyerId = req.user.id;
    const payload = req.body;

    const order = await orderService.createOrder(buyerId, payload);

    return successResponse(
        res,
        201,
        'Checkout berhasil. Silakan lanjutkan ke pembayaran.',
        { order_id: order.id, grand_total: order.grand_total }
    );
});

export const ship = asyncHandler(async (req, res) => {
    const { tracking_number } = req.body;
    const sellerId = req.user.id; // Diambil dari token
    const orderId = req.params.id;

    if (!tracking_number) {
        return res.status(400).json({ success: false, message: 'Resi pengiriman (tracking_number) wajib diisi.' });
    }

    const result = await orderService.shipOrder(orderId, sellerId, tracking_number);
    return successResponse(res, 200, 'Pesanan berhasil dikirim dan resi tersimpan.', result);
});

export const complete = asyncHandler(async (req, res) => {
    const buyerId = req.user.id; // Diambil dari token
    const orderId = req.params.id;

    const result = await orderService.completeOrder(orderId, buyerId);
    return successResponse(res, 200, 'Pesanan diselesaikan. Dana Escrow telah dirilis ke dompet Seller.', result);
});

