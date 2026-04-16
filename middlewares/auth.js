// File: dialog-id-be/middlewares/auth.js
import jwt from 'jsonwebtoken';
import db from '../models/index.js';
import { errorResponse } from '../utils/apiResponse.js';

/**
 * Middleware untuk memverifikasi JWT Token dari header Authorization atau Query Params
 */
// File: dialog-id-be/middlewares/auth.js
export const authenticate = async (req, res, next) => {
    try {
        let token;

        // Cek header dahulu
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // Cek query parameter (Fallback untuk tag <video>)
        else if (req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return errorResponse(res, 401, 'Akses ditolak. Token tidak ditemukan.');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const currentUser = await db.User.findByPk(decoded.id, {
            attributes: ['id', 'email', 'role']
        });

        if (!currentUser) {
            return errorResponse(res, 401, 'Sesi tidak valid.');
        }

        req.user = currentUser;
        next();
    } catch (error) {
        return errorResponse(res, 401, 'Token kedaluwarsa atau tidak valid.');
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