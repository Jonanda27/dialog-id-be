import db, { sequelize } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Mendapatkan detail satu produk secara komprehensif berdasarkan ID.
 * Dipindah ke atas agar bisa dipanggil oleh fungsi lain (create/update) tanpa error hoisting.
 */
export const getProductDetails = async (productId) => {
    const product = await db.Product.findByPk(productId, {
        include: [
            {
                model: db.ProductMedia,
                as: 'media', // Ambil semua foto
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
        error.statusCode = 404;
        throw error;
    }

    return product;
};

export const createProduct = async (storeId, productData, files) => {
    const t = await sequelize.transaction();

    try {
        // 1. Buat record Produk Utama
        const product = await db.Product.create({
            store_id: storeId,
            ...productData 
        }, { transaction: t });

        // 2. Periksa apakah files ada (Multer .array() mengirim array)
        if (files && Array.isArray(files) && files.length > 0) {
            const mediaRecords = files.map((file, index) => ({
                product_id: product.id,
                // Hilangkan '/public' jika folder uploads Anda sudah di-set statis
                media_url: `/uploads/products/${file.filename}`, 
                is_primary: index === 0 // File pertama jadi foto utama
            }));

            await db.ProductMedia.bulkCreate(mediaRecords, { transaction: t });
        }

        await t.commit();

        // 3. Pastikan getProductDetails melakukan include: [ { model: ProductMedia, as: 'media' } ]
        return await getProductDetails(product.id);
    } catch (error) {
        if (t) await t.rollback();
        throw error;
    }
};

export const updateProduct = async (productId, storeId, updateData, files) => {
    // Gunakan transaksi untuk keamanan data
    const t = await sequelize.transaction();

    try {
        const product = await db.Product.findOne({
            where: { id: productId, store_id: storeId }
        });

        if (!product) {
            const error = new Error('Produk tidak ditemukan atau Anda tidak memiliki akses');
            error.statusCode = 404;
            throw error;
        }

        // 1. Update data teks/metadata
        await product.update(updateData, { transaction: t });

        // 2. Jika ada file foto baru yang diunggah
        if (files && files.length > 0) {
            // Hapus record media lama di database
            await db.ProductMedia.destroy({ 
                where: { product_id: product.id },
                transaction: t 
            });

            // Buat record media baru
            const mediaRecords = files.map((file, index) => ({
                product_id: product.id,
                // Pastikan path konsisten dengan /public/uploads
                media_url: `/uploads/products/${file.filename}`,
                is_primary: index === 0 
            }));

            await db.ProductMedia.bulkCreate(mediaRecords, { transaction: t });
        }

        await t.commit();
        
        // 3. Kembalikan detail terbaru (pastikan fungsi ini melakukan include ProductMedia)
        return await getProductDetails(productId);
    } catch (error) {
        if (t) await t.rollback();
        throw error;
    }
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
    const metadataQuery = { status: 'active', ...filters.dynamic };

    // Op.contains akan mentranslasikan kueri menjadi: metadata @> '{"status":"active", ...}'
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
                required: false // Left join, jaga-jaga kalau produk tidak punya foto
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
    // Hanya masukkan filter JSONB jika ada parameter dinamis.
    if (filters.dynamic && Object.keys(filters.dynamic).length > 0) {
        whereClause.metadata = {
            [Op.contains]: filters.dynamic
        };
    }

    const products = await db.Product.findAll({
        where: whereClause,
        include: [
            {
                model: db.ProductMedia,
                as: 'media',
                // Ambil foto utama saja untuk tampilan list
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
        const result = await db.Product.bulkCreate(products, {
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