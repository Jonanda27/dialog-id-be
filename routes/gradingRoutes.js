import express from 'express';
import { request, getStoreRequests, fulfill, streamMedia } from '../controllers/gradingController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { isStoreApproved } from '../middlewares/store.js';
import { uploadVideo } from '../middlewares/upload.js';

const router = express.Router();

/**
 * @swagger
 * /api/grading/request:
 *   post:
 *     summary: Request grading video (Buyer - Fase 1)
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
 *         description: Grading berhasil direquest (Created)
 *       400:
 *         description: Batas anti-spam tercapai atau produk duplikat (Bad Request)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak, hanya untuk Buyer (Forbidden)
 *       404:
 *         description: Produk tidak ditemukan (Not Found)
 */
router.post('/request', authenticate, authorize('buyer'), request);

/**
 * @swagger
 * /api/grading/store-requests:
 *   get:
 *     summary: Mendapatkan daftar permintaan grading yang masuk ke toko penjual
 *     tags: [Grading & Dispute]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil memuat daftar permintaan grading (OK)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak, hanya untuk Seller terverifikasi (Forbidden)
 *       404:
 *         description: Data tidak ditemukan (Not Found)
 */
router.get('/store-requests', authenticate, authorize('seller'), isStoreApproved, getStoreRequests);

/**
 * @swagger
 * /api/grading/{id}/fulfill:
 *   patch:
 *     summary: Seller mengunggah video grading (Fase 2)
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
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - video
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Video grading berhasil diunggah (OK)
 *       400:
 *         description: File video tidak valid atau tidak ditemukan (Bad Request)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak, bukan pemilik toko terkait (Forbidden)
 *       404:
 *         description: Tiket grading tidak ditemukan (Not Found)
 */
router.patch('/:id/fulfill', authenticate, authorize('seller'), isStoreApproved, uploadVideo.single('video'), fulfill);

/**
 * @swagger
 * /api/grading/{id}/stream:
 *   get:
 *     summary: Endpoint proksi privat untuk memutar video grading
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
 *         description: Video Stream Output (OK)
 *       206:
 *         description: Partial Video Stream untuk fitur Seek (Partial Content)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Ditolak, user tidak terkait dengan tiket ini (Forbidden)
 *       404:
 *         description: Video atau tiket tidak ditemukan (Not Found)
 */
router.get('/:id/stream', authenticate, streamMedia);

export default router;