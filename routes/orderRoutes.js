import express from 'express';
import {
    checkout,
    ship,
    complete,
    calculateShipping,
    getStoreOrders,
    getBuyerOrders,
    getOrderById,
    getAllOrders
} from '../controllers/orderController.js';
import { authenticate, authorize, isStoreApproved } from '../middlewares/auth.js';
import { validateRequest, validateRequestOrder } from '../validations/authValidation.js';
import { checkoutSchema } from '../validations/orderValidation.js';

const router = express.Router();

/**
 * @swagger
 * /api/orders/shipping-cost:
 *   post:
 *     summary: Kalkulasi ongkos kirim real-time via Biteship (Role Buyer)
 *     description: Mengambil data tarif kurir berdasarkan kode pos toko, kode pos tujuan, dan dimensi item.
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
 *               - store_id
 *               - destination_postal_code
 *               - items
 *             properties:
 *               store_id:
 *                 type: string
 *                 format: uuid
 *               destination_postal_code:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Berhasil mengkalkulasi tarif
 *       400:
 *         description: Parameter tidak lengkap atau format salah (Bad Request)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak, hanya untuk Buyer (Forbidden)
 *       404:
 *         description: Toko tidak ditemukan (Not Found)
 */
router.post('/shipping-cost', authenticate, authorize('buyer'), calculateShipping);

/**
 * @swagger
 * /api/orders/my-orders:
 *   get:
 *     summary: Mendapatkan riwayat belanja pembeli (Role Buyer)
 *     description: Mengambil semua pesanan yang pernah dibuat oleh pembeli. Mendukung filter status.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, paid, shipped, completed, cancelled]
 *     responses:
 *       200:
 *         description: Berhasil memuat riwayat pesanan
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak, hanya untuk Buyer (Forbidden)
 *       404:
 *         description: Pesanan tidak ditemukan (Not Found)
 */
router.get('/my-orders', authenticate, authorize('buyer'), getBuyerOrders);

/**
 * @swagger
 * /api/orders/store:
 *   get:
 *     summary: Mendapatkan daftar pesanan yang masuk ke toko (Role Seller)
 *     description: Mengambil semua pesanan milik toko yang sedang login. Mendukung filter berdasarkan status.
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
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses ditolak, hanya untuk Seller dengan toko aktif (Forbidden)
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
 *         description: Produk tidak ditemukan (Not Found)
 */
router.post(
    '/checkout',
    authenticate,
    authorize('buyer'),
    validateRequestOrder(checkoutSchema),
    checkout
);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Mendapatkan detail pesanan spesifik
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
 *         description: Berhasil memuat detail pesanan
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Akses dilarang (Forbidden)
 *       404:
 *         description: Pesanan tidak ditemukan (Not Found)
 */
router.get('/:id', authenticate, getOrderById);

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
router.patch('/:id/ship', authenticate, authorize('seller'), isStoreApproved, ship);
/**
 * @swagger
 * /api/orders/admin/all:
 *   get:
 *     summary: Mengambil semua pesanan di platform (Admin Only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           description: Filter berdasarkan status pesanan
 *     responses:
 *       200:
 *         description: Berhasil mengambil semua data pesanan
 */
router.get(
    '/admin/all',
    authenticate,
    authorize('admin'),
    getAllOrders
);


/**
 * @swagger
 * /api/orders/{id}/complete:
 *   post:
 *     summary: Buyer mengonfirmasi pesanan diterima (Pelepasan Dana Escrow)
 *     description: Mengubah status order menjadi completed, status escrow menjadi released, memotong admin fee, dan menambah saldo (CREDIT) ke Wallet toko.
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

export default router;