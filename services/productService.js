import db from '../models/index.js';
import { sequelize } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Mendapatkan detail satu produk secara komprehensif berdasarkan ID.
 * Dipindah ke atas agar bisa dipanggil oleh fungsi lain (create/update)
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
        const product = await db.Product.create({
            store_id: storeId,
            ...productData
        }, { transaction: t });

        if (files && files.length > 0) {
            const mediaRecords = files.map((file, index) => ({
                product_id: product.id,
                media_url: `/public/uploads/products/${file.filename}`,
                is_primary: index === 0
            }));

            await db.ProductMedia.bulkCreate(mediaRecords, { transaction: t });
        }

        await t.commit();
        // Memanggil detail produk yang baru dibuat
        return await getProductDetails(product.id);
    } catch (error) {
        if (t) await t.rollback();
        throw error;
    }
}

export const updateProduct = async (productId, storeId, updateData, files) => {
    const product = await db.Product.findOne({
        where: { id: productId, store_id: storeId }
    });

    if (!product) {
        const error = new Error('Produk tidak ditemukan atau Anda tidak memiliki akses');
        error.statusCode = 404;
        throw error;
    }

    await product.update(updateData);

    if (files && files.length > 0) {
        await db.ProductMedia.destroy({ where: { product_id: product.id } });

        const mediaRecords = files.map((file, index) => ({
            product_id: product.id,
            media_url: `/public/uploads/products/${file.filename}`,
            is_primary: index === 0
        }));

        await db.ProductMedia.bulkCreate(mediaRecords);
    }

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

    await product.destroy();
    return true;
};

export const getAllProducts = async (filters = { standard: {}, dynamic: {} }) => {
    const whereClause = {};

    if (filters.standard.sub_category_id) {
        whereClause.sub_category_id = filters.standard.sub_category_id;
    }
    if (filters.standard.name) {
        whereClause.name = { [Op.iLike]: `%${filters.standard.name}%` };
    }
    if (filters.standard.min_price || filters.standard.max_price) {
        whereClause.price = {};
        if (filters.standard.min_price) whereClause.price[Op.gte] = filters.standard.min_price;
        if (filters.standard.max_price) whereClause.price[Op.lte] = filters.standard.max_price;
    }

    const metadataQuery = { status: 'active', ...filters.dynamic };

    whereClause.metadata = {
        [Op.contains]: metadataQuery
    };

    const products = await db.Product.findAll({
        where: whereClause,
        include: [
            {
                model: db.ProductMedia,
                as: 'media',
                where: { is_primary: true },
                required: false
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

export const getProductsByStore = async (storeId, filters = { standard: {}, dynamic: {} }) => {
    const whereClause = { store_id: storeId };

    if (filters.standard.sub_category_id) {
        whereClause.sub_category_id = filters.standard.sub_category_id;
    }
    if (filters.standard.name) {
        whereClause.name = { [Op.iLike]: `%${filters.standard.name}%` };
    }

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
            validate: true
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