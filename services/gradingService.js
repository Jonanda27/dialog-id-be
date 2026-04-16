// File: dialog-id-be/services/gradingService.js
import db from '../models/index.js';

class GradingService {
    /**
     * Buyer meminta grading (video detail) untuk suatu produk
     */
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
            error.statusCode = 409; // Conflict
            throw error;
        }

        // Transisi State Inisialisasi: Sesuai Blueprint Bisnis
        return await db.GradingRequest.create({
            buyer_id: buyerId,
            product_id: productId,
            status: 'AWAITING_SELLER_MEDIA'
        });
    }

    /**
     * Seller melihat daftar antrean request grading untuk tokonya
     * Menerapkan Eager Loading (Information Expert Pattern)
     */
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
                    // ⚡ FIX: Sesuaikan nama kolom dengan DB (full_name), lalu beri alias 'name' untuk Frontend
                    attributes: ['id', ['full_name', 'name']]
                }
            ],
            order: [['created_at', 'DESC']]
        });
    }

    /**
     * Seller mengunggah video grading
     */
    static async fulfillGrading(storeId, gradingId, file) {
        // Tarik data request beserta informasi produknya
        const request = await db.GradingRequest.findByPk(gradingId, {
            include: [{ model: db.Product, as: 'product' }]
        });

        if (!request) {
            const error = new Error('Request grading tidak ditemukan.');
            error.statusCode = 404;
            throw error;
        }

        // Validasi Otorisasi Akses Silang (Cross-Access Prevention)
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

        // --- PERBAIKAN KRITIS STATE MACHINE ---
        // Mengubah status legacy 'fulfilled' menjadi 'MEDIA_READY'
        // Ini memastikan controller pembeli dapat mendeteksi tiket yang sudah di-fulfill
        // dan timer SLA (Service Level Agreement) checkout 3x24 jam bisa berjalan secara logis.
        request.status = 'MEDIA_READY';

        // Konsistensi Path: Menyimpan path relatif agar streaming proxy (di gradingController.js) 
        // dapat melakukan resolusi path dengan dinamis dan aman.
        request.video_url = `/uploads/videos/${file.filename}`;

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