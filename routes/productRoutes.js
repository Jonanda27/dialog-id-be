import express from 'express';
import {
    createProduct,
    getProducts,
    getDetail,
    getMyProducts,
    bulkCreateProducts,
    updateProduct,
    deleteProduct,
    syncProducts,
    getAllProductsAdmin
} from '../controllers/productController.js';
import { authenticate, authorize, isStoreApproved } from '../middlewares/auth.js';
import { uploadProductPhotos } from '../middlewares/upload.js';

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
 *               - price
 *               - stock
 *               - sub_category_id
 *               - product_weight
 *               - product_length
 *               - product_width
 *               - product_height
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               sub_category_id:
 *                 type: string
 *                 format: uuid
 *               product_weight:
 *                 type: integer
 *               product_length:
 *                 type: integer
 *               product_width:
 *                 type: integer
 *               product_height:
 *                 type: integer
 *               metadata:
 *                 type: string
 *                 description: JSON string atribut dinamis
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Produk berhasil dibuat (Created)
 *       400:
 *         description: Validasi input gagal atau file tidak sesuai (Bad Request)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Toko belum diverifikasi atau bukan role Seller (Forbidden)
 *       404:
 *         description: Sub-kategori tidak ditemukan (Not Found)
 *
 *   get:
 *     summary: Mendapatkan semua produk aktif (Katalog Publik)
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar produk (OK)
 *       404:
 *         description: Daftar produk kosong (Not Found)
 */
router.post(
    '/',
    authenticate,
    authorize('seller'),
    isStoreApproved,
    uploadProductPhotos.array('photos', 5),
    createProduct
);

router.get('/', getProducts);

/**
 * @swagger
 * /api/products/my-products:
 *   get:
 *     summary: Seller mendapatkan daftar produk miliknya sendiri
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil produk milik seller (OK)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak, hanya untuk Seller (Forbidden)
 */
router.get(
    '/my-products',
    authenticate,
    authorize('seller'),
    isStoreApproved,
    getMyProducts
);



// Route untuk menghapus produk
router.delete('/:id', deleteProduct); 

//Route untuk seller melakukan bulk-upload
router.post('/bulk', authenticate, authorize('seller'), isStoreApproved, bulkCreateProducts);

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

/**
 * @swagger
 * /api/products/bulk:
 *   post:
 *     summary: Seller melakukan bulk-upload produk
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Bulk upload berhasil (Created)
 *       400:
 *         description: Format JSON tidak valid (Bad Request)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Toko belum disetujui (Forbidden)
 */
router.post(
    '/bulk',
    authenticate,
    authorize('seller'),
    isStoreApproved,
    bulkCreateProducts
);

/**
 * @swagger
 * /api/products/sync:
 *   post:
 *     summary: Protokol Sinkronisasi Keranjang (Auto-Healing)
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               product_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Berhasil melakukan sinkronisasi data produk (OK)
 *       400:
 *         description: ID Produk tidak valid (Bad Request)
 *       404:
 *         description: Beberapa produk tidak ditemukan (Not Found)
 */
router.post('/sync', syncProducts);

/**
 * @swagger
 * /api/products/admin/all:
 * get:
 * summary: Mendapatkan semua produk lintas toko (Admin Only)
 * tags: [Admin, Products]
 * security:
 * - bearerAuth: []
 */
router.get(
    '/admin/all', 
    authenticate, 
    authorize('admin'), 
    getAllProductsAdmin
);

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
 *         description: Detail produk ditemukan (OK)
 *       404:
 *         description: Produk tidak ditemukan (Not Found)
 *
 *   put:
 *     summary: Mengedit informasi produk (Seller Only)
 *     tags: [Products]
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
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Produk berhasil diperbarui (OK)
 *       400:
 *         description: Data tidak valid (Bad Request)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Bukan pemilik produk (Forbidden)
 *       404:
 *         description: Produk tidak ditemukan (Not Found)
 *
 *   delete:
 *     summary: Menghapus produk dari toko (Seller Only)
 *     tags: [Products]
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
 *         description: Produk berhasil dihapus (OK)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Anda tidak memiliki akses untuk menghapus produk ini (Forbidden)
 *       404:
 *         description: Produk tidak ditemukan (Not Found)
 */
router.get('/:id', getDetail);

router.put('/:id',
    authenticate,
    authorize('seller'),
    isStoreApproved,
    uploadProductPhotos.array('photos', 3),
    updateProduct
);

router.delete('/:id',
    authenticate,
    authorize('seller'),
    deleteProduct
);

export default router;