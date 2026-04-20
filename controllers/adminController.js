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

// Fitur Baru: Suspend dengan durasi atau permanen
export const suspendStore = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { duration, unit, reason } = req.body; 
    // duration: angka (misal: 5, 24)
    // unit: 'hours' | 'days' | 'permanent'
    
    const result = await adminService.suspendStore(id, duration, unit, reason);

    return successResponse(
        res,
        200,
        unit === 'permanent' 
            ? 'Toko berhasil disuspensi selamanya' 
            : `Toko berhasil disuspensi selama ${duration} ${unit}`,
        result
    );
});

export const unsuspendStore = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await adminService.unsuspendStore(id);
    return successResponse(res, 200, 'Suspensi toko telah dicabut', result);
});