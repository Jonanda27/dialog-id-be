// File: dialog-id-be/routes/cartRoutes.js
import express from 'express';
import { 
    getMyCart, 
    addItem, 
    updateItemQty, 
    deleteItem, 
    clearMyCart 
} from '../controllers/cartController.js';
import { authenticate, authorize } from '../middlewares/auth.js';

const router = express.Router();

/**
 * Protokol Keamanan:
 * Semua rute di bawah ini diproteksi oleh middleware autentikasi
 * dan hanya dapat diakses oleh pengguna dengan peran 'buyer'.
 */

// Rute Utama: Mengambil isi keranjang, menambah item, dan mengosongkan seluruh keranjang
router.route('/')
    .get(authenticate, authorize('buyer'), getMyCart)
    .post(authenticate, authorize('buyer'), addItem)
    .delete(authenticate, authorize('buyer'), clearMyCart);

// Rute Spesifik Item: Memperbarui kuantitas atau menghapus item tertentu berdasarkan ID
router.route('/:id')
    .patch(authenticate, authorize('buyer'), updateItemQty)
    .delete(authenticate, authorize('buyer'), deleteItem);

export default router;