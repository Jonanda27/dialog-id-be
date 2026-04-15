import multer from 'multer';
import path from 'path';
import fs from 'fs';


// Tentukan direktori penyimpanan
const uploadDir = 'public/uploads/kyc';

const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

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

// ==========================================
// KONFIGURASI UPLOAD BANNER & LOGO TOKO
// ==========================================
const storeStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Logika pemisahan folder berdasarkan fieldname
        let dest = 'public/uploads';
        if (file.fieldname === 'banner_file') dest = 'public/uploads/banner';
        if (file.fieldname === 'logo_file') dest = 'public/uploads/logo';

        ensureDir(dest);
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        // Prefix nama file sesuai jenis filenya
        const prefix = file.fieldname === 'banner_file' ? 'banner' : 'logo';
        cb(null, prefix + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

export const uploadStoreMedia = multer({
    storage: storeStorage,
    limits: { fileSize: 3 * 1024 * 1024 }, // Maksimal 3MB untuk banner/logo
    fileFilter: fileFilter
});

// ==========================================
// KONFIGURASI UPLOAD VIDEO GRADING
// ==========================================
const videoDir = 'public/uploads/videos';

if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir, { recursive: true });
}

const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, videoDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'grading-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File Filter untuk Video (MP4, WebM, AVI)
const videoFileFilter = (req, file, cb) => {
    const allowedTypes = /mp4|webm|avi|mov|mkv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /video/;
    const mimetypeTest = mimetype.test(file.mimetype);

    if (extname && mimetypeTest) {
        return cb(null, true);
    } else {
        cb(new Error('Hanya file video (MP4, WebM, AVI, MOV, MKV) yang diperbolehkan!'));
    }
};

export const uploadVideo = multer({
    storage: videoStorage,
    limits: { fileSize: 100 * 1024 * 1024 }, // Maksimal 100MB untuk video
    fileFilter: videoFileFilter
});