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
    // Diperbarui menjadi getProductDetails (sinkron dengan nama fungsi di ProductService)
    const result = await ProductService.getProductDetails(productId);

    return successResponse(
        res,
        200,
        'Berhasil mengambil detail produk',
        result
    );
});

export const createProduct = asyncHandler(async (req, res) => {
    const storeId = req.store.id;
    const productData = { ...req.body };
    
    // Multer .array() meletakkan file di req.files
    const files = req.files; 

    // Parsing metadata jika string
    if (productData.metadata && typeof productData.metadata === 'string') {
        productData.metadata = JSON.parse(productData.metadata);
    }

    // Kirim 'files' ke service
    const result = await ProductService.createProduct(storeId, productData, files);

    return successResponse(res, 201, 'Produk berhasil ditambahkan', result);
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
    const updateData = { ...req.body };
    const files = req.files; // Ini adalah array dari Multer

    // Parsing metadata JSONB dari FormData
    if (updateData.metadata && typeof updateData.metadata === 'string') {
        try {
            updateData.metadata = JSON.parse(updateData.metadata);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: "Format JSON pada metadata tidak valid."
            });
        }
    }

    // Kirim files ke Service
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
    // Tambahkan 'store_id' ke dalam standardKeys agar bisa difilter secara publik
    const standardKeys = [
        'store_id', 
        'sub_category_id', 
        'name', 
        'min_price', 
        'max_price', 
        'page', 
        'limit'
    ];

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