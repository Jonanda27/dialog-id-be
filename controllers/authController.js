require('dotenv').config();

const { User } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // validasi sederhana
    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email, dan password wajib diisi',
      });
    }

    // cek email sudah ada atau belum
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        message: 'Email sudah terdaftar',
      });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // buat user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'pembeli',
    });

    // response TANPA password
    res.status(201).json({
      message: 'Registrasi berhasil',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: 'Terjadi kesalahan saat register',
      error: error.message,
    });
  }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // validasi
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email dan password wajib diisi',
      });
    }

    // cek user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({
        message: 'Email tidak ditemukan',
      });
    }

    // cek password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: 'Password salah',
      });
    }

    // generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: 'Terjadi kesalahan saat login',
      error: error.message,
    });
  }
};