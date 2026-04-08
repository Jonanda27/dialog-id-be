import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import * as adminService from '../services/adminService.js';

export const getPendingStores = asyncHandler(async (req, res) => {
    const result = await adminService.getPendingStores();
    return successResponse(res, 200, 'Berhasil mengambil daftar toko pending', result);
});

export const updateStoreStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, reject_reason } = req.body; // status: 'approved' | 'rejected'

    const result = await adminService.moderateStore(id, status, reject_reason);

    return successResponse(
        res,
        200,
        `Status toko berhasil diubah menjadi ${status}`,
        result
    );
});