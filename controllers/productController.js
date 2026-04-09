import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import * as productService from '../services/productService.js';

export const createProduct = asyncHandler(async (req, res) => {
    // 1. Ekstraksi Context: req.store di-inject secara aman oleh middleware Fase A
    const storeId = req.store.id;

    // 2. Ekstraksi Payload: multipart/form-data memisahkan teks dan biner
    // Analisis Tipe Data: property price, stock, dan release_year di dalam req.body 
    // akan terdeteksi sebagai tipe 'string'. Pastikan DTO/Validator (seperti Zod/Joi) 
    // melakukan casting ke 'number' sebelum masuk ke productService.
    const productData = req.body;
    const files = req.files;

    // 3. Delegasi (Controller Pattern): Menyerahkan orkestrasi ke layer Service
    const result = await productService.createProduct(storeId, productData, files);

    return successResponse(
        res,
        201,
        'Produk berhasil ditambahkan ke katalog',
        result
    );
});

export const getProducts = asyncHandler(async (req, res) => {
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