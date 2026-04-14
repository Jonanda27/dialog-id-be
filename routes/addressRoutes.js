import express from 'express';
import { createAddress, getAddresses, updateAddress, deleteAddress } from '../controllers/addressController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = express.Router();

// Semua endpoint alamat mewajibkan pengguna untuk terotentikasi
router.use(requireAuth);

/**
 * @swagger
 * /api/v1/addresses:
 *   get:
 *     summary: Mendapatkan semua alamat milik user yang login
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar alamat (OK)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       404:
 *         description: Data alamat tidak ditemukan (Not Found)
 *
 *   post:
 *     summary: Menambahkan alamat baru
 *     tags: [Addresses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipient_name
 *               - phone_number
 *               - address_detail
 *               - biteship_area_id
 *             properties:
 *               label:
 *                 type: string
 *               recipient_name:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               address_detail:
 *                 type: string
 *               province:
 *                 type: string
 *               city:
 *                 type: string
 *               district:
 *                 type: string
 *               postal_code:
 *                 type: string
 *               biteship_area_id:
 *                 type: string
 *               is_primary:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Alamat berhasil dibuat (Created)
 *       400:
 *         description: Data input tidak lengkap atau tidak valid (Bad Request)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 */

/**
 * @swagger
 * /api/v1/addresses/{id}:
 *   put:
 *     summary: Memperbarui alamat yang ada
 *     tags: [Addresses]
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
 *             properties:
 *               label:
 *                 type: string
 *               recipient_name:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               address_detail:
 *                 type: string
 *               is_primary:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Alamat berhasil diperbarui (OK)
 *       400:
 *         description: Format data atau ID tidak valid (Bad Request)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Anda tidak memiliki akses ke alamat ini (Forbidden)
 *       404:
 *         description: Alamat tidak ditemukan (Not Found)
 *
 *   delete:
 *     summary: Menghapus alamat (Soft Delete)
 *     tags: [Addresses]
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
 *         description: Alamat berhasil dihapus (OK)
 *       401:
 *         description: Token tidak valid atau tidak ditemukan (Unauthorized)
 *       403:
 *         description: Anda tidak memiliki akses ke alamat ini (Forbidden)
 *       404:
 *         description: Alamat tidak ditemukan (Not Found)
 */

router.route('/')
    .get(getAddresses)
    .post(createAddress);

router.route('/:id')
    .put(updateAddress)
    .delete(deleteAddress);

export default router;