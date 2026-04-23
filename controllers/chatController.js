import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import { chatService } from '../services/chatService.js';

// Mendapatkan riwayat pesan
export const getHistory = asyncHandler(async (req, res) => {
    const { storeId } = req.params;
    const userId = req.user.id;
    const history = await chatService.getChatHistory(storeId, userId);
    return successResponse(res, 200, 'Riwayat chat berhasil dimuat', history);
});

// Mendapatkan daftar toko yang pernah dihubungi user
export const getChatList = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const list = await chatService.getUserChatList(userId);
    return successResponse(res, 200, 'Daftar chat berhasil dimuat', list);
});

export const getPenjualChatList = asyncHandler(async (req, res) => {
    const sellerId = req.user.id; // Asumsi req.user diisi oleh middleware auth
    const list = await chatService.getPenjualChatList(sellerId);
    return successResponse(res, 200, 'Daftar chat penjual berhasil dimuat', list);
});