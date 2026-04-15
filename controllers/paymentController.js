import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import db from '../models/index.js'; // Akses DB untuk pembersihan tiket otomatis
import * as paymentService from '../services/paymentService.js';

export const simulateWebhook = asyncHandler(async (req, res) => {
    const { order_id, payment_method, payment_reference } = req.body;

    // 1. Eksekusi proses pelunasan di Service Layer (Mengubah status Order menjadi PAID)
    const result = await paymentService.handleWebhook(order_id, {
        payment_method,
        payment_reference
    });

    // 2. --- LOGIKA PENYELESAIAN RACE CONDITION (STATE CLEANING) ---
    // Ambil semua produk yang ada dalam pesanan yang baru saja lunas
    const paidOrder = await db.Order.findByPk(order_id, {
        include: [{ model: db.OrderItem, as: 'items' }]
    });

    if (paidOrder && paidOrder.items) {
        // Ambil daftar ID produk yang terjual
        const purchasedProductIds = paidOrder.items.map(item => item.product_id);

        // Cari semua tiket grading (milik siapapun) yang berhubungan dengan produk ini
        // dan statusnya masih menunggu media atau sudah siap media.
        // Batalkan semuanya karena barang sudah tidak tersedia (Sold Out).
        await db.GradingRequest.update(
            {
                status: 'SYSTEM_CANCELLED',
                // (Opsi): Anda bisa menambahkan catatan di metadata jika kolom tersedia
            },
            {
                where: {
                    product_id: purchasedProductIds,
                    status: ['AWAITING_SELLER_MEDIA', 'MEDIA_READY']
                }
            }
        );

        // Catatan: Notifikasi ke pembeli lain yang tiketnya dibatalkan 
        // sebaiknya dipicu di level Service (Notification Service) agar Cohesion terjaga.
    }

    return successResponse(
        res,
        200,
        'Webhook berhasil diproses. Status pesanan menjadi Paid dan tiket grading terkait telah dibatalkan otomatis.',
        result
    );
});