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

// ==========================================
// 1. RUTE KHUSUS ADMIN (Dahulukan)
// ==========================================
/**
 * @swagger
 * /api/v1/products/admin/all:
 *   get:
 *     summary: Mendapatkan semua produk lintas toko (Admin Only)
 *     tags: [Admin, Products]
 *     security:
 *       - bearerAuth: []
 */
router.get('/admin/all', authenticate, authorize('admin'), getAllProductsAdmin);

// ==========================================
// 2. RUTE KHUSUS SELLER (Statis)
// ==========================================
/**
 * @swagger
 * /api/v1/products/my-store:
 *   get:
 *     summary: Seller mendapatkan daftar produk miliknya sendiri
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
// ⚡ FIX: Kita pake nama 'my-store' agar cocok dengan pemanggilan Frontend lo
router.get('/my-store', authenticate, authorize('seller'), isStoreApproved, getMyProducts);

/**
 * @swagger
 * /api/v1/products/bulk:
 *   post:
 *     summary: Seller melakukan bulk-upload produk
 *     tags: [Products]
 */
router.post('/bulk', authenticate, authorize('seller'), isStoreApproved, bulkCreateProducts);

// ==========================================
// 3. RUTE PUBLIK (Statis)
// ==========================================
/**
 * @swagger
 * /api/v1/products/sync:
 *   post:
 *     summary: Protokol Sinkronisasi Keranjang (Auto-Healing)
 *     tags: [Products]
 */
router.post('/sync', syncProducts);

router.get('/', getProducts);

/**
 * @swagger
 * /api/v1/products:
 *   post:
 *     summary: Tambah produk baru
 *     tags: [Products]
 */
router.post('/', authenticate, authorize('seller'), isStoreApproved, uploadProductPhotos.array('photos', 5), createProduct);

// ==========================================
// 4. RUTE DINAMIS / PARAMETER (TARUH PALING BAWAH!)
// ==========================================

/**
 * @swagger
 * /api/v1/products/{id}:
 *   get:
 *     summary: Detail produk
 *     tags: [Products]
 *   put:
 *     summary: Edit produk
 *     tags: [Products]
 *   delete:
 *     summary: Hapus produk
 *     tags: [Products]
 */
router.get('/:id', getDetail);

router.put('/:id', authenticate, authorize('seller'), isStoreApproved, uploadProductPhotos.array('photos', 3), updateProduct);

router.delete('/:id', authenticate, authorize('seller'), deleteProduct);

export default router;