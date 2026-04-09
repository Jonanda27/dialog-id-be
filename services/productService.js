import db from '../models/index.js';
import models, { sequelize } from '../models/index.js';

export const createProduct = async (storeId, productData, files) => {
    // 1. Memulai Database Transaction menggunakan instance sequelize langsung
    const t = await sequelize.transaction();

    try {
        // 1. Buat record Produk Utama
        const product = await db.Product.create({
            store_id: storeId,
            ...productData
        }, { transaction: t });

        // 2. Jika ada file yang diunggah, simpan ke tabel ProductMedia
        if (files && files.length > 0) {
            const mediaRecords = files.map((file, index) => ({
                product_id: product.id,
                media_url: `/public/uploads/products/${file.filename}`,
                is_primary: index === 0 // Foto pertama otomatis jadi primary
            }));

            // Bulk insert untuk performa lebih cepat
            await db.ProductMedia.bulkCreate(mediaRecords, { transaction: t });
        }

        // 3. Commit transaksi jika semua sukses
        await t.commit();

        // 4. Return produk beserta fotonya
        return await getProductDetails(product.id);
    } catch (error) {
        // Rollback jika terjadi error (data produk tidak akan tersimpan jika foto gagal)
        await t.rollback();
        throw error;
    }
};

export const getAllProducts = async (filters = {}) => {
    // Basic filtering criteria
    const whereClause = { is_active: true };
    if (filters.format) whereClause.format = filters.format;
    if (filters.grading) whereClause.grading = filters.grading;

        const products = await db.Product.findAll({
            where: whereClause,
            include: [
                {
                    model: db.ProductMedia,
                    as: 'media',
                    where: { is_primary: true }, // Hanya ambil foto primary untuk efisiensi payload
                    required: false // Left join, jaga-jaga kalau produk belum/tidak punya foto
                },
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['id', 'name'] // Hanya ambil data esensial toko
                }
            ],
            order: [['created_at', 'DESC']]
        });

        return products;
    }

    /**
     * Mengambil detail satu produk secara komprehensif berdasarkan ID.
     *
     * @param {string} productId - ID Produk (UUID)
     * @returns {Promise<Object>} Detail produk
     */
    static async getProductDetails(productId) {
        const product = await db.Product.findByPk(productId, {
            include: [
                {
                    model: db.ProductMedia,
                    as: 'media', // Ambil semua foto tanpa batasan is_primary
                },
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['id', 'name', 'description']
                }
            ]
        });

        if (!product) {
            const error = new Error('Produk tidak ditemukan di etalase.');
            // Menyematkan statusCode agar bisa ditangkap rapi oleh errorHandler.js kita di Fase A
            error.statusCode = 404;
            throw error;
        }

    return product;
};