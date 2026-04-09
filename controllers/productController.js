import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import * as productService from '../services/productService.js';

export const createProduct = asyncHandler(async (req, res) => {
    // req.store di-inject oleh middleware isStoreApproved
    const storeId = req.store.id;

    // Karena multipart/form-data, payload ada di req.body, file ada di req.files
    const productData = req.body;
    const files = req.files;

    const result = await productService.createProduct(storeId, productData, files);

    return successResponse(
        res,
        201,
        'Produk berhasil ditambahkan ke katalog',
        result
    );
});

// 1. Update Produk
export const updateProduct = asyncHandler(async (req, res) => {
    const productId = req.params.id;

    // Pastikan req.store ada (disuntikkan oleh middleware isStoreApproved)
    if (!req.store || !req.store.id) {
        return res.status(401).json({
            success: false,
            message: "Identitas toko tidak ditemukan. Silakan login ulang."
        });
    }

    const storeId = req.store.id;
    const updateData = req.body;
    const files = req.files; // Jika ada upload foto baru

    // Kirim ke service
    const result = await productService.updateProduct(productId, storeId, updateData, files);

    return successResponse(res, 200, 'Produk berhasil diperbarui', result);
});

// 2. Delete Produk
export const deleteProduct = asyncHandler(async (req, res) => {
    const productId = req.params.id;
    const storeId = req.store.id;

    await productService.deleteProduct(productId, storeId);

    return successResponse(res, 200, 'Produk berhasil dihapus dari katalog');
});

export const getProducts = asyncHandler(async (req, res) => {
    // Ambil query params untuk filtering (contoh: ?format=Vinyl&grading=Mint)
    const filters = {
        format: req.query.format,
        grading: req.query.grading
    };

    const result = await productService.getAllProducts(filters);
    return successResponse(res, 200, 'Berhasil mengambil daftar produk', result);
});

export const getDetail = asyncHandler(async (req, res) => {
    const result = await productService.getProductDetails(req.params.id);
    return successResponse(res, 200, 'Berhasil mengambil detail produk', result);
});

export const getMyProducts = asyncHandler(async (req, res) => {
    const storeId = req.store.id; 
    const filters = {
        format: req.query.format,
        grading: req.query.grading
    };
    const result = await productService.getProductsByStore(storeId, filters);
    return successResponse(res, 200, 'Berhasil mengambil produk toko Anda', result);
});

export const bulkCreateProducts = asyncHandler(async (req, res) => {
    const products = req.body; // Array produk dari frontend
    const storeId = req.store.id;

    // Tambahkan store_id ke setiap objek produk
    const preparedData = products.map(p => ({
        ...p,
        store_id: storeId,
        price: Number(p.price),
        stock: Number(p.stock),
        release_year: Number(p.release_year)
    }));

    const result = await productService.bulkCreateProducts(preparedData);
    return successResponse(res, 201, `${result.length} Produk berhasil diimport`, result);
});