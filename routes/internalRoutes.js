import express from 'express';
import { triggerAutoCancel, expireGradingTicket } from '../controllers/workerController.js';
import { verifyApiKey } from '../middlewares/internalAuth.js';

const router = express.Router();

// Aplikasikan proteksi API Key untuk semua rute internal (Service-to-Service)
router.use(verifyApiKey);

/**
 * @swagger
 * /api/internal/auto-cancel/{id}:
 *   post:
 *     summary: Mengeksekusi pembatalan pesanan dan pengembalian stok (FastAPI Worker Only)
 *     tags: [Internal Worker]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Pesanan berhasil dibatalkan (OK)
 *       400:
 *         description: Status pesanan tidak valid untuk pembatalan (Bad Request)
 *       401:
 *         description: API Key tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak, hanya untuk layanan internal (Forbidden)
 *       404:
 *         description: ID Pesanan tidak ditemukan (Not Found)
 */
router.post('/auto-cancel/:id', triggerAutoCancel);

/**
 * @swagger
 * /api/internal/grading/{id}/expire:
 *   post:
 *     summary: Menghanguskan tiket grading yang tidak di-checkout dalam 3 hari (FastAPI Worker Only)
 *     tags: [Internal Worker]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Status tiket grading berhasil diubah menjadi EXPIRED (OK)
 *       400:
 *         description: Status tiket tidak valid untuk dihanguskan (Bad Request)
 *       401:
 *         description: API Key tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak, hanya untuk layanan internal (Forbidden)
 *       404:
 *         description: ID Tiket tidak ditemukan (Not Found)
 */
router.post('/grading/:id/expire', expireGradingTicket);

export default router;