import express from 'express';
import { getAllCategories, getCategoryBySlug } from '../controllers/categoryController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Kumpulan endpoint untuk mengelola hierarki Kategori dan Sub-Kategori
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Mendapatkan seluruh hierarki Kategori
 *     tags: [Categories]
 *     description: Mengambil seluruh kategori utama beserta anak-anaknya (sub-kategori). Sangat berguna untuk membangun menu navigasi atau form cascading dropdown di Frontend.
 *     responses:
 *       200:
 *         description: Berhasil mengambil data struktur kategori
 *       400:
 *         description: Permintaan tidak valid (Bad Request)
 *       404:
 *         description: Resource kategori tidak ditemukan (Not Found)
 */
router.get('/', getAllCategories);

/**
 * @swagger
 * /api/categories/{slug}:
 *   get:
 *     summary: Mendapatkan kategori spesifik berdasarkan slug
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug unik dari kategori
 *     responses:
 *       200:
 *         description: Berhasil mengambil detail kategori
 *       400:
 *         description: Format slug tidak valid (Bad Request)
 *       404:
 *         description: Kategori tidak ditemukan (Not Found)
 */
router.get('/:slug', getCategoryBySlug);

export default router;