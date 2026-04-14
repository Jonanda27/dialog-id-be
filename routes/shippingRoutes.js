import express from 'express';
import { getAreas, getShippingRates } from '../controllers/shippingController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/shipping/rates:
 *   post:
 *     summary: Kalkulasi tarif ongkos kirim secara real-time
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address_id
 *               - store_id
 *               - items
 *             properties:
 *               address_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID Alamat Tujuan (Buyer)
 *               store_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID Toko Asal (Seller)
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - name
 *                     - price
 *                     - weight
 *                     - quantity
 *                   properties:
 *                     name:
 *                       type: string
 *                     price:
 *                       type: number
 *                     weight:
 *                       type: number
 *                     quantity:
 *                       type: number
 *     responses:
 *       200:
 *         description: Berhasil mendapatkan daftar kurir dan tarif (OK)
 *       400:
 *         description: Data input tidak valid atau parameter tidak lengkap (Bad Request)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak (Forbidden)
 *       404:
 *         description: Alamat atau Toko tidak ditemukan (Not Found)
 */
router.post('/rates', requireAuth, getShippingRates);

/**
 * @swagger
 * /api/v1/shipping/areas:
 *   get:
 *     summary: Mendapatkan saran wilayah dari Biteship API
 *     tags: [Shipping]
 *     parameters:
 *       - in: query
 *         name: input
 *         required: true
 *         schema:
 *           type: string
 *         description: Kata kunci area (min 3 karakter)
 *     responses:
 *       200:
 *         description: Berhasil mendapatkan daftar wilayah (OK)
 *       400:
 *         description: Input kurang dari 3 karakter (Bad Request)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       404:
 *         description: Wilayah tidak ditemukan (Not Found)
 *       503:
 *         description: Layanan logistik Biteship sedang down
 */
router.get('/areas', getAreas);

export default router;