// File: dialog-id-be/controllers/cartController.js
import CartService from '../services/cartService.js'; // FIX: Import default tanpa kurung kurawal
import { asyncHandler } from '../utils/asyncHandler.js'; // Menggunakan utilitas yang sudah ada [cite: 1659]
import { successResponse } from '../utils/apiResponse.js'; // Menggunakan utilitas yang sudah ada [cite: 1654]

/**
 * Mengambil data keranjang belanja milik user yang sedang login
 */
export const getMyCart = asyncHandler(async (req, res) => {
    const data = await CartService.getCart(req.user.id);
    return successResponse(res, 200, 'Berhasil memuat keranjang', data);
});

/**
 * Menambahkan item ke keranjang
 */
export const addItem = asyncHandler(async (req, res) => {
    const { product_id, quantity } = req.body;
    
    // Memanggil static method dari class CartService
    const item = await CartService.addToCart(req.user.id, product_id, Number(quantity));
    
    return successResponse(res, 201, 'Produk ditambahkan ke keranjang', item);
});

/**
 * Memperbarui jumlah (quantity) item di dalam keranjang
 */
export const updateItemQty = asyncHandler(async (req, res) => {
    const { quantity } = req.body;
    const cartItemId = req.params.id;

    const item = await CartService.updateQty(req.user.id, cartItemId, Number(quantity));
    
    return successResponse(res, 200, 'Kuantitas diperbarui', item);
});

/**
 * Menghapus satu item spesifik dari keranjang
 */
export const deleteItem = asyncHandler(async (req, res) => {
    const cartItemId = req.params.id;

    await CartService.removeItem(req.user.id, cartItemId);
    
    return successResponse(res, 200, 'Item dihapus dari keranjang');
});

/**
 * Mengosongkan seluruh isi keranjang belanja user
 */
export const clearMyCart = asyncHandler(async (req, res) => {
    await CartService.clearCart(req.user.id);
    return successResponse(res, 200, 'Seluruh isi keranjang dibersihkan');
});