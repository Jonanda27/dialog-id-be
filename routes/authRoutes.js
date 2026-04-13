import express from 'express';
import { register, login, getMe, logout } from '../controllers/authController.js';
import { validateRequest, registerSchema, loginSchema } from '../validations/authValidation.js';
import { resolveAdminDispute } from '../controllers/disputeController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// Route: POST /api/auth/register
// Middleware 1: Validasi Zod -> Middleware 2: Controller logic
router.post('/register', validateRequest(registerSchema), register);

// Route: POST /api/auth/login
router.post('/login', validateRequest(loginSchema), login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Mendapatkan profil user yang sedang login (Current User)
 *     description: Mengembalikan data profil user berdasarkan JWT token. Jika user memiliki role seller, data tokonya otomatis disertakan.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil data profil user
 *       401:
 *         description: Akses ditolak, token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses dilarang (Forbidden)
 *       404:
 *         description: Data user tidak ditemukan di database (Not Found)
 */
router.get('/me', authenticate, getMe);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user dan mengakhiri sesi
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout berhasil dan sesi diakhiri
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses dilarang (Forbidden)
 *       404:
 *         description: Resource tidak ditemukan (Not Found)
    */
router.post('/logout', authenticate, logout);;

/**
 * @swagger
 * /api/admin/disputes/{id}/resolve:
 *   patch:
 *     summary: Menyelesaikan sengketa secara final (Admin Only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resolution_type
 *               - admin_notes
 *             properties:
 *               resolution_type:
 *                 type: string
 *                 enum: [refund_full, reject_buyer, refund_partial]
 *               admin_notes:
 *                 type: string
 *               refund_amount:
 *                 type: number
 *                 description: Wajib diisi jika resolution_type adalah refund_partial
 *     responses:
 *       200:
 *         description: Dispute berhasil diselesaikan dan dana dieksekusi
 *       400:
 *         description: Tipe resolusi atau state tidak valid (Bad Request)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak, hanya untuk Admin (Forbidden)
 *       404:
 *         description: Dispute tidak ditemukan (Not Found)
 */
router.patch('/disputes/:id/resolve', authenticate, authorize('admin'), resolveAdminDispute);

export default router;