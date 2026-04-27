import express from 'express';

import { openDispute, getMyDisputes, sellerAcceptReturn, submitResi, sellerConfirmReturn } from '../controllers/disputeController.js'; 

import { authenticate, authorize, isStoreApproved } from '../middlewares/auth.js';
import { uploadMedia } from '../utils/cloudinary.js';



const router = express.Router();



/**

 * @swagger

 * /api/disputes/open:

 *   post:

 *     summary: Buka komplain pesanan / dispute (Buyer)

 *     description: Membekukan status Escrow secara atomik dan mengubah status order.

 *     tags: [Grading & Dispute]

 *     security:

 *       - bearerAuth: []

 *     requestBody:

 *       required: true

 *       content:

 *         application/json:

 *           schema:

 *             type: object

 *             required:

 *               - order_id

 *               - reason

 *             properties:

 *               order_id:

 *                 type: string

 *                 format: uuid

 *                 description: ID Order yang akan dikomplain

 *               reason:

 *                 type: string

 *                 example: "Barang tidak sesuai dengan video grading"

 *     responses:

 *       201:

 *         description: Dispute berhasil dibuka dan Escrow dibekukan

 *       400:

 *         description: Status pesanan tidak valid untuk dispute (Bad Request)

 *       401:

 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)

 *       403:

 *         description: Bukan pesanan Anda (Forbidden)

 *       404:

 *         description: Pesanan tidak ditemukan (Not Found)

 */

router.post(
    '/open', 
    authenticate, 
    authorize('buyer'), 
    // [BARU] Tambahkan middleware upload. 
    // 'files' adalah nama field di FormData, angka 5 adalah batas maksimal foto.
    uploadMedia.array('files', 5), 
    openDispute
);


// [GET] List Dispute (Buyer & Seller)
router.get('/',authenticate, getMyDisputes);

// Seller setuju barang balik
router.patch('/:id/accept-return', authenticate, authorize('seller'), isStoreApproved, sellerAcceptReturn);

// Buyer masukkan resi retur
router.patch(
    '/:id/submit-return-resi', 
    authenticate, 
    authorize('buyer'), 
    submitResi
);

router.patch('/:id/confirm-return', authenticate, authorize('seller'), isStoreApproved, sellerConfirmReturn);

export default router;