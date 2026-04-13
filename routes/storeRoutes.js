import express from 'express';
import { 
    registerStore, 
    uploadKycDocument, 
    getWallet,
    getMyStore,
    updateStore,
    getAllStores
} from '../controllers/storeController.js';
import { validateRequest } from '../validations/authValidation.js';
import { registerStoreSchema } from '../validations/storeValidation.js';
import { authenticate, authorize,  } from '../middlewares/auth.js';
import { isStoreApproved } from '../middlewares/store.js'; // Pastikan middleware ini ada
import { uploadKYC, uploadStoreMedia } from '../middlewares/upload.js';

const router = express.Router();

// Route: POST /api/stores/register-store
router.post(
    '/register-store',
    authenticate,
    authorize('seller'),
    validateRequest(registerStoreSchema),
    registerStore
);

// Route: PATCH /api/stores/upload-kyc
router.patch(
    '/upload-kyc',
    authenticate,
    authorize('seller'),
    uploadKYC.single('ktp_file'),
    uploadKycDocument
);

router.get(
    '/my-store',
    authenticate, // Pastikan user login
    getMyStore
);

router.put('/update', 
    authenticate, 
    uploadStoreMedia.fields([
        { name: 'banner_file', maxCount: 1 },
        { name: 'logo_file', maxCount: 1 }
    ]), 
    updateStore
);

/**
 * @desc    Get All Stores (Eksplorasi Toko)
 * @route   GET /api/stores
 * @access  Public
 * @note    Diletakkan di paling atas agar tidak bentrok dengan route spesifik
 */
router.get('/', getAllStores);

/**
 * Route: GET /api/stores/wallet
 * Deskripsi: Mengambil saldo dan riwayat transaksi toko
 * Proteksi: 
 * 1. Login required
 * 2. Role seller only
 * 3. Hanya toko yang sudah di-approve (untuk mendapatkan req.store)
 */
router.get(
    '/wallet',
    authenticate,
    authorize('seller'),
    isStoreApproved, // Middleware ini krusial untuk menginjeksi data store ke request
    getWallet
);

export default router;