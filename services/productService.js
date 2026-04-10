import db from '../models/index.js';
import models, { sequelize } from '../models/index.js';
import { Op } from 'sequelize';


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
        // 6. Rollback jika terjadi error apa pun
        if (t) await t.rollback();
        throw error;
    }
}

export const updateProduct = async (productId, storeId, updateData, files) => {
    // 1. Tambahkan "files" di parameter atas, lalu cari produk
    const product = await db.Product.findOne({
        where: { id: productId, store_id: storeId }
    });

    if (!product) {
        const error = new Error('Produk tidak ditemukan atau Anda tidak memiliki akses');
        error.statusCode = 404;
        throw error;
    }

    // 2. Update data teks
    await product.update(updateData);

    // 3. PERBAIKAN: Jika ada file foto yang diunggah, masukkan ke database ProductMedia
    if (files && files.length > 0) {
        // Hapus foto lama agar tidak menumpuk di DB (opsional tapi disarankan)
        await db.ProductMedia.destroy({ where: { product_id: product.id } });

        // Buat record media baru
        const mediaRecords = files.map((file, index) => ({
            product_id: product.id,
            media_url: `/public/uploads/products/${file.filename}`,
            is_primary: index === 0
        }));

        await db.ProductMedia.bulkCreate(mediaRecords);
    }

    // 4. Kembalikan detail terbaru
    return await getProductDetails(productId);
};

export const deleteProduct = async (productId, storeId) => {
    const product = await db.Product.findOne({
        where: { id: productId, store_id: storeId }
    });

    if (!product) {
        const error = new Error('Produk tidak ditemukan atau Anda tidak memiliki akses');
        error.statusCode = 404;
        throw error;
    }

    // Hapus produk (Jika menggunakan paranoid: true di model, ini akan jadi soft delete)
    await product.destroy();

    return true;
};

export const getAllProducts = async (filters = { standard: {}, dynamic: {} }) => {
    const whereClause = {};

    // 1. Filter Kolom Standar
    if (filters.standard.sub_category_id) {
        whereClause.sub_category_id = filters.standard.sub_category_id;
    }
    if (filters.standard.name) {
        // Pencarian teks menggunakan iLike agar case-insensitive
        whereClause.name = { [Op.iLike]: `%${filters.standard.name}%` };
    }
    // Filter rentang harga
    if (filters.standard.min_price || filters.standard.max_price) {
        whereClause.price = {};
        if (filters.standard.min_price) whereClause.price[Op.gte] = filters.standard.min_price;
        if (filters.standard.max_price) whereClause.price[Op.lte] = filters.standard.max_price;
    }

    // 2. Filter JSONB Metadata
    // Katalog publik WAJIB hanya menampilkan produk yang berstatus 'active'
    // Status digabungkan dengan parameter dinamis lainnya dari user
    const metadataQuery = { status: 'active', ...filters.dynamic };

    // Op.contains akan mentranslasikan kueri menjadi: metadata @> '{"status":"active", "media_grading":"NM"}'
    whereClause.metadata = {
        [Op.contains]: metadataQuery
    };

    const products = await db.Product.findAll({
        where: whereClause,
        include: [
            {
                model: db.ProductMedia,
                as: 'media',
                where: { is_primary: true }, // Hanya ambil foto primary untuk katalog
                required: false // Left join
            },
            {
                model: db.Store,
                as: 'store',
                attributes: ['id', 'name']
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

export const getProductsByStore = async (storeId, filters = { standard: {}, dynamic: {} }) => {
    // Filter wajib untuk scope kepemilikan toko
    const whereClause = { store_id: storeId };

    // 1. Filter Kolom Standar
    if (filters.standard.sub_category_id) {
        whereClause.sub_category_id = filters.standard.sub_category_id;
    }
    if (filters.standard.name) {
        whereClause.name = { [Op.iLike]: `%${filters.standard.name}%` };
    }

    // 2. Filter JSONB Metadata
    // Berbeda dengan katalog publik, penjual berhak melihat produk yang draf/nonaktif.
    // Maka kita hanya menyuntikkan JSONB filter jika penjual benar-benar mengirimkan parameter dinamis.
    if (Object.keys(filters.dynamic).length > 0) {
        whereClause.metadata = {
            [Op.contains]: filters.dynamic
        };
    }

    const products = await models.Product.findAll({
        where: whereClause,
        include: [
            {
                model: models.ProductMedia,
                as: 'media',
                where: { is_primary: true },
                required: false
            }
        ],
        order: [['created_at', 'DESC']]
    });

    return products;
};

export const bulkCreateProducts = async (products) => {
    const t = await sequelize.transaction();
    try {
        const result = await models.Product.bulkCreate(products, {
            transaction: t,
            validate: true // Menjalankan validasi model untuk setiap baris
        });
        await t.commit();
        return result;
    } catch (error) {
        await t.rollback();
        throw error;
    }
};

const ProductService = {
    createProduct,
    updateProduct,
    deleteProduct,
    getAllProducts,
    getProductDetails,
    getProductsByStore,
    bulkCreateProducts
};

export default ProductService;