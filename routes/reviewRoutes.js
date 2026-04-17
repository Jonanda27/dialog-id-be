import express from 'express';
import { createReview, getProductReviews, getStoreReviews, replyReview } from '../controllers/reviewController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { isStoreApproved } from '../middlewares/store.js';
import { validateRequest } from '../validations/authValidation.js';
import { createReviewSchema, replyReviewSchema } from '../validations/reviewValidation.js';
import { uploadReviewPhotos } from '../middlewares/upload.js';

const router = express.Router();

// --- PUBLIC ROUTES (Siapapun bisa membaca ulasan) ---
router.get('/product/:productId', getProductReviews);
router.get('/store/:storeId', getStoreReviews);

// --- PROTECTED ROUTES (Hanya Role Khusus) ---

// Buyer memberi ulasan
router.post(
    '/',
    authenticate,
    authorize('buyer'),
    uploadReviewPhotos.array('photos', 3), // Maksimal 3 foto ulasan
    validateRequest(createReviewSchema),
    createReview
);

// Seller membalas ulasan
router.patch(
    '/:id/reply',
    authenticate,
    authorize('seller'),
    isStoreApproved,
    validateRequest(replyReviewSchema),
    replyReview
);

export default router;