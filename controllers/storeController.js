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