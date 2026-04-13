import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import * as orderService from '../services/orderService.js';

import ShippingService from '../services/shippingService.js';

export const calculateShipping = asyncHandler(async (req, res) => {
    const { origin, destination, weight } = req.body;

    const couriers = await ShippingService.calculateShippingCost(origin, destination, weight);

    return successResponse(
        res,
        200,
        'Berhasil mengkalkulasi opsi pengiriman.',
        couriers
    );
});

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

export const getStoreOrders = asyncHandler(async (req, res) => {
    // req.store di-inject oleh middleware isStoreApproved (Fase A)
    const storeId = req.store.id;
    const statusFilter = req.query.status;

    const result = await orderService.getStoreOrders(storeId, statusFilter);
    return successResponse(res, 200, 'Berhasil memuat daftar pesanan.', result);
});

export const ship = asyncHandler(async (req, res) => {
    const { tracking_number } = req.body;
    // PERBAIKAN: Gunakan store.id, BUKAN user.id agar sinkron dengan Service
    const storeId = req.store.id;
    const orderId = req.params.id;

    if (!tracking_number) {
        return res.status(400).json({ success: false, message: 'Resi pengiriman wajib diisi.' });
    }

    const result = await OrderService.shipOrder(orderId, storeId, tracking_number);
    return successResponse(res, 200, 'Pesanan berhasil dikirim dan resi tersimpan.', result);
});

export const complete = asyncHandler(async (req, res) => {
    const buyerId = req.user.id; // Diambil dari token
    const orderId = req.params.id;

    const result = await orderService.completeOrder(orderId, buyerId);
    return successResponse(res, 200, 'Pesanan diselesaikan. Dana Escrow telah dirilis ke dompet Seller.', result);
});

