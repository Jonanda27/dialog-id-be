import { errorResponse } from '../utils/apiResponse.js';

export const verifyApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const validKey = process.env.INTERNAL_API_KEY; // Tambahkan ini di .env

    if (!apiKey || apiKey !== validKey) {
        return errorResponse(res, 401, 'Akses Internal Ditolak. Invalid API Key.');
    }
    next();
};