import jwt from 'jsonwebtoken';
import db from '../models/index.js';

/**
 * Helper internal untuk generate JWT Token
 */
const generateToken = (userId, role) => {
    const payload = { id: userId, role: role };
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d', // Default 1 hari
    });
};

export const registerUser = async (userData) => {
    const { email, password, full_name, role } = userData;

    // 1. Cek apakah email sudah terdaftar
    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
        const error = new Error('Email sudah terdaftar. Silakan gunakan email lain.');
        error.statusCode = 409; // Conflict
        throw error;
    }

    // 2. Buat user baru (Password di-hash otomatis oleh hooks di Model)
    const newUser = await db.User.create({
        email,
        password,
        full_name,
        role,
    });

    // 3. Generate Token
    const token = generateToken(newUser.id, newUser.role);

    // 4. Return data tanpa password
    return {
        user: {
            id: newUser.id,
            email: newUser.email,
            full_name: newUser.full_name,
            role: newUser.role,
        },
        token,
    };
};

export const loginUser = async (credentials) => {
    const { email, password } = credentials;

    // 1. Cari user berdasarkan email
    const user = await db.User.findOne({ where: { email } });
    if (!user) {
        const error = new Error('Kredensial tidak valid (Email tidak ditemukan).');
        error.statusCode = 401; // Unauthorized
        throw error;
    }

    // 2. Verifikasi Password menggunakan method dari Model
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        const error = new Error('Kredensial tidak valid (Password salah).');
        error.statusCode = 401;
        throw error;
    }

    // 3. Generate Token
    const token = generateToken(user.id, user.role);

    // 4. Return data
    return {
        user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
        },
        token,
    };
};