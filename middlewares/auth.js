// File: dialog-id-be/middlewares/auth.js
import jwt from 'jsonwebtoken';
import db from '../models/index.js';
import { errorResponse } from '../utils/apiResponse.js';

export const authenticate = async (req, res, next) => {
    try {
        let token;

        // 1. Ekstrak dari Header (Prioritas Utama)
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // 2. Ekstrak dari Query Params (Mutlak untuk pemutaran tag <video> lintas domain)
        else if (req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return errorResponse(res, 401, 'Akses ditolak. Token tidak ditemukan.');
        }

        // 3. Verifikasi Token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // ⚡ FIX LOGICAL: Tangkap ID pengguna baik dari claim 'sub' maupun 'id'
        const userId = decoded.sub || decoded.id;

        if (!userId) {
            return errorResponse(res, 401, 'Struktur token tidak valid. ID pengguna hilang.');
        }

        // 4. Verifikasi eksistensi pengguna
        const currentUser = await db.User.findByPk(userId, {
            attributes: ['id', 'email', 'role']
        });

        if (!currentUser) {
            return errorResponse(res, 401, 'Sesi tidak valid. Pengguna tidak ditemukan di sistem.');
        }

        req.user = currentUser;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return errorResponse(res, 401, 'Sesi telah berakhir atau token tidak valid.');
        }
        next(error);
    }
};

/**
 * Middleware Otorisasi berbasis Role (RBAC)
 */
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return errorResponse(
                res,
                403,
                `Akses terlarang. Peran '${req.user?.role || 'Guest'}' tidak memiliki izin.`
            );
        }
        next();
    };
};

/**
 * Middleware Store Guard: Memastikan integritas data toko milik penjual
 * Harus dipanggil SETELAH authenticate dan authorize('seller')
 */
export const isStoreApproved = async (req, res, next) => {
    try {
        // Cari toko berdasarkan relasi user_id
        const store = await db.Store.findOne({
            where: { user_id: req.user.id },
            attributes: ['id', 'name', 'status', 'balance']
        });

        if (!store) {
            return errorResponse(res, 403, 'Akses ditolak. Anda belum mendaftarkan toko.');
        }

        if (store.status !== 'approved') {
            return errorResponse(res, 403, `Akses ditolak. Status toko Anda adalah '${store.status}'.`);
        }

        // Inject data toko ke request object. Controller HANYA boleh pakai ID dari sini.
        req.store = store;
        next();
    } catch (error) {
        next(error);
    }
};