import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import OrderService from '../services/orderService.js'; // Perbaikan penamaan import agar sesuai dengan class export
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

    // Proses ini memicu Transaksi dan Pessimistic Lock di DB.
    // Jika stok kurang atau keduluan orang lain, OrderService akan throw error 400.
    // Error tersebut ditangkap otomatis oleh asyncHandler dan dikirim ke Frontend.
    const order = await OrderService.createOrder(buyerId, payload);

    return successResponse(
        res,
        201,
        'Checkout berhasil. Silakan lanjutkan ke pembayaran.',
        { order_id: order.id, grand_total: order.grand_total }
    );
});

export const getStoreOrders = asyncHandler(async (req, res) => {
    const storeId = req.store.id;
    const statusFilter = req.query.status;

    const result = await OrderService.getStoreOrders(storeId, statusFilter);
    return successResponse(res, 200, 'Berhasil memuat daftar pesanan.', result);
});

export const ship = asyncHandler(async (req, res) => {
    const { tracking_number } = req.body;
    const storeId = req.store.id;
    const orderId = req.params.id;

    if (!tracking_number) {
        return res.status(400).json({ success: false, message: 'Resi pengiriman wajib diisi.' });
    }

    const result = await OrderService.shipOrder(orderId, storeId, tracking_number);
    return successResponse(res, 200, 'Pesanan berhasil dikirim dan resi tersimpan.', result);
});

export const complete = asyncHandler(async (req, res) => {
    const buyerId = req.user.id;
    const orderId = req.params.id;

    const result = await OrderService.completeOrder(orderId, buyerId);
    return successResponse(res, 200, 'Pesanan diselesaikan. Dana Escrow telah dirilis ke dompet Seller.', result);
});