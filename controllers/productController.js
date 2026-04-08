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