import jwt from 'jsonwebtoken';
import db from '../models/index.js';
import { errorResponse } from '../utils/apiResponse.js';

/**
 * Middleware untuk memverifikasi JWT Token dari header Authorization
 */
export const authenticate = async (req, res, next) => {
    let token;

    // 1. Ekstrak token dari header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    // 2. Jika token tidak ada
    if (!token) {
        return errorResponse(res, 401, 'Akses ditolak. Token tidak ditemukan.');
    }

    try {
        // 3. Verifikasi token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Pastikan user masih ada di database (mencegah akses jika user sudah dihapus)
        const currentUser = await db.User.findByPk(decoded.id);
        if (!currentUser) {
            return errorResponse(res, 401, 'User pemilik token ini sudah tidak ada.');
        }

        // 5. Inject data user ke object request
        req.user = currentUser;
        next();
    } catch (error) {
        // Error spesifik JWT akan ditangkap oleh Global Error Handler, 
        // tapi kita bisa langsung return 401 di sini demi kecepatan respon.
        return errorResponse(res, 401, 'Token tidak valid atau sudah kadaluwarsa.');
    }
};

/**
 * Middleware untuk otorisasi berdasarkan Role (RBAC)
 * @param  {...string} roles - Daftar role yang diizinkan (misal: 'admin', 'seller')
 */
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return errorResponse(
                res,
                403,
                `Akses terlarang. Role '${req.user ? req.user.role : 'Guest'}' tidak memiliki izin mengakses endpoint ini.`
            );
        }
        next();
    };
};

/**
 * Middleware untuk memastikan toko seller berstatus 'approved'
 * Digunakan pada rute yang membutuhkan aksi modifikasi toko/katalog.
 */
export const isStoreApproved = async (req, res, next) => {
    try {
        // Cari toko berdasarkan ID user yang sedang login
        const store = await db.Store.findOne({ where: { user_id: req.user.id } });

        if (!store) {
            return res.status(403).json({
                success: false,
                message: 'Akses ditolak. Anda belum mendaftarkan toko.'
            });
        }

        if (store.status !== 'approved') {
            return res.status(403).json({
                success: false,
                message: `Akses ditolak. Status toko Anda saat ini adalah '${store.status}'. Toko harus diverifikasi oleh Admin terlebih dahulu.`
            });
        }

        // Inject data toko ke request object agar tidak perlu query ulang di controller
        req.store = store;
        next();
    } catch (error) {
        next(error);
    }
};