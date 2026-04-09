import { errorResponse } from '../utils/apiResponse.js';

/**
 * Global Error Handling Middleware - Sentralisasi penanganan kegagalan
 */
export const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    let errors = null;

    // Log error stack ke console khusus untuk mode development
    if (process.env.NODE_ENV === 'development') {
        console.error(`[ERROR LOG] ${err.name}:`, err.message);
        // Bisa mengaktifkan baris di bawah jika butuh stack trace yang lebih dalam
        // console.error(err.stack);
    }

    // 1. Tangkapan Error Validasi (Zod)
    if (err.name === 'ZodError') {
        statusCode = 400;
        message = 'Gagal validasi data masukan.';
        // Menggunakan optional chaining untuk mencegah crash jika err.errors undefined
        errors = err.errors?.map((e) => ({
            field: e.path.join('.'),
            message: e.message
        })) || [];
    }

    // 2. Tangkapan Error Database (Sequelize)
    // Redudansi blok if (err.name === 'SequelizeValidationError') sebelumnya sudah dilebur ke sini
    if (err.name === 'SequelizeUniqueConstraintError' || err.name === 'SequelizeValidationError') {
        statusCode = err.name === 'SequelizeUniqueConstraintError' ? 409 : 400;
        message = err.name === 'SequelizeUniqueConstraintError' ? 'Konflik data: Data sudah digunakan.' : 'Kesalahan validasi basis data.';

        // Memastikan optional chaining berjalan di sini juga untuk menghindari TypeError
        errors = err.errors?.map((e) => ({
            field: e.path,
            message: e.message
        })) || [];
    }

    // 3. Tangkapan Error Autentikasi (JWT)
    // Digabung menjadi satu blok pengecekan untuk efisiensi O(1)
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = err.name === 'TokenExpiredError'
            ? 'Sesi telah berakhir. Silakan login kembali.'
            : 'Token autentikasi tidak valid atau telah dirusak.';
    }

    // Fallback ke standar error response sesuai kontrak API
    return errorResponse(res, statusCode, message, errors);
};