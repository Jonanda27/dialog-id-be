import express from 'express';
import { checkout, ship, complete, calculateShipping } from '../controllers/orderController.js';
import { checkout, getStoreOrders } from '../controllers/orderController.js';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validateRequest } from '../validations/authValidation.js';
import { checkoutSchema } from '../validations/orderValidation.js';

const router = express.Router();

/**
 * @swagger
 * /api/orders/shipping-cost:
 *   post:
 *     summary: Kalkulasi ongkos kirim (Role Buyer)
 *     description: Mengambil opsi kurir dan harga berdasarkan origin, destination, dan berat.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - origin
 *               - destination
 *               - weight
 *             properties:
 *               origin:
 *                 type: string
 *                 example: "KOTA-123"
 *               destination:
 *                 type: string
 *                 example: "KOTA-456"
 *               weight:
 *                 type: integer
 *                 description: Total berat dalam gram
 *                 example: 1500
 *     responses:
 *       200:
 *         description: Berhasil memuat opsi pengiriman
 *       400:
 *         description: Data origin, destination, atau weight tidak lengkap (Bad Request)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak, hanya untuk Buyer (Forbidden)
 *       404:
 *         description: Lokasi atau kurir tidak tersedia (Not Found)
 */
router.post('/shipping-cost', authenticate, authorize('buyer'), calculateShipping);

/**
 * @swagger
 * /api/orders/checkout:
 *   post:
 *     summary: Melakukan checkout produk (Role Buyer)
 *     description: Memproses keranjang belanja, memvalidasi stok (pessimistic lock), menerapkan biaya grading, mengurangi stok produk, dan mencatat Escrow.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - shipping_address
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product_id:
 *                       type: string
 *                       format: uuid
 *                     qty:
 *                       type: integer
 *                       example: 1
 *               shipping_address:
 *                 type: string
 *                 example: "Jl. Braga No. 10, Bandung, Jawa Barat"
 *     responses:
 *       201:
 *         description: Transaksi berhasil dibuat
 *       400:
 *         description: Stok tidak cukup atau keranjang beda toko (Bad Request)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak, hanya untuk Buyer (Forbidden)
 *       404:
 *         description: Salah satu produk tidak ditemukan (Not Found)
 */
router.post(
    '/checkout',
    authenticate,
    authorize('buyer'),
    validateRequest(checkoutSchema),
    checkout
);

/**
 * @swagger
 * /api/orders/{id}/ship:
 *   patch:
 *     summary: Seller input resi pengiriman
 *     tags: [Orders]
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
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tracking_number
 *             properties:
 *               tracking_number:
 *                 type: string
 *                 example: "RESI-JNE-999888"
 *     responses:
 *       200:
 *         description: Resi berhasil diupdate dan status menjadi shipped
 *       400:
 *         description: Status pesanan tidak valid untuk dikirim (Bad Request)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak, bukan pesanan dari toko ini (Forbidden)
 *       404:
 *         description: Pesanan tidak ditemukan (Not Found)
 */
router.patch('/:id/ship', authenticate, authorize('seller'), ship);

/**
 * @swagger
 * /api/orders/{id}/complete:
 *   post:
 *     summary: Buyer mengonfirmasi pesanan diterima (Pelepasan Dana Escrow)
 *     description: Mengubah status order menjadi completed, status escrow menjadi released, memotong admin fee 3%, dan menambah saldo ke Wallet toko.
 *     tags: [Orders]
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
 *         description: Pesanan selesai dan dana dirilis ke seller
 *       400:
 *         description: Status pesanan belum dikirim (Bad Request)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Bukan pembeli dari pesanan ini (Forbidden)
 *       404:
 *         description: Pesanan tidak ditemukan (Not Found)
 */
router.post('/:id/complete', authenticate, authorize('buyer'), complete);

/**
 * @swagger
 * /api/orders/store:
 *   get:
 *     summary: Mendapatkan daftar pesanan yang masuk ke toko (Role Seller)
 *     description: Mengambil semua pesanan milik toko yang sedang login. Mendukung filter berdasarkan status melalui query params (?status=paid).
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, paid, shipped, completed, cancelled]
 *         description: Filter berdasarkan status pesanan
 *     responses:
 *       200:
 *         description: Berhasil memuat daftar pesanan
 *       400:
 *         description: Parameter filter tidak valid (Bad Request)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak, hanya untuk Seller dengan toko yang sudah disetujui (Forbidden)
 *       404:
 *         description: Data pesanan tidak ditemukan (Not Found)
 */
router.get(
    '/store',
    authenticate,
    authorize('seller'),
    isStoreApproved,
    getStoreOrders
);

export default router;