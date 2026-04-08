import express from 'express';

// import { open } from '../controllers/disputeController.js'; 

import { authenticate, authorize } from '../middlewares/auth.js';



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

// router.post('/open', authenticate, authorize('buyer'), open);



export default router;