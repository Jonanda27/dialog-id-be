import * as shippingService from '../services/shippingService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/apiResponse.js';

export const getAreas = asyncHandler(async (req, res) => {
    const { input } = req.query;

    if (!input || input.length < 3) {
        return sendResponse(res, 200, 'Input minimal 3 karakter', []);
    }

    const areas = await shippingService.searchAreas(input);
    return sendResponse(res, 200, 'Berhasil mendapatkan daftar area', areas);
});