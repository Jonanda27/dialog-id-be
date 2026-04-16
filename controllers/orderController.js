import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import db from '../models/index.js';

import OrderService from '../services/orderService.js';
import * as ShippingService from '../services/shippingService.js';
import { checkoutSchema } from '../validations/orderValidation.js';

const GRADING_FEE_AMOUNT = 15000; // Konstanta biaya grading per produk

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
    const validatedData = checkoutSchema.parse(req.body);

    // --- LOGIKA DOMAIN: INJEKSI BIAYA GRADING (SERVER-SIDE) ---
    // Kita melakukan map pada items untuk mengecek apakah ada tiket grading yang aktif
    const itemsWithGrading = await Promise.all(validatedData.items.map(async (item) => {
        const activeGrading = await db.GradingRequest.findOne({
            where: {
                buyer_id: buyerId,
                product_id: item.product_id,
                status: 'MEDIA_READY' // Hanya bebankan biaya jika video sudah siap ditonton
            }
        });

        return {
            ...item,
            // Jika ada tiket aktif, tandai agar Service Layer menyisipkan biaya ke OrderItem
            apply_grading_fee: !!activeGrading,
            grading_fee_value: activeGrading ? GRADING_FEE_AMOUNT : 0
        };
    }));

    // Ganti items asli dengan data yang sudah terinjeksi informasi biaya grading
    validatedData.items = itemsWithGrading;

    try {
        // OrderService sekarang menerima payload yang sudah divalidasi dengan grading_fee
        const order = await OrderService.createOrder(buyerId, validatedData);

        return successResponse(
            res,
            201,
            'Checkout berhasil. Biaya verifikasi otomatis terakumulasi jika tersedia.',
            { order_id: order.id, grand_total: order.grand_total }
        );
    } catch (error) {
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
    return successResponse(res, 200, 'Berhasil memuat daftar pesanan masuk.', result);
});

export const ship = asyncHandler(async (req, res) => {
    const { tracking_number } = req.body;
    const storeId = req.store.id;
    const orderId = req.params.id;
    const result = await OrderService.shipOrder(orderId, storeId, tracking_number);
    return successResponse(res, 200, 'Pesanan berhasil dikirim dan resi tersimpan.', result);
});

export const complete = asyncHandler(async (req, res) => {
    const buyerId = req.user.id;
    const orderId = req.params.id;
    const result = await OrderService.completeOrder(orderId, buyerId);
    return successResponse(res, 200, 'Pesanan diselesaikan. Dana Escrow telah dirilis ke dompet Seller.', result);
});