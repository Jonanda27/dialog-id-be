import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';

// ⚡ PERBAIKAN IMPORT: Konsistensi penamaan kapitalisasi
import OrderService from '../services/orderService.js';
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

    // Catatan Analis: Logika validasi total harga produk vs database 
    // mutlak harus dilakukan di dalam OrderService.createOrder()
    const order = await OrderService.createOrder(buyerId, payload);

    return successResponse(
        res,
        201,
        'Checkout berhasil. Silakan lanjutkan ke pembayaran.',
        { order_id: order.id, grand_total: order.grand_total }
    );
});

// ⚡ BARU: Endpoint untuk mengambil detail pesanan spesifik (Dibutuhkan Frontend di halaman Pembayaran)
export const getOrderById = asyncHandler(async (req, res) => {
    const userId = req.user.id; // Bisa buyer atau seller
    const orderId = req.params.id;

    // Service harus mengecek otoritas (apakah user ini pemilik order atau penjual dari order ini)
    const order = await OrderService.getOrderById(orderId, userId);

    return successResponse(res, 200, 'Berhasil memuat detail pesanan.', order);
});

// ⚡ BARU: Endpoint untuk Riwayat Belanja Buyer (GET /orders/my-orders)
export const getBuyerOrders = asyncHandler(async (req, res) => {
    const buyerId = req.user.id;
    const statusFilter = req.query.status;

    const result = await OrderService.getBuyerOrders(buyerId, statusFilter);
    return successResponse(res, 200, 'Berhasil memuat riwayat belanja.', result);
});

export const getStoreOrders = asyncHandler(async (req, res) => {
    // req.store di-inject oleh middleware isStoreApproved
    const storeId = req.store.id;
    const statusFilter = req.query.status;

    const result = await OrderService.getStoreOrders(storeId, statusFilter);
    return successResponse(res, 200, 'Berhasil memuat daftar pesanan masuk.', result);
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

    const result = await OrderService.completeOrder(orderId, buyerId);
    return successResponse(res, 200, 'Pesanan diselesaikan. Dana Escrow telah dirilis ke dompet Seller.', result);
});

// ⚡ BARU: Endpoint untuk Admin melihat seluruh transaksi di platform
export const getAllOrders = asyncHandler(async (req, res) => {
    const statusFilter = req.query.status;

    const result = await OrderService.getAllOrdersForAdmin(statusFilter);
    
    return successResponse(
        res, 
        200, 
        'Berhasil memuat seluruh daftar pesanan (Admin Access).', 
        result
    );
});