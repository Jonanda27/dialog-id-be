import db from '../models/index.js';
import models, { sequelize } from '../models/index.js';

export const createProduct = async (storeId, productData, files) => {
    // 1. Memulai Database Transaction menggunakan instance sequelize langsung
    const t = await sequelize.transaction();

    try {
        // 2. Buat record Produk Utama
        // Gunakan models.Product (sesuai export default di index.js)
        const product = await models.Product.create({
            store_id: storeId,
            ...productData // name, artist, price, stock, dll
        }, { transaction: t });

        // 3. Jika ada file yang diunggah, simpan ke tabel ProductMedia
        if (files && files.length > 0) {
            const mediaRecords = files.map((file, index) => ({
                product_id: product.id,
                media_url: `/public/uploads/products/${file.filename}`,
                is_primary: index === 0 // Foto pertama otomatis jadi primary
            }));

            // Bulk insert ke ProductMedia
            await models.ProductMedia.bulkCreate(mediaRecords, { transaction: t });
        }

        // 4. Commit transaksi jika semua proses di atas berhasil
        await t.commit();

        // 5. Return produk beserta fotonya (memanggil fungsi detail)
        return await getProductDetails(product.id);
    } catch (error) {
        // 6. Rollback jika terjadi error apa pun
        if (t) await t.rollback();
        throw error;
    }
};

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
        const error = new Error('Produk tidak ditemukan');
        error.statusCode = 404;
        throw error;
    }

    return product;
};

export const getProductsByStore = async (storeId, filters = {}) => {
    // Di sini kita memfilter berdasarkan storeId si seller
    const whereClause = { 
        store_id: storeId,
        // Kita tidak pakai is_active: true agar seller bisa lihat produk yang di-hide/nonaktif juga
    };

    if (filters.format) whereClause.format = filters.format;
    if (filters.grading) whereClause.grading = filters.grading;

    const products = await models.Product.findAll({
        where: whereClause,
        include: [
            {
                model: models.ProductMedia,
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