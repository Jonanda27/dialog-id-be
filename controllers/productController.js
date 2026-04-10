import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import ProductService from '../services/productService.js';

/**
 * Mendapatkan Detail Produk (Public/PDP)
 * Digunakan untuk menampilkan informasi lengkap produk kepada Buyer
 */
export const getDetail = asyncHandler(async (req, res) => {
    const productId = req.params.id;

    // Delegasi ke Service Layer untuk pengambilan data & join tabel (Media, Store, Metadata)
    const result = await ProductService.getProductDetail(productId);

    return successResponse(
        res,
        200,
        'Berhasil mengambil detail produk',
        result
    );
});

export const createProduct = asyncHandler(async (req, res) => {
    const storeId = req.store.id;
    const productData = req.body;
    const files = req.files;

    const result = await ProductService.createProduct(storeId, productData, files);

    return successResponse(
        res,
        201,
        'Produk berhasil ditambahkan ke katalog',
        result
    );
});

export const updateProduct = asyncHandler(async (req, res) => {
    const productId = req.params.id;

    if (!req.store || !req.store.id) {
        return res.status(401).json({
            success: false,
            message: "Identitas toko tidak ditemukan. Silakan login ulang."
        });
    }

    const storeId = req.store.id;
    const updateData = req.body;
    const files = req.files;

    const result = await ProductService.updateProduct(productId, storeId, updateData, files);

    return successResponse(res, 200, 'Produk berhasil diperbarui', result);
});

export const deleteProduct = asyncHandler(async (req, res) => {
    const productId = req.params.id;
    const storeId = req.store.id;

    await ProductService.deleteProduct(productId, storeId);

    return successResponse(res, 200, 'Produk berhasil dihapus dari katalog');
});

export const getProducts = asyncHandler(async (req, res) => {
    const standardKeys = ['sub_category_id', 'name', 'min_price', 'max_price', 'page', 'limit'];

    const filters = {
        standard: {},
        dynamic: {}
    };

    for (const key in req.query) {
        if (standardKeys.includes(key)) {
            filters.standard[key] = req.query[key];
        } else {
            filters.dynamic[key] = req.query[key];
        }
    }

    const result = await ProductService.getAllProducts(filters);
    return successResponse(res, 200, 'Berhasil mengambil daftar katalog produk', result);
});

export const getMyProducts = asyncHandler(async (req, res) => {
    const storeId = req.store.id;
    const standardKeys = ['sub_category_id', 'name', 'min_price', 'max_price', 'page', 'limit'];

    const filters = {
        standard: {},
        dynamic: {}
    };

    for (const key in req.query) {
        if (standardKeys.includes(key)) {
            filters.standard[key] = req.query[key];
        } else {
            filters.dynamic[key] = req.query[key];
        }
    }

    const result = await ProductService.getProductsByStore(storeId, filters);
    return successResponse(res, 200, 'Berhasil mengambil produk toko Anda', result);
});

export const bulkCreateProducts = asyncHandler(async (req, res) => {
    const products = req.body;
    const storeId = req.store.id;

    const preparedData = products.map(p => ({
        ...p,
        store_id: storeId,
        price: Number(p.price),
        stock: Number(p.stock),
        release_year: Number(p.release_year)
    }));

    const result = await ProductService.bulkCreateProducts(preparedData);
    return successResponse(res, 201, `${result.length} Produk berhasil diimport`, result);
});