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

        // GANTI STATUS SAAT CREATE:
        return await db.GradingRequest.create({
            buyer_id: buyerId,
            product_id: productId,
            status: 'AWAITING_SELLER_MEDIA' // <--- Sesuaikan dengan ENUM baru di migrasi lo
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
                    // Filter level Join: Hanya ambil request yang produknya milik toko ini
                    where: { store_id: storeId },
                    attributes: ['id', 'name', 'price', 'metadata'],
                    include: [
                        {
                            model: db.ProductMedia,
                            as: 'media',
                            where: { is_primary: true }, // Hanya ambil thumbnail
                            required: false,
                            attributes: ['media_url']
                        }
                    ]
                },
                {
                    model: db.User,
                    as: 'buyer', // Pastikan relasi di model GradingRequest memakai alias 'buyer'
                    attributes: ['id', 'name']
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

        request.status = 'fulfilled';
        // Konsistensi Path: Hilangkan '/public' seperti di Fase B
        request.video_url = `/uploads/videos/${file.filename}`;

        await request.save();
        return request;
    }

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