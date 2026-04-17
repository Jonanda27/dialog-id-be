// File: dialog-id-be/services/gradingService.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../models/index.js';

// Setup penunjuk path absolut (karena ini ES Module)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GradingService {
    static async requestGrading(buyerId, productId) {
        const product = await db.Product.findByPk(productId);
        if (!product) {
            const error = new Error('Produk tidak ditemukan di katalog.');
            error.statusCode = 404;
            throw error;
        }

        const existingRequest = await db.GradingRequest.findOne({
            where: { buyer_id: buyerId, product_id: productId }
        });

        if (existingRequest) {
            const error = new Error('Anda sudah pernah mengajukan grading untuk produk ini.');
            error.statusCode = 409;
            throw error;
        }

        return await db.GradingRequest.create({
            buyer_id: buyerId,
            product_id: productId,
            status: 'AWAITING_SELLER_MEDIA'
        });
    }

    static async getStoreGradingRequests(storeId) {
        return await db.GradingRequest.findAll({
            include: [
                {
                    model: db.Product,
                    as: 'product',
                    where: { store_id: storeId },
                    attributes: ['id', 'name', 'price', 'metadata'],
                    include: [
                        {
                            model: db.ProductMedia,
                            as: 'media',
                            where: { is_primary: true },
                            required: false,
                            attributes: ['media_url']
                        }
                    ]
                },
                {
                    model: db.User,
                    as: 'buyer',
                    attributes: ['id', ['full_name', 'name']] // Proteksi jika 'name' tidak ada di tabel User
                }
            ],
            order: [['created_at', 'DESC']]
        });
    }

    static async fulfillGrading(storeId, gradingId, file) {
        const request = await db.GradingRequest.findByPk(gradingId, {
            include: [{ model: db.Product, as: 'product' }]
        });

        if (!request) {
            const error = new Error('Request grading tidak ditemukan.');
            error.statusCode = 404;
            throw error;
        }

        if (request.product.store_id !== storeId) {
            const error = new Error('Akses ditolak. Produk ini bukan milik toko Anda.');
            error.statusCode = 403;
            throw error;
        }

        if (!file) {
            const error = new Error('File video grading wajib diunggah.');
            error.statusCode = 400;
            throw error;
        }

        // 1. Transisi State
        request.status = 'MEDIA_READY';

        // 2. ⚡ DETERMINISTIC FILE HANDLING
        // Pindahkan file dari lokasi sementara Multer ke lokasi privat dengan nama Fix
        const targetDir = path.join(__dirname, '..', 'storage', 'private_media');

        // Buat folder jika belum ada
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // Kita standarisasi semua ekstensi video grading dengan .mp4 (atau gunakan aslinya misal .mov)
        const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
        const targetPath = path.join(targetDir, `grading_${gradingId}${ext}`);

        // Proses Pindah + Rename
        try {
            fs.renameSync(file.path, targetPath);
        } catch (err) {
            // Fallback (Cegah error EXDEV jika upload folder ada di partisi disk yang berbeda)
            fs.copyFileSync(file.path, targetPath);
            fs.unlinkSync(file.path);
        }

        // 3. Save state (Tidak perlu menyimpan request.video_url karena kolomnya tidak ada di DB)
        await request.save();
        return request;
    }

    /**
     * Buyer melihat daftar pengajuan grading miliknya
     */
    static async getBuyerGradingRequests(buyerId) {
        return await db.GradingRequest.findAll({
            where: { buyer_id: buyerId },
            include: [
                {
                    model: db.Product,
                    as: 'product',
                    attributes: ['id', 'name', 'price', 'metadata'],
                    include: [
                        {
                            model: db.ProductMedia,
                            as: 'media',
                            where: { is_primary: true },
                            required: false,
                            attributes: ['media_url']
                        }
                    ]
                }
            ],
            order: [['created_at', 'DESC']]
        });
    }
}

export default GradingService;