import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import * as automationService from '../services/automationService.js';

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