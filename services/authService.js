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

    // 1. SECURITY REFINEMENT
    if (role === 'admin') {
        const error = new Error('Akses ditolak.');
        error.statusCode = 403; 
        throw error;
    }

    // 2. Cek email
    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
        const error = new Error('Email sudah terdaftar.');
        error.statusCode = 409;
        throw error;
    }

    // 3. PROSES SIMPAN (TIDAK PERLU bcrypt.hash di sini)
    // Karena Hooks di models/User.js sudah otomatis melakukan hashing
    const newUser = await db.User.create({
        full_name,
        email,
        password, // Kirim plain text saja, biar Hooks Model yang mengurusnya
        role: role || 'buyer' 
    });

    // 4. Respon
    const userResponse = newUser.toJSON();
    delete userResponse.password;

    return userResponse;
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

export const getUserProfile = async (userId) => {
    // Ambil data user, kecualikan kolom password agar tidak bocor ke client
    const user = await db.User.findByPk(userId, {
        attributes: { exclude: ['password', 'password_hash'] }, // Exclude password/password_hash
        include: [
            {
                model: db.Store,
                as: 'store', // Sesuai dengan alias di relasi User.hasOne(Store, { as: 'store' })
                // Anda bisa membatasi atribut store yang dikirim jika perlu:
                // attributes: ['id', 'name', 'status'] 
            }
        ]
    });

    if (!user) {
        const error = new Error('User tidak ditemukan.');
        error.statusCode = 404;
        throw error;
    }

    return user;
};