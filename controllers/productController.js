import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import ProductService from '../services/productService.js';
import db from '../models/index.js'; // Ditambahkan untuk kebutuhan kueri massal (Auto-Healing)

const { Product } = db;

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
    // 1. Ekstraksi Context
    const storeId = req.store.id;

    // 2. Ekstraksi Payload (Gunakan spread operator agar bisa dimodifikasi)
    const productData = { ...req.body };
    const files = req.files;

    // --- PERBAIKAN UTAMA DI SINI ---
    // FormData mengirim objek sebagai string. Kita WAJIB mengubahnya kembali 
    // menjadi Object JSON murni sebelum dilempar ke Service & Sequelize.
    if (productData.metadata && typeof productData.metadata === 'string') {
        try {
            productData.metadata = JSON.parse(productData.metadata);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: "Format JSON pada metadata tidak valid.",
                errors: [{ field: "metadata", message: "Gagal mem-parsing string metadata." }]
            });
        }
    }
    // --------------------------------

    // 3. Delegasi ke layer Service
    // Sekarang productData.metadata sudah berbentuk Object, Sequelize pasti menerima!
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
    const updateData = { ...req.body }; // Gunakan spread operator
    const files = req.files;

    // --- PENCEGAHAN BUG PROAKTIF ---
    // Terapkan parsing metadata yang sama seperti pada createProduct 
    // karena update juga menggunakan mekanisme FormData.
    if (updateData.metadata && typeof updateData.metadata === 'string') {
        try {
            updateData.metadata = JSON.parse(updateData.metadata);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: "Format JSON pada metadata tidak valid.",
                errors: [{ field: "metadata", message: "Gagal mem-parsing string metadata." }]
            });
        }
    }
    // --------------------------------

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

/**
 * --- TAHAP 3: PROTOKOL AUTO-HEALING KERANJANG ---
 * Endpoint Sinkronisasi Data Keranjang (State Auto-Healing)
 * Mengambil harga, stok, dan atribut fisik terbaru untuk divalidasi oleh Frontend di halaman Checkout.
 */
export const syncProducts = asyncHandler(async (req, res) => {
    const { product_ids } = req.body;

    if (!Array.isArray(product_ids) || product_ids.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Parameter product_ids harus berupa array dan tidak boleh kosong.'
        });
    }

    // Ambil hanya kolom krusial untuk sinkronisasi finansial & logistik Biteship
    const latestProducts = await Product.findAll({
        where: { id: product_ids },
        attributes: ['id', 'price', 'stock', 'product_weight', 'metadata', 'store_id'],
    });

    return successResponse(
        res,
        200,
        'Berhasil melakukan sinkronisasi data produk',
        latestProducts
    );
});