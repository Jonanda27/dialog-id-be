import models from '../models/index.js';
import asyncHandler from '../utils/asyncHandler.js';
import apiResponse from '../utils/apiResponse.js';

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

    return apiResponse.success(res, 'Berhasil mengambil data struktur kategori', categories);
});

/**
 * @desc    Mengambil satu kategori spesifik berdasarkan slug (Opsional tapi berguna).
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
        return apiResponse.notFound(res, 'Kategori tidak ditemukan');
    }

    return apiResponse.success(res, 'Berhasil mengambil detail kategori', category);
});