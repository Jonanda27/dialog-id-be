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

export const updateStore = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;
    const files = req.files; // Mengambil file yang diupload

    const updatedStore = await StoreService.updateStoreService(userId, updateData, files);

    return res.status(200).json({
      success: true,
      message: 'Profil toko berhasil diperbarui',
      data: updatedStore
    });
  } catch (error) {
    console.error("Update Error:", error);
    return res.status(error.message === 'Toko tidak ditemukan' ? 404 : 500).json({
      success: false,
      message: error.message || 'Internal Server Error'
    });
  }
};

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

/**
 * @desc    Mendapatkan semua daftar toko (Eksplorasi)
 * @route   GET /api/stores
 * @access  Public
 */
export const getAllStores = asyncHandler(async (req, res) => {
    // Kita bisa menambahkan fitur filter status (hanya toko yang sudah diverifikasi)
    // atau filter pencarian berdasarkan nama melalui query params
    const filters = {
        status: req.query.status || 'approved', // Default hanya tampilkan toko yang sudah aktif
        search: req.query.search || ''
    };

    const stores = await StoreService.findAllStores(filters);

    return successResponse(
        res, 
        200, 
        'Berhasil memuat daftar semua toko.', 
        stores
    );
});