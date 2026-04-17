import express from 'express';
import {
    createAuction,
    getAuctionsByStore,
    cancelAuction
} from '../controllers/auctionController.js';
import { authenticate, authorize, isStoreApproved } from '../middlewares/auth.js';

const router = express.Router();

// Proteksi global untuk semua rute lelang
router.use(authenticate, authorize('seller'), isStoreApproved);

/**
 * @swagger
 * /api/v1/auctions/my-store:
 *   get:
 *     summary: Mendapatkan daftar lelang milik toko sendiri (Seller Only)
 *     tags: [Auctions]
 */
// ⚡ FIX: Ganti '/store' menjadi '/my-store' agar cocok dengan Frontend
router.get('/my-store', getAuctionsByStore);

/**
 * @swagger
 * /api/v1/auctions:
 *   post:
 *     summary: Buat lelang baru
 *     tags: [Auctions]
 */
router.post('/', createAuction);

/**
 * @swagger
 * /api/v1/auctions/{id}/cancel:
 *   put:
 *     summary: Batalkan lelang
 *     tags: [Auctions]
 */
router.put('/:id/cancel', cancelAuction);

export default router;