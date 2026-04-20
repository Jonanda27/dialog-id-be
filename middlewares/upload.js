import multer from 'multer';
import path from 'path';
import fs from 'fs';

const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// File Filter (Hanya Gambar)
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Hanya file gambar (JPG, JPEG, PNG) yang diperbolehkan!'));
    }
};

// ==========================================
// KONFIGURASI UPLOAD KYC
// ==========================================
const uploadDir = 'public/uploads/kyc';
ensureDir(uploadDir);

export const uploadKYC = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: fileFilter
});

// ==========================================
// KONFIGURASI UPLOAD FOTO PRODUK
// ==========================================
const productDir = 'public/uploads/products';
ensureDir(productDir);

export const uploadProductPhotos = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, productDir),
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter
});

// ==========================================
// KONFIGURASI UPLOAD FOTO LELANG (NEW)
// ==========================================
const auctionDir = 'public/uploads/auctions';
ensureDir(auctionDir);

export const uploadAuctionPhotos = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, auctionDir),
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, 'auction-' + uniqueSuffix + path.extname(file.originalname));
        }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter
});

// ==========================================
// KONFIGURASI UPLOAD BANNER & LOGO TOKO
// ==========================================
export const uploadStoreMedia = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            let dest = 'public/uploads';
            if (file.fieldname === 'banner_file') dest = 'public/uploads/banner';
            if (file.fieldname === 'logo_file') dest = 'public/uploads/logo';
            ensureDir(dest);
            cb(null, dest);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const prefix = file.fieldname === 'banner_file' ? 'banner' : 'logo';
            cb(null, prefix + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    }),
    limits: { fileSize: 3 * 1024 * 1024 },
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

// File Filter untuk Video (MP4, WebM, AVI, MOV, MKV)
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

// ==========================================
// KONFIGURASI UPLOAD FOTO ULASAN (REVIEW)
// ==========================================
const reviewDir = 'public/uploads/reviews';

if (!fs.existsSync(reviewDir)) {
    fs.mkdirSync(reviewDir, { recursive: true });
}

const reviewStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, reviewDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'review-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Middleware multer untuk foto ulasan (Maksimal 3 foto, 5MB per foto)
export const uploadReviewPhotos = multer({
    storage: reviewStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter
});