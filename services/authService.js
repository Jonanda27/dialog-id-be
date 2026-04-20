import jwt from 'jsonwebtoken';
import db from '../models/index.js';

/**
 * Helper internal untuk generate JWT Token
 * Payload sudah menyertakan role untuk validasi stateless di middleware
 */
const generateToken = (userId, role) => {
    const payload = { id: userId, role: role };
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '1d', // Default 1 hari
    });
};

export const registerUser = async (userData) => {
    const { email, password, full_name, role } = userData;

    // 1. SECURITY REFINEMENT: Mencegah eskalasi hak istimewa (Privilege Escalation)
    if (role === 'admin') {
        const error = new Error('Akses ditolak.');
        error.statusCode = 403;
        throw error;
    }

    // 2. Validasi Duplikasi
    const existingUser = await db.User.findOne({ where: { email } });
    if (existingUser) {
        const error = new Error('Email sudah terdaftar.');
        error.statusCode = 409;
        throw error;
    }

    // 3. Proses Simpan (Hashing didelegasikan ke Hooks Model)
    const newUser = await db.User.create({
        full_name,
        email,
        password,
        role: role || 'buyer'
    });

    // 4. Standarisasi DTO Output (Sama persis dengan bentuk payload Login/GetMe)
    return {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
        role: newUser.role,
        store: null // Default state untuk user baru
    };
};

export const loginUser = async (credentials) => {
    const { email, password } = credentials;

    // 1. Cari user beserta relasi Toko (Eager Loading)
    // Taktik ini mengeliminasi kebutuhan FE untuk memanggil /me sesaat setelah login
    const user = await db.User.findOne({
        where: { email },
        include: [
            {
                model: db.Store,
                as: 'store', // Sesuai relasi User.hasOne(Store)
                attributes: ['id', 'name', 'status', 'balance'] // Tarik atribut esensial saja
            }
        ]
    });

    if (!user) {
        const error = new Error('Kredensial tidak valid (Email tidak ditemukan).');
        error.statusCode = 401; // Unauthorized
        throw error;
    }

    // 2. Verifikasi Kriptografi Password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        const error = new Error('Kredensial tidak valid (Password salah).');
        error.statusCode = 401;
        throw error;
    }

    // 3. Generate Token
    const token = generateToken(user.id, user.role);

    // 4. Return DTO yang komprehensif
    return {
        user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            store: user.store || null, // FE bisa langsung membaca status toko (misal: 'approved' atau 'pending')
        },
        token,
    };
};

// dialog-id-be/services/authService.js

export const getUserProfile = async (userId) => {
    const user = await db.User.findByPk(userId, {
        attributes: { exclude: ['password'] },
        include: [
            {
                model: db.Store,
                as: 'store',
                attributes: ['id', 'name', 'status', 'balance'],
                include: [
                    {
                        model: db.StoreSuspension,
                        as: 'suspensions',
                        where: { is_active: true }, // Ambil hanya yang sedang aktif
                        required: false // Toko tidak suspend tetap muncul
                    }
                ]
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

export const logoutUser = async () => {
    // Disiapkan untuk kapabilitas ekspansi masa depan (misal: Redis Token Blacklisting)
    return {
        message: 'Sesi telah diakhiri secara sistem.'
    };
};