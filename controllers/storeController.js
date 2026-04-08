import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import * as storeService from '../services/storeService.js';

/**
 * @desc    Registrasi toko baru untuk Seller
 * @route   POST /api/stores/register-store
 * @access  Private (Role: Seller)
 */
export const registerStore = asyncHandler(async (req, res) => {
    // req.user.id didapatkan dari middleware authenticate
    const result = await storeService.createStore(req.user.id, req.body);

    return successResponse(
        res,
        201,
        'Pengajuan toko berhasil dibuat. Menunggu verifikasi KTP.',
        result
    );
});

/**
 * @desc    Upload file KTP untuk KYC Toko
 * @route   PATCH /api/stores/upload-kyc
 * @access  Private (Role: Seller)
 */
export const uploadKycDocument = asyncHandler(async (req, res) => {
    if (!req.file) {
        return errorResponse(res, 400, 'File gambar KTP wajib diunggah.');
    }

    // Generate URL/Path lokal yang bisa diakses via browser
    const ktpUrl = `/public/uploads/kyc/${req.file.filename}`;

    // Ambil data toko milik user yang sedang login
    const store = await storeService.getStoreByUserId(req.user.id);
    if (!store) return errorResponse(res, 404, 'Toko belum didaftarkan.');

    // Update KTP url menggunakan service (Silakan tambahkan getStoreByUserId di storeService)
    const updatedStore = await storeService.uploadKYC(store.id, ktpUrl);

    return successResponse(res, 200, 'Dokumen KTP berhasil diunggah', updatedStore);
});