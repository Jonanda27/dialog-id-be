import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import * as disputeService from '../services/disputeService.js';

/**
 * @desc    Mengambil daftar sengketa milik user (Buyer/Seller)
 */
export const getMyDisputes = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role; // 'buyer' atau 'seller'

    const disputes = await disputeService.getMyDisputes(userId, role);
    return successResponse(res, 200, 'Daftar sengketa berhasil diambil.', disputes);
});

/**
 * @desc    Membuka komplain (dispute) untuk pesanan tertentu
 */
export const openDispute = asyncHandler(async (req, res) => {
    const buyerId = req.user.id;
    const { order_id, reason } = req.body;
    const files = req.files; // Array file dari Multer

    if (!order_id || !reason) {
        return errorResponse(res, 400, 'ID Pesanan dan alasan komplain wajib diisi.');
    }

    const result = await disputeService.openDispute(order_id, buyerId, reason, files);

    return successResponse(
        res, 
        201, 
        'Komplain berhasil diajukan. Dana pesanan telah dibekukan sementara.', 
        result
    );
});

/**
 * @desc    Resolusi sengketa oleh Admin
 */
export const resolveAdminDispute = asyncHandler(async (req, res) => {
    const disputeId = req.params.id;
    const { resolution_type, admin_notes, refund_amount } = req.body;

    const result = await disputeService.resolveDispute(disputeId, resolution_type, admin_notes, refund_amount);

    return successResponse(res, 200, 'Sengketa berhasil diselesaikan secara final.', result);
});

// Seller klik "Lanjutkan Proses" (Setuju Retur)
export const sellerAcceptReturn = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const storeId = req.store.id; // Dari middleware isStoreApproved
    const result = await disputeService.acceptReturn(id, storeId);
    return successResponse(res, 200, 'Anda menyetujui pengembalian barang. Menunggu Buyer mengirim barang.', result);
});

/**
 * @desc    Buyer input resi pengembalian barang
 */
export const buyerSubmitResi = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { tracking_number } = req.body; // Harus sesuai dengan key di FE
    const buyerId = req.user.id;

    if (!tracking_number) {
        return errorResponse(res, 400, 'Nomor resi wajib diisi.');
    }

    const result = await disputeService.submitReturnResi(id, buyerId, tracking_number);

    return successResponse(res, 200, 'Resi pengembalian berhasil disimpan.', result);
});

export const sellerConfirmReturn = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const storeId = req.store.id;
    
    const result = await disputeService.confirmReturnReceived(id, storeId);
    
    return successResponse(res, 200, 'Barang diterima, pesanan dibatalkan dan dana dikembalikan ke pembeli.', result);
});