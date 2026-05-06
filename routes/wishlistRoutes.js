import express from 'express';
import * as wishlistController from '../controllers/wishlistController.js';
import { authenticate, authorize } from '../middlewares/auth.js'; // [cite: 266, 275]

const router = express.Router();

// Semua rute wishlist wajib login sebagai buyer
router.use(authenticate, authorize('buyer'));

/**
 * @swagger
 * /api/v1/wishlist:
 * get:
 * summary: Mendapatkan daftar wishlist pembeli
 * tags: [Wishlist]
 * post:
 * summary: Menambah produk ke wishlist
 * tags: [Wishlist]
 */
router.get('/', wishlistController.getWishlist);
router.post('/', wishlistController.addWishlist);

/**
 * @swagger
 * /api/v1/wishlist/{productId}:
 * delete:
 * summary: Menghapus produk dari wishlist
 * tags: [Wishlist]
 */
router.delete('/:productId', wishlistController.removeWishlist);

export default router;