import express from 'express';
import { request, fulfill } from '../controllers/gradingController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/grading/request:
 *   post:
 *     summary: Request grading video (Buyer)
 *     tags: [Grading & Dispute]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product_id
 *             properties:
 *               product_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Grading berhasil direquest (Gratis)
 *       400:
 *         description: Sudah pernah request untuk produk ini (Bad Request)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak, khusus role buyer (Forbidden)
 *       404:
 *         description: Produk tidak ditemukan (Not Found)
 */
router.post('/request', authenticate, authorize('buyer'), request);

/**
 * @swagger
 * /api/grading/{id}/fulfill:
 *   patch:
 *     summary: Seller mengunggah video grading
 *     tags: [Grading & Dispute]
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
 *         description: Grading terpenuhi (Fulfilled)
 *       400:
 *         description: Data input tidak valid (Bad Request)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak, produk bukan milik seller tersebut (Forbidden)
 *       404:
 *         description: Grading request tidak ditemukan (Not Found)
 */
router.patch('/:id/fulfill', authenticate, authorize('seller'), fulfill);

export default router;