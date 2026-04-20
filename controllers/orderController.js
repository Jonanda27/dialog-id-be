import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import db from '../models/index.js';

import OrderService from '../services/orderService.js';
import * as ShippingService from '../services/shippingService.js';
import { checkoutSchema } from '../validations/orderValidation.js';

// Konstanta biaya grading per produk (Disesuaikan dengan requirement bisnis terbaru)
const GRADING_FEE_AMOUNT = 25000;

export const calculateShipping = asyncHandler(async (req, res) => {
    const { store_id, destination_postal_code, items } = req.body;

    if (!store_id || !destination_postal_code || !items || !Array.isArray(items) || items.length === 0) {
        const error = new Error('Data store_id, destination_postal_code, dan array items wajib diisi.');
        error.statusCode = 400;
        throw error;
    }

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

    const couriers = await ShippingService.calculateShippingCost(
        store.postal_code,
        destination_postal_code,
        items
    );

    return successResponse(res, 200, 'Berhasil mengkalkulasi opsi pengiriman.', couriers);
});

export const checkout = asyncHandler(async (req, res) => {
    const buyerId = req.user.id;

    // 1. Validasi payload menggunakan Zod Schema
    const validatedData = checkoutSchema.parse(req.body);

    // 2. LOGIKA DOMAIN: INJEKSI BIAYA GRADING (SERVER-SIDE)
    // Kita menelusuri array orders (multi-toko) lalu menelusuri setiap item di dalamnya.
    const processedOrders = await Promise.all(validatedData.orders.map(async (storeOrder) => {

        // Map item di dalam setiap toko
        const itemsWithGrading = await Promise.all(storeOrder.items.map(async (item) => {
            /**
             * Cari request grading terakhir untuk produk ini oleh pembeli ini.
             * Status yang dicek:
             * - MEDIA_READY: Video sudah diupload seller, tapi pembeli belum membayar fee grading.
             * - COMPLETED: Pembeli sudah pernah membayar fee grading untuk produk ini sebelumnya.
             */
            const activeGrading = await db.GradingRequest.findOne({
                where: {
                    buyer_id: buyerId,
                    product_id: item.product_id,
                    status: ['MEDIA_READY', 'COMPLETED']
                },
                order: [['created_at', 'DESC']] // Ambil yang terbaru jika ada lebih dari satu tiket
            });

            /**
             * PENENTUAN BIAYA:
             * - Jika status 'MEDIA_READY', maka ini pertama kalinya pembeli akan membayar fee tersebut.
             * - Jika status 'COMPLETED', pembeli tidak dikenakan biaya lagi (Rp 0).
             * - Jika tidak ada tiket (activeGrading null), maka fee otomatis 0.
             */
            const needsPayment = activeGrading && activeGrading.status === 'MEDIA_READY';

            return {
                ...item,
                // Berikan flag ke Service Layer apakah biaya ini perlu dimasukkan ke database
                apply_grading_fee: !!needsPayment,
                grading_fee_value: needsPayment ? GRADING_FEE_AMOUNT : 0
            };
        }));

        // Kembalikan objek storeOrder dengan array items yang sudah dimodifikasi
        return {
            ...storeOrder,
            items: itemsWithGrading
        };
    }));

    // Ganti properti orders dengan data yang sudah dihitung ulang fee grading-nya
    validatedData.orders = processedOrders;

    try {
        // 3. Eksekusi pembuatan pesanan di database melalui OrderService
        const checkoutResult = await OrderService.createOrder(buyerId, validatedData);

        return successResponse(
            res,
            201,
            'Checkout berhasil. Biaya verifikasi otomatis disesuaikan berdasarkan riwayat transaksi Anda.',
            {
                billing_id: checkoutResult.billing_id,
                grand_total: checkoutResult.grand_total,
                order_count: checkoutResult.orders?.length || 0
            }
        );
    } catch (error) {
        // Handle error khusus jika terjadi perubahan harga/stok saat proses (Race Condition)
        if (error.statusCode === 409) {
            return res.status(409).json({
                success: false,
                message: error.message,
                action: 'REFRESH_SHIPPING'
            });
        }
        throw error;
    }
});


export const getOrderById = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const orderId = req.params.id;
    const order = await OrderService.getOrderById(orderId, userId);
    return successResponse(res, 200, 'Berhasil memuat detail pesanan.', order);
});

export const getBuyerOrders = asyncHandler(async (req, res) => {
    const buyerId = req.user.id;
    const statusFilter = req.query.status;
    const result = await OrderService.getBuyerOrders(buyerId, statusFilter);
    return successResponse(res, 200, 'Berhasil memuat riwayat belanja.', result);
});

export const getStoreOrders = asyncHandler(async (req, res) => {
    const storeId = req.store.id;
    const statusFilter = req.query.status;
    const result = await OrderService.getStoreOrders(storeId, statusFilter);
    return successResponse(res, 200, 'Berhasil memuat daftar pesanan masuk.', result);
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