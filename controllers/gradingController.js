import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import * as gradingService from '../services/gradingService.js';

export const request = asyncHandler(async (req, res) => {
    const buyerId = req.user.id;
    const { product_id } = req.body;
    const result = await gradingService.requestGrading(buyerId, product_id);
    return successResponse(res, 201, 'Permintaan grading berhasil diajukan.', result);
});

export const fulfill = asyncHandler(async (req, res) => {
    const sellerId = req.user.id;
    const gradingId = req.params.id;
    // const videoUrl = req.file ? `/public/uploads/videos/${req.file.filename}` : null;
    const result = await gradingService.fulfillGrading(gradingId, sellerId, null);
    return successResponse(res, 200, 'Video grading berhasil diunggah.', result);
});