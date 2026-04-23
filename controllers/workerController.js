import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import * as automationService from '../services/automationService.js';
import AuctionRedisService from '../services/auctionRedisService.js';

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
    const { start_price } = req.body;

    // 1. Validasi kontrak data
    if (start_price === undefined || start_price === null) {
        return errorResponse(res, 400, 'Payload start_price diperlukan untuk inisialisasi lelang.');
    }

    // 2. Delegasi ke Information Expert (Redis Service)
    await AuctionRedisService.initializeAuction(id, start_price);

    return successResponse(
        res,
        200,
        `State lelang ${id} berhasil diinisialisasi di Redis.`,
        { auctionId: id, startPrice: start_price }
    );
});


// =========================================================================
// ⚡ FASE 3: KONTROLER INTERNAL UNTUK OTOMATISASI DISPUTE & REFUND
// =========================================================================

/**
 * Menghandel eksekusi penyelesaian sengketa otomatis dari Worker
 * Meliputi: Case 1 (Admin Inactivity), Case 3 (Buyer No-Response), Case 4 (Deadlock)
 */
export const autoResolveDispute = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { resolution, notes, refundAmount } = req.body;

    // Validasi payload dari Worker
    if (!resolution || !notes) {
        return errorResponse(res, 400, 'Payload resolution dan notes wajib disertakan oleh Worker.');
    }

    // Delegasikan ke layanan otomatisasi (Sistem bertindak sebagai "Admin Tertinggi")
    const result = await automationService.autoResolveDispute(id, resolution, notes, refundAmount);

    return successResponse(
        res,
        200,
        `Sengketa berhasil diselesaikan otomatis dengan resolusi: ${resolution}`,
        result
    );
});

/**
 * Menghandel persetujuan retur paksa
 * Meliputi: Case 2 (Seller Unresponsive - Melewati SLA 2x24 Jam)
 */
export const autoAcceptReturn = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Delegasikan persetujuan paksa ke layanan otomatisasi
    const result = await automationService.forceAcceptReturn(id);

    return successResponse(
        res,
        200,
        'Retur otomatis disetujui karena penjual melewati batas waktu SLA.',
        result
    );
});

/**
 * Menghandel retry pencairan dana ke Payment Gateway
 * Meliputi: Case 5 (Gagal Transfer Refund)
 */
export const retryRefundPayout = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Eksekusi ulang antrean payout yang gagal
    const result = await automationService.retryRefundPayout(id);

    return successResponse(
        res,
        200,
        'Percobaan ulang pencairan dana (Refund) berhasil dieksekusi.',
        result
    );
});