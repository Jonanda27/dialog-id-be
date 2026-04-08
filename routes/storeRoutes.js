import express from 'express';
import { registerStore } from '../controllers/storeController.js';
import { validateRequest } from '../validations/authValidation.js'; // Helper validasi
import { registerStoreSchema } from '../validations/storeValidation.js';
import { authenticate, authorize } from '../middlewares/auth.js';

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

export default router;