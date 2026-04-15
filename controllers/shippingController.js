// File: controllers/shippingController.js

import * as shippingService from '../services/shippingService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import db from '../models/index.js'; // Import koneksi ORM untuk lookup database

export const getAreas = asyncHandler(async (req, res) => {
    const { input } = req.query;

    if (!input || input.length < 3) {
        return successResponse(res, 200, 'Input minimal 3 karakter', []);
    }

    const areas = await shippingService.searchAreas(input);
    return successResponse(res, 200, 'Berhasil mendapatkan daftar area', areas);
});

export const getShippingRates = asyncHandler(async (req, res) => {
    // 1. Ekstraksi payload dari Frontend
    const { store_id, address_id, items } = req.body;

    if (!store_id || !address_id || !items || items.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Data kalkulasi tidak lengkap. Pastikan store_id, address_id, dan items tersedia.'
        });
    }

    // 2. Lookup Origin Area (Titik Jemput Toko)
    const store = await db.Store.findByPk(store_id);
    if (!store) {
        return res.status(404).json({
            success: false,
            message: 'Toko tidak ditemukan.'
        });
    }

    const originAreaId = store.biteship_area_id;
    if (!originAreaId) {
        return res.status(400).json({
            success: false,
            message: 'Toko belum mengonfigurasi area pengiriman (biteship_area_id).'
        });
    }

    // 3. Lookup Destination Area (Titik Antar Pembeli)
    const address = await db.Address.findByPk(address_id);
    if (!address) {
        return res.status(404).json({
            success: false,
            message: 'Alamat pengiriman tidak ditemukan.'
        });
    }

    const destinationAreaId = address.biteship_area_id;
    if (!destinationAreaId) {
        return res.status(400).json({
            success: false,
            message: 'Alamat pengiriman tidak valid atau belum terpetakan di sistem.'
        });
    }

    // 4. Delegasi ke Service Layer dengan Arity (3 Parameter) yang tepat
    const rates = await shippingService.calculateRates(originAreaId, destinationAreaId, items);

    return successResponse(res, 200, 'Berhasil mendapatkan tarif pengiriman', rates);
});