import * as shippingService from '../services/shippingService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import db from '../models/index.js';

/**
 * Mendapatkan saran area/wilayah dari Biteship Maps API
 */
export const getAreas = asyncHandler(async (req, res) => {
    const { input } = req.query;

    if (!input || input.length < 3) {
        return successResponse(res, 200, 'Input minimal 3 karakter', []);
    }

    const areas = await shippingService.searchAreas(input);
    return successResponse(res, 200, 'Berhasil mendapatkan daftar area', areas);
});

/**
 * Kalkulasi Ongkir Real-time
 */
// SEMENTARA UNTUK TESTING TANPA SALDO
export const getShippingRates = asyncHandler(async (req, res) => {
    // Return data palsu agar FE bisa ngetes UI
    const mockRates = [
        {
            courier_company: "jne",
            courier_name: "JNE",
            service_type: "reg",
            service_name: "Reguler",
            price: 9000,
            estimated_delivery: "1-2 days"
        },
        {
            courier_company: "sicepat",
            courier_name: "SiCepat",
            service_type: "reg",
            service_name: "Reguler",
            price: 10000,
            estimated_delivery: "1-2 days"
        }
    ];

    return successResponse(res, 200, 'Berhasil memuat ongkir (MOCK)', mockRates);
});