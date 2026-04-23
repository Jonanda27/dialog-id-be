import express from 'express';
import {
    createAuction,
    getAuctionsByStore,
    cancelAuction,
    getMarketAuctions,
    getAuctionDetail
} from '../controllers/auctionController.js';
import { authenticate, authorize, isStoreApproved } from '../middlewares/auth.js';
import { uploadAuctionPhotos } from '../middlewares/upload.js';

const router = express.Router();

/* ==========================================================
 * AREA PUBLIK / PEMBELI (BUYER MARKET)
 * ========================================================== */

/**
 * @swagger
 * /api/v1/auctions/market:
 *   get:
 *     summary: Mendapatkan daftar lelang aktif dan terjadwal (Dashboard Buyer)
 *     tags: [Auctions, Market]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Nomor halaman (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Jumlah item per halaman (default 12)
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar pasar lelang (OK)
 *       400:
 *         description: Parameter query tidak valid (Bad Request)
 *       404:
 *         description: Data lelang tidak ditemukan (Not Found)
 */
router.get('/market', getMarketAuctions);

/**
 * @swagger
 * /api/v1/auctions/market/{id}:
 *   get:
 *     summary: Mengambil detail fisik barang lelang (Initial Load UI Buyer)
 *     tags: [Auctions, Market]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID Lelang
 *     responses:
 *       200:
 *         description: Berhasil mengambil detail statis lelang (OK)
 *       400:
 *         description: Format ID tidak valid (Bad Request)
 *       404:
 *         description: Data lelang tidak ditemukan (Not Found)
 */
router.get('/market/:id', getAuctionDetail);


/* ==========================================================
 * AREA PENJUAL (SELLER MANAGEMENT)
 * ========================================================== */

// Proteksi global untuk rute manajemen lelang (Seller Only & Approved Store)
router.use(authenticate, authorize('seller'), isStoreApproved);

/**
 * @swagger
 * /api/v1/auctions/my-store:
 *   get:
 *     summary: Mendapatkan daftar lelang milik toko sendiri (Seller Only)
 *     tags: [Auctions, Seller]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar lelang toko (OK)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak, hanya untuk Seller terverifikasi (Forbidden)
 *       404:
 *         description: Data lelang tidak ditemukan (Not Found)
 */
router.get('/my-store', getAuctionsByStore);

/**
 * @swagger
 * /api/v1/auctions:
 *   post:
 *     summary: Buat lelang baru dengan upload foto barang
 *     tags: [Auctions, Seller]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - item_name
 *               - condition
 *               - weight
 *               - start_time
 *               - end_time
 *               - increment
 *               - start_price
 *               - photos
 *             properties:
 *               item_name:
 *                 type: string
 *               description:
 *                 type: string
 *               condition:
 *                 type: string
 *                 enum: [NEW, USED]
 *               weight:
 *                 type: integer
 *               length:
 *                 type: integer
 *               width:
 *                 type: integer
 *               height:
 *                 type: integer
 *               start_time:
 *                 type: string
 *                 format: date-time
 *               end_time:
 *                 type: string
 *                 format: date-time
 *               increment:
 *                 type: number
 *               start_price:
 *                 type: number
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Lelang berhasil dibuat (Created)
 *       400:
 *         description: Data tidak valid atau rentang waktu lelang salah (Bad Request)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak, toko belum diverifikasi (Forbidden)
 */
router.post('/', uploadAuctionPhotos.array('photos', 5), createAuction);

/**
 * @swagger
 * /api/v1/auctions/{id}/cancel:
 *   put:
 *     summary: Batalkan lelang (Seller Only)
 *     tags: [Auctions, Seller]
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
 *         description: Lelang berhasil dibatalkan (OK)
 *       400:
 *         description: Lelang tidak bisa dibatalkan karena status tidak valid (Bad Request)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak, bukan pemilik lelang ini (Forbidden)
 *       404:
 *         description: Data lelang tidak ditemukan (Not Found)
 */
router.put('/:id/cancel', cancelAuction);

export default router;