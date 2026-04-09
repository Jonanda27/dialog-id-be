import db from '../models/index.js';

class ProductService {
    /**
     * Membuat produk baru beserta medianya (gambar) dalam satu transaksi atomic.
     * Jika insert gambar gagal, data produk akan dibatalkan (rollback).
     *
     * @param {string} storeId - ID Toko (didapat dari req.store.id)
     * @param {Object} productData - Data produk matang (lolos validasi Zod)
     * @param {Array} files - Array objek file hasil parsing Multer
     * @returns {Promise<Object>} Entitas produk lengkap beserta fotonya
     */
    static async createProduct(storeId, productData, files) {
        // Memulai Database Transaction
        const t = await db.sequelize.transaction();

        try {
            // 1. Buat record Produk Utama
            // Kita menggunakan spread operator (...) karena productData sudah bersih dari validasi
            const product = await db.Product.create({
                store_id: storeId,
                ...productData
            }, { transaction: t });

            // 2. Jika ada file yang diunggah, simpan ke tabel ProductMedia
            if (files && files.length > 0) {
                const mediaRecords = files.map((file, index) => ({
                    product_id: product.id,
                    // Menghilangkan '/public' agar sejalan dengan express.static('public')
                    // Path di DB menjadi: /uploads/products/nama-file.png
                    media_url: `/uploads/products/${file.filename}`,
                    is_primary: index === 0 // Foto pertama (index 0) otomatis jadi primary/thumbnail
                }));

                // Bulk insert untuk performa O(1) query yang lebih cepat
                await db.ProductMedia.bulkCreate(mediaRecords, { transaction: t });
            }

            // 3. Commit transaksi jika semua sukses
            await t.commit();

            // 4. Return produk beserta fotonya menggunakan method dari class yang sama
            return await this.getProductDetails(product.id);

        } catch (error) {
            // Rollback jika terjadi error (data produk dan gambar dibatalkan bersamaan)
            await t.rollback();
            throw error;
        }
    }

    /**
     * Mengambil semua produk dengan filter dinamis.
     * Digunakan untuk halaman katalog atau pencarian.
     *
     * @param {Object} filters - Kriteria filter (format, grading, dll)
     * @returns {Promise<Array>} Daftar produk
     */
    static async getAllProducts(filters = {}) {
        // Basic filtering criteria
        const whereClause = {};
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
    }
}

export default ProductService;