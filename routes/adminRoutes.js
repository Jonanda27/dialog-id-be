import express from 'express';
import { getPendingStores, updateStoreStatus } from '../controllers/adminController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

// Semua rute di file ini diproteksi (Hanya Admin)
router.use(authenticate, authorize('admin'));

/**
 * @swagger
 * /api/admin/stores/pending:
 *   get:
 *     summary: Mendapatkan daftar pengajuan toko yang berstatus pending (Admin Only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil data toko pending
 *       401:
 *         description: Tidak terautentikasi
 *       403:
 *         description: Bukan Admin
 */
router.get('/stores/pending', getPendingStores);

/**
 * @swagger
 * /api/admin/stores/{id}/status:
 *   patch:
 *     summary: Mengubah status verifikasi toko (Approve/Reject) (Admin Only)
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
 *         description: UUID dari toko
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *               reject_reason:
 *                 type: string
 *                 description: Alasan penolakan (opsional)
 *     responses:
 *       200:
 *         description: Status toko berhasil diubah
 *       404:
 *         description: Toko tidak ditemukan
 */
router.patch('/stores/:id/status', updateStoreStatus);

export default router;