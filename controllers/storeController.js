import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import StoreService from '../services/storeService.js';

/**
 * @desc    Registrasi toko baru untuk Seller
 * @route   POST /api/stores/register-store
 * @access  Private (Role: Seller)
 */
export const registerStore = asyncHandler(async (req, res) => {
    // req.user.id didapatkan dari middleware authenticate
    const result = await StoreService.createStore(req.user.id, req.body);

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

    // Generate URL/Path lokal tanpa awalan '/public' agar sejalan dengan express.static
    const ktpUrl = `/uploads/kyc/${req.file.filename}`;

    // Ambil data toko milik user yang sedang login
    const store = await StoreService.getStoreByUserId(req.user.id);
    if (!store) {
        return errorResponse(res, 404, 'Toko belum didaftarkan.');
    }

    // Update dokumen KYC ke database
    const updatedStore = await StoreService.uploadKYC(store.id, ktpUrl);

    return successResponse(res, 200, 'Dokumen KTP berhasil diunggah. Menunggu verifikasi Admin.', updatedStore);
});

/**
 * @desc    Mendapatkan profil toko milik user yang sedang login
 * @route   GET /api/stores/my-store
 * @access  Private (Role: Seller)
 */
export const getMyStore = asyncHandler(async (req, res) => {
    const store = await StoreService.getStoreByUserId(req.user.id);
    if (!store) {
        return errorResponse(res, 404, 'Toko tidak ditemukan atau belum didaftarkan.');
    }

    return successResponse(res, 200, 'Berhasil memuat data toko.', store);
});

/**
 * @desc    Mengambil saldo dan riwayat transaksi (mutasi) dompet toko
 * @route   GET /api/stores/wallet
 * @access  Private (Role: Seller) - Harus melalui middleware isStoreApproved
 */
export const getWallet = asyncHandler(async (req, res) => {
    // req.store secara aman diinjeksi oleh middleware isStoreApproved (Fase A)
    // Memastikan data dompet yang ditarik mutlak milik toko tersebut
    const storeId = req.store.id;

    const result = await StoreService.getStoreWallet(storeId);

    return successResponse(
        res,
        200,
        'Berhasil memuat informasi dompet dan mutasi toko.',
        result
    );
});