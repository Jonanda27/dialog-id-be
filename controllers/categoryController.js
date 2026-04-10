import models from '../models/index.js';
// ⚡ PERBAIKAN 1: Gunakan Named Import (kurung kurawal) untuk asyncHandler
import { asyncHandler } from '../utils/asyncHandler.js';
// ⚡ PERBAIKAN 2: Pastikan konsistensi dengan utils/apiResponse.js
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * @desc    Mengambil seluruh data kategori induk beserta sub-kategorinya.
 * Berguna untuk inisialisasi menu sidebar atau dropdown form di Frontend.
 * @route   GET /api/categories
 * @access  Public
 */
export const getAllCategories = asyncHandler(async (req, res) => {
    const categories = await models.Category.findAll({
        attributes: ['id', 'name', 'slug', 'icon'],
        include: [
            {
                model: models.SubCategory,
                as: 'subCategories', // Alias ini WAJIB sama dengan yang di-define di models/Category.js
                attributes: ['id', 'name', 'slug']
            }
        ],
        // Mengurutkan Kategori berdasarkan nama secara Ascending, lalu mengurutkan sub-kategori
        order: [
            ['name', 'ASC'],
            [{ model: models.SubCategory, as: 'subCategories' }, 'name', 'ASC']
        ]
    });

    // Menggunakan successResponse yang sudah di-import di atas
    return successResponse(res, 200, 'Berhasil mengambil data struktur kategori', categories);
});

/**
 * @desc    Mengambil satu kategori spesifik berdasarkan slug.
 * @route   GET /api/categories/:slug
 * @access  Public
 */
export const getCategoryBySlug = asyncHandler(async (req, res) => {
    const { slug } = req.params;

    const category = await models.Category.findOne({
        where: { slug },
        attributes: ['id', 'name', 'slug', 'icon'],
        include: [
            {
                model: models.SubCategory,
                as: 'subCategories',
                attributes: ['id', 'name', 'slug']
            }
        ]
    });

    if (!category) {
        return errorResponse(res, 404, 'Kategori tidak ditemukan');
    }

    return successResponse(res, 200, 'Berhasil mengambil detail kategori', category);
});