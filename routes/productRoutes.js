import express from 'express';
import { createProduct, getProducts, getDetail } from '../controllers/productController.js';
import { authenticate, authorize, isStoreApproved } from '../middlewares/auth.js';
import { uploadProductPhotos } from '../middlewares/upload.js';
import { validateRequest } from '../validations/authValidation.js';
import { createProductSchema } from '../validations/productValidation.js';

const router = express.Router();

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Tambah produk baru beserta foto (Max 5 foto) - Khusus Seller Approved
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - artist
 *               - format
 *               - grading
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *               artist:
 *                 type: string
 *               format:
 *                 type: string
 *                 enum: [Vinyl, Cassette, CD, Gear]
 *               grading:
 *                 type: string
 *                 enum: [Mint, NM, VG+, VG, Good, Fair]
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               condition_notes:
 *                 type: string
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Produk berhasil dibuat
 *       403:
 *         description: Toko belum diverifikasi
 *
 *   get:
 *     summary: Mendapatkan semua produk aktif (Katalog Publik)
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *       - in: query
 *         name: grading
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar produk
 */

// Route POST: Tambah Produk
router.post(
    '/',
    authenticate,
    authorize('seller'),
    isStoreApproved,
    uploadProductPhotos.array('photos', 5),
    validateRequest(createProductSchema),
    createProduct
);

// Route GET: Ambil Semua Produk (INI YANG TADI ILANG)
router.get('/', getProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Mendapatkan detail produk beserta semua fotonya
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Detail produk ditemukan
 *       404:
 *         description: Produk tidak ditemukan
 */
router.get('/:id', getDetail);

export default router;