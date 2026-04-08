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
 * post:
 * summary: Tambah produk baru beserta foto (Max 5 foto) - Khusus Seller Approved
 * tags: [Products]
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * multipart/form-data:
 * schema:
 * type: object
 * required:
 * - name
 * - artist
 * - format
 * - grading
 * - price
 * properties:
 * name:
 * type: string
 * description: Judul Album / Barang
 * artist:
 * type: string
 * format:
 * type: string
 * enum: [Vinyl, Cassette, CD, Gear]
 * grading:
 * type: string
 * enum: [Mint, NM, VG+, VG, Good, Fair]
 * price:
 * type: number
 * stock:
 * type: integer
 * condition_notes:
 * type: string
 * photos:
 * type: array
 * items:
 * type: string
 * format: binary
 * description: Foto produk (Maksimal 5)
 * responses:
 * 201:
 * description: Produk berhasil dibuat
 * 403:
 * description: Toko belum diverifikasi
 */
router.post(
    '/',
    authenticate,
    authorize('seller'),
    isStoreApproved, // Bisnis Logic: Hanya toko approved yang bisa lewat
    uploadProductPhotos.array('photos', 5), // 'photos' adalah nama field, max 5
    validateRequest(createProductSchema), // Validasi (Zod otomatis mengubah string-number berkat z.preprocess)
    createProduct
);

/**
 * @swagger
 * /api/products:
 * get:
 * summary: Mendapatkan semua produk aktif (Katalog Publik)
 * tags: [Products]
 * parameters:
 * - in: query
 * name: format
 * schema:
 * type: string
 * - in: query
 * name: grading
 * schema:
 * type: string
 * responses:
 * 200:
 * description: Daftar produk
 */
router.get('/', getProducts);

/**
 * @swagger
 * /api/products/{id}:
 * get:
 * summary: Mendapatkan detail produk beserta semua fotonya
 * tags: [Products]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * responses:
 * 200:
 * description: Detail produk
 */
router.get('/:id', getDetail);

export default router;