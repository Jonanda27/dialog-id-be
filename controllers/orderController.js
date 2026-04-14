import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import db from '../models/index.js'; // Diperlukan untuk mengakses entitas Store (Information Expert)

// ⚡ PERBAIKAN IMPORT: Konsistensi penamaan kapitalisasi
import * as OrderService from '../services/orderService.js';
import ShippingService from '../services/shippingService.js';

export const calculateShipping = asyncHandler(async (req, res) => {
    // ⚡ PERBAIKAN: Menyesuaikan payload untuk integrasi Biteship
    // origin, destination, weight diganti menjadi parameter spesifik berorientasi rute dan objek
    const { store_id, destination_postal_code, items } = req.body;

    // Validasi Pre-condition
    if (!store_id || !destination_postal_code || !items || !Array.isArray(items) || items.length === 0) {
        const error = new Error('Data store_id, destination_postal_code, dan array items wajib diisi.');
        error.statusCode = 400;
        throw error;
    }

    // Mengambil objek asal dari database untuk memastikan integritas lokasi (Origin Postal Code)
    const store = await db.Store.findByPk(store_id);
    if (!store) {
        const error = new Error('Toko asal tidak ditemukan di dalam sistem.');
        error.statusCode = 404;
        throw error;
    }

    if (!store.postal_code) {
        const error = new Error('Toko ini belum mengonfigurasi kode pos. Kalkulasi logistik dibatalkan.');
        error.statusCode = 400;
        throw error;
    }

    // Pendelegasian operasi ke Service Layer
    const couriers = await ShippingService.calculateShippingCost(
        store.postal_code,
        destination_postal_code,
        items
    );

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
    // mutlak harus dilakukan di dalam OrderService.createOrder() untuk menjaga High Cohesion
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

    const result = await OrderService.shipOrder(orderId, storeId, tracking_number);
    return successResponse(res, 200, 'Pesanan berhasil dikirim dan resi tersimpan.', result);
});

export const complete = asyncHandler(async (req, res) => {
    const buyerId = req.user.id; // Diambil dari token
    const orderId = req.params.id;

    // ⚡ PERBAIKAN BUG SEBELUMNYA: Mengubah 'orderService' menjadi 'OrderService' agar sesuai dengan namespace import
    const result = await OrderService.completeOrder(orderId, buyerId);
    return successResponse(res, 200, 'Pesanan diselesaikan. Dana Escrow telah dirilis ke dompet Seller.', result);
});