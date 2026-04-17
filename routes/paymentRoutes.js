import express from 'express';
import { simulateWebhook, createSession, midtransCallback, getBillingStatus, verifyPaymentManual } from '../controllers/paymentController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// Endpoint untuk mendapatkan URL Pembayaran iPaymu
router.post('/create-session', authenticate, createSession);


// POST /api/payments/callback
// Catatan: Endpoint ini tidak menggunakan middleware 'authenticate' 
// karena dipanggil oleh server iPaymu, bukan oleh user login.
router.post('/callback', midtransCallback);

/**
 * @swagger
 * /api/payments/webhook-simulation:
 *   post:
 *     summary: Simulasi Webhook dari Payment Gateway (Internal/Public)
 *     tags: [Finance & Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order_id
 *               - payment_method
 *               - payment_reference
 *             properties:
 *               order_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID Order yang akan dilunasi
 *               payment_method:
 *                 type: string
 *                 example: "BCA Virtual Account"
 *               payment_reference:
 *                 type: string
 *                 example: "PG-MDTRNS-00123"
 *     responses:
 *       200:
 *         description: Webhook berhasil diproses, pesanan lunas
 *       400:
 *         description: Pesanan tidak valid atau sudah dibayar (Bad Request)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Tidak memiliki izin untuk melakukan simulasi (Forbidden)
 *       404:
 *         description: Pesanan tidak ditemukan
 */
router.post('/webhook-simulation', simulateWebhook);

router.get('/billing/:billing_id', authenticate, getBillingStatus);
router.post('/verify/:billing_id', authenticate, verifyPaymentManual);


export default router;