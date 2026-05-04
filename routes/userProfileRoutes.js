import express from 'express';
import * as profileController from '../controllers/userProfileController.js';
import { authenticate } from '../middlewares/auth.js';
import { uploadMedia } from '../utils/cloudinary.js'; // Untuk upload gambar ke Cloudinary [cite: 1618]

const router = express.Router();

// Semua rute profil memerlukan login [cite: 241]
router.use(authenticate);

/**
 * GET /api/v1/profile -> Mengambil profil sendiri
 * PUT /api/v1/profile -> Mengupdate profil (mendukung upload gambar)
 */
router.get('/', profileController.getMyProfile);
router.put('/', uploadMedia.single('profile_picture'), profileController.updateProfile);

export default router;