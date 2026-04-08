import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Tentukan direktori penyimpanan
const uploadDir = 'public/uploads/kyc';

// Buat folder secara otomatis jika belum ada (Sync)
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Penamaan file: fieldname-timestamp-random.ext
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File Filter (Hanya Gambar)
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        // Error ini akan diteruskan ke Global Error Handler
        cb(new Error('Hanya file gambar (JPG, JPEG, PNG) yang diperbolehkan!'));
    }
};

// Ekspor middleware multer yang siap pakai
export const uploadKYC = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // Maksimal 2MB
    fileFilter: fileFilter
});

// ==========================================
// KONFIGURASI UPLOAD FOTO PRODUK
// ==========================================
const productDir = 'public/uploads/products';

if (!fs.existsSync(productDir)) {
    fs.mkdirSync(productDir, { recursive: true });
}

const productStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, productDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Middleware multer untuk produk (maksimal 5 foto, 5MB per foto)
export const uploadProductPhotos = multer({
    storage: productStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter // Menggunakan fileFilter gambar yang sama dengan KYC
});