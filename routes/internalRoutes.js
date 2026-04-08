import express from 'express';
import { triggerAutoCancel } from '../controllers/workerController.js';
import { verifyApiKey } from '../middlewares/internalAuth.js';

const router = express.Router();

// Aplikasikan proteksi API Key untuk semua rute internal
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
 *         description: Pesanan berhasil dibatalkan dan stok dikembalikan
 *       400:
 *         description: Status pesanan tidak mengizinkan pembatalan (Bad Request)
 *       401:
 *         description: X-API-Key tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak, hanya untuk layanan internal (Forbidden)
 *       404:
 *         description: ID Pesanan tidak ditemukan (Not Found)
 */
router.post('/auto-cancel/:id', triggerAutoCancel);

export default router;