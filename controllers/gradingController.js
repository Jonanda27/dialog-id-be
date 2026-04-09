// File: dialog-id-be/controllers/gradingController.js
import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import GradingService from '../services/gradingService.js';

export const request = asyncHandler(async (req, res) => {
    const buyerId = req.user.id;
    const { product_id } = req.body;

    const result = await GradingService.requestGrading(buyerId, product_id);
    return successResponse(res, 201, 'Permintaan grading berhasil diajukan.', result);
});

export const getStoreRequests = asyncHandler(async (req, res) => {
    // req.store di-inject oleh middleware isStoreApproved (Fase A)
    const storeId = req.store.id;

    const result = await GradingService.getStoreGradingRequests(storeId);
    return successResponse(res, 200, 'Berhasil memuat daftar request grading.', result);
});

export const fulfill = asyncHandler(async (req, res) => {
    const storeId = req.store.id;
    const gradingId = req.params.id;
    const file = req.file; // Diekstraksi oleh Multer middleware (misal: upload.single('video'))

    const result = await GradingService.fulfillGrading(storeId, gradingId, file);
    return successResponse(res, 200, 'Video grading berhasil diunggah dan diverifikasi.', result);
});