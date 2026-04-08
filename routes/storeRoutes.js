import express from 'express';
import { registerStore } from '../controllers/storeController.js';
import { validateRequest } from '../validations/authValidation.js';
import { registerStoreSchema } from '../validations/storeValidation.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { uploadKycDocument } from '../controllers/storeController.js';
import { uploadKYC } from '../middlewares/upload.js';

const router = express.Router();

// Route: POST /api/stores/register-store
// Proteksi 1: Harus login (authenticate)
// Proteksi 2: Harus role seller (authorize)
// Proteksi 3: Validasi payload (Zod)
router.post(
    '/register-store',
    authenticate,
    authorize('seller'),
    validateRequest(registerStoreSchema),
    registerStore
);

// Route: PATCH /api/stores/upload-kyc
// Menggunakan middleware multer uploadKYC.single('ktp_file')
router.patch(
    '/upload-kyc',
    authenticate,
    authorize('seller'),
    uploadKYC.single('ktp_file'), // 'ktp_file' adalah key di form-data postman
    uploadKycDocument
);

export default router;