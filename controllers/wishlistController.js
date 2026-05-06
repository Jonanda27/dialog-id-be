import * as wishlistService from '../services/wishlistService.js';
import { asyncHandler } from '../utils/asyncHandler.js'; // [cite: 1934]
import { successResponse } from '../utils/apiResponse.js'; // 

export const getWishlist = asyncHandler(async (req, res) => {
    const result = await wishlistService.getMyWishlist(req.user.id);
    return successResponse(res, 200, 'Berhasil memuat wishlist', result);
});

export const addWishlist = asyncHandler(async (req, res) => {
    const { product_id } = req.body;
    
    if (!product_id) {
        return res.status(400).json({ success: false, message: 'Product ID wajib diisi' });
    }

    const item = await wishlistService.addToWishlist(req.user.id, product_id);
    return successResponse(res, 201, 'Produk berhasil ditambahkan ke favorit', item);
});

export const removeWishlist = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    await wishlistService.removeFromWishlist(req.user.id, productId);
    return successResponse(res, 200, 'Produk dihapus dari favorit');
});