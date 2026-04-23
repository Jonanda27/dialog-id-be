import express from 'express';
import {
    triggerAutoCancel,
    expireGradingTicket,
    autoResolveDispute,
    autoAcceptReturn,
    retryRefundPayout
} from '../controllers/workerController.js';
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

/**
 * @swagger
 * /api/internal/disputes/{id}/auto-resolve:
 *   post:
 *     summary: Mengeksekusi penyelesaian sengketa otomatis (FastAPI Worker Only)
 *     description: Digunakan untuk Case 1 (Admin Inactivity), Case 3 (Buyer No-Response), dan Case 4 (Deadlock 7 Hari).
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resolution
 *               - notes
 *             properties:
 *               resolution:
 *                 type: string
 *                 example: "refund_full"
 *                 description: "Jenis resolusi: refund_full, reject_buyer, refund_partial"
 *               notes:
 *                 type: string
 *                 example: "Auto-Refund: Penjual tidak mengonfirmasi penerimaan dalam 2x24 jam."
 *     responses:
 *       200:
 *         description: Sengketa berhasil diselesaikan secara otomatis (OK)
 *       400:
 *         description: Resolusi gagal atau status tidak valid (Bad Request)
 *       401:
 *         description: API Key tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak, hanya untuk layanan internal (Forbidden)
 *       404:
 *         description: ID Sengketa tidak ditemukan (Not Found)
 */
router.post('/disputes/:id/auto-resolve', autoResolveDispute);

/**
 * @swagger
 * /api/internal/disputes/{id}/auto-accept-return:
 *   post:
 *     summary: Memaksa penjual menyetujui retur karena melewati batas SLA (FastAPI Worker Only)
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
 *         description: Retur berhasil disetujui otomatis (OK)
 *       400:
 *         description: Status sengketa tidak valid untuk retur (Bad Request)
 *       401:
 *         description: API Key tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak (Forbidden)
 *       404:
 *         description: ID Sengketa tidak ditemukan (Not Found)
 */
router.post('/disputes/:id/auto-accept-return', autoAcceptReturn);

/**
 * @swagger
 * /api/internal/refund-payouts/{id}/retry:
 *   post:
 *     summary: Melakukan retry pencairan dana ke Payment Gateway (FastAPI Worker Only)
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
 *         description: Percobaan ulang transfer berhasil diproses (OK)
 *       400:
 *         description: Data refund tidak valid untuk diproses ulang (Bad Request)
 *       401:
 *         description: API Key tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak (Forbidden)
 *       404:
 *         description: ID Refund tidak ditemukan (Not Found)
 *       500:
 *         description: API Payment Gateway masih gagal atau menolak
 */
router.post('/refund-payouts/:id/retry', retryRefundPayout);

export default router;