import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import ReviewService from '../services/reviewService.js';

export const createReview = asyncHandler(async (req, res) => {
    const buyerId = req.user.id;
    const payload = req.body;
    const files = req.files; // Ambil file dari Multer

    const review = await ReviewService.createReview(buyerId, payload, files);

    return successResponse(res, 201, 'Terima kasih, ulasan berhasil dikirim.', review);
});

export const getProductReviews = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const reviews = await ReviewService.getProductReviews(productId);

    return successResponse(res, 200, 'Berhasil memuat ulasan produk.', reviews);
});

export const getStoreReviews = asyncHandler(async (req, res) => {
    const { storeId } = req.params;
    const reviews = await ReviewService.getStoreReviews(storeId);

    return successResponse(res, 200, 'Berhasil memuat ulasan toko.', reviews);
});

export const replyReview = asyncHandler(async (req, res) => {
    const storeId = req.store.id; // Dari middleware isStoreApproved
    const { id } = req.params;
    const { seller_reply } = req.body;

    const review = await ReviewService.replyToReview(storeId, id, seller_reply);

    return successResponse(res, 200, 'Balasan berhasil disimpan.', review);
});