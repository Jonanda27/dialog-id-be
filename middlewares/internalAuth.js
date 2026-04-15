import { AppError } from './errorHandler.js';

export const verifyInternalApiKey = (req, res, next) => {
    const apiKey = req.headers['x-internal-api-key'];

    if (!apiKey) {
        return next(new AppError('Akses ditolak: Internal API Key tidak ditemukan.', 401));
    }

    if (apiKey !== process.env.INTERNAL_API_KEY) {
        return next(new AppError('Akses ditolak: Internal API Key tidak valid.', 403));
    }

    next();
};