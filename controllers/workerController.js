import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import * as automationService from '../services/automationService.js';
import AuctionRedisService from '../services/auctionRedisService.js'; // ⚡ FIX: Import service Redis

/**
 * Menghandel instruksi pembatalan pesanan otomatis dari Worker
 */
export const triggerAutoCancel = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await automationService.autoCancelOrder(id);

    return successResponse(res, 200, 'Auto-cancel pesanan berhasil dieksekusi oleh Worker', result);
});

/**
 * Menghandel instruksi penghangusan tiket grading dari Worker
 * Dipicu ketika tiket sudah berumur > 3 hari tanpa ada konversi (checkout)
 */
export const expireGradingTicket = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Pendelegasian ke AutomationService untuk update status di DB
    const result = await automationService.expireGradingRequest(id);

    return successResponse(
        res,
        200,
        'Tiket grading berhasil diatur ke status EXPIRED secara otomatis.',
        result
    );
});

/**
 * @desc    Webhook untuk inisialisasi state lelang ke Redis dari Worker
 * @route   POST /api/v1/internal/worker/auctions/:id/start
 * @access  Internal (Dibatasi oleh middleware API Key)
 */
export const startAuctionState = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { start_price } = req.body; // Dikirimkan dari payload Python

    // 1. Validasi kontrak data
    if (start_price === undefined || start_price === null) {
        return errorResponse(res, 400, 'Payload start_price diperlukan untuk inisialisasi lelang.');
    }

    // 2. Delegasi ke Information Expert (Redis Service)
    await AuctionRedisService.initializeAuction(id, start_price);

    // Anda bisa menambahkan logika update status DB di sini jika tidak dilakukan di Python,
    // namun disarankan pembaruan DB tetap dilakukan oleh Worker untuk konsistensi transaksi.

    return successResponse(
        res,
        200,
        `State lelang ${id} berhasil diinisialisasi di Redis.`,
        { auctionId: id, startPrice: start_price }
    );
});