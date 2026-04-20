import express from 'express';
import { getPendingStores, updateStoreStatus, suspendStore, unsuspendStore } from '../controllers/adminController.js';
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
 *         description: Berhasil mengambil data toko pending (OK)
 *       400:
 *         description: Parameter pencarian tidak valid (Bad Request)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak, hanya untuk Admin (Forbidden)
 *       404:
 *         description: Data toko pending tidak ditemukan (Not Found)
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
 *         description: Status toko berhasil diubah (OK)
 *       400:
 *         description: Status tidak valid atau data tidak lengkap (Bad Request)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak, hanya untuk Admin (Forbidden)
 *       404:
 *         description: Toko tidak ditemukan (Not Found)
 */
router.patch('/stores/:id/status', updateStoreStatus);

/**
 * @swagger
 * /api/admin/stores/{id}/suspend:
 *   post:
 *     summary: Suspend toko dengan durasi tertentu atau selamanya (Admin Only)
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
 *               - unit
 *               - reason
 *             properties:
 *               duration:
 *                 type: integer
 *                 description: Angka durasi (abaikan jika unit permanent)
 *               unit:
 *                 type: string
 *                 enum: [hours, days, permanent]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Toko berhasil disuspend (OK)
 *       400:
 *         description: Durasi atau unit tidak valid (Bad Request)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak, hanya untuk Admin (Forbidden)
 *       404:
 *         description: Toko tidak ditemukan (Not Found)
 */
router.post('/stores/:id/suspend', suspendStore);

/**
 * @swagger
 * /api/admin/stores/{id}/unsuspend:
 *   post:
 *     summary: Mengaktifkan kembali toko yang disuspensi (Admin Only)
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
 *     responses:
 *       200:
 *         description: Toko berhasil diaktifkan kembali (OK)
 *       400:
 *         description: Toko tidak dalam status suspend (Bad Request)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak, hanya untuk Admin (Forbidden)
 *       404:
 *         description: Toko tidak ditemukan (Not Found)
 */
router.post('/stores/:id/unsuspend', unsuspendStore);

export default router;