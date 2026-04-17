import db from '../models/index.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

const { Auction, Product, Store, ProductMedia, sequelize } = db;

/**
 * @desc    Membuat jadwal lelang baru untuk produk tertentu
 * @route   POST /api/v1/auctions
 * @access  Private (Seller only)
 */
export const createAuction = asyncHandler(async (req, res) => {
    const { product_id, start_time, end_time, increment, start_price } = req.body;
    const sellerId = req.user.id;

    // 1. Validasi input waktu
    const start = new Date(start_time);
    const end = new Date(end_time);
    const now = new Date();

    if (start < now) {
        return errorResponse(res, 400, 'Waktu mulai (start_time) tidak boleh di masa lalu.');
    }

    const durationMs = end.getTime() - start.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    if (durationHours < 1 || durationHours > 24) {
        return errorResponse(res, 400, 'Durasi lelang harus minimal 1 jam dan maksimal 24 jam.');
    }

    // 2. Validasi kepemilikan Produk dan Toko
    const product = await Product.findByPk(product_id, {
        include: [{ model: Store, as: 'store', attributes: ['user_id'] }]
    });

    if (!product) {
        return errorResponse(res, 404, 'Produk tidak ditemukan.');
    }

    if (product.store.user_id !== sellerId) {
        return errorResponse(res, 403, 'Akses ditolak. Anda bukan pemilik produk ini.');
    }

    // 3. Validasi status produk
    if (product.is_locked) {
        return errorResponse(res, 400, 'Produk ini sedang terkunci atau sudah memiliki sesi lelang aktif.');
    }

    // 4. Eksekusi Atomic Transaction
    const transaction = await sequelize.transaction();

    try {
        const auction = await Auction.create({
            product_id,
            start_time: start,
            end_time: end,
            increment,
            current_price: start_price || product.price,
            status: 'SCHEDULED'
        }, { transaction });

        // Kunci produk
        await product.update({ is_locked: true }, { transaction });

        await transaction.commit();

        return successResponse(res, 201, 'Jadwal lelang berhasil dibuat dan produk telah dikunci.', auction);
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
});

/**
 * @desc    Mengambil daftar lelang yang dimiliki oleh toko (Seller)
 * @route   GET /api/v1/auctions/my-store
 * @access  Private (Seller only)
 */
export const getAuctionsByStore = asyncHandler(async (req, res) => {
    const sellerId = req.user.id;

    const store = await Store.findOne({ where: { user_id: sellerId } });
    if (!store) {
        return errorResponse(res, 404, 'Toko tidak ditemukan.');
    }

    // ⚡ FIX: Tambahkan include ProductMedia agar foto tampil di tabel Frontend
    const auctions = await Auction.findAll({
        include: [{
            model: Product,
            as: 'product',
            where: { store_id: store.id },
            attributes: ['id', 'name', 'price', 'metadata', 'is_locked'],
            include: [{
                model: ProductMedia,
                as: 'media',
                attributes: ['media_url', 'is_primary']
            }]
        }],
        order: [['start_time', 'DESC']]
    });

    return successResponse(res, 200, 'Berhasil mengambil data lelang toko.', auctions);
});

/**
 * @desc    Membatalkan jadwal lelang (Hanya jika belum ACTIVE)
 * @route   PUT /api/v1/auctions/:id/cancel
 * @access  Private (Seller only)
 */
export const cancelAuction = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const sellerId = req.user.id;

    const auction = await Auction.findByPk(id, {
        include: [{
            model: Product,
            as: 'product',
            include: [{ model: Store, as: 'store' }]
        }]
    });

    if (!auction) {
        return errorResponse(res, 404, 'Data lelang tidak ditemukan.');
    }

    if (auction.product.store.user_id !== sellerId) {
        return errorResponse(res, 403, 'Akses ditolak.');
    }

    // Hanya bisa batal kalau belum Live (Scheduled/Draft)
    if (auction.status !== 'SCHEDULED' && auction.status !== 'DRAFT') {
        return errorResponse(res, 400, 'Hanya lelang berstatus SCHEDULED yang dapat dibatalkan.');
    }

    const transaction = await sequelize.transaction();

    try {
        // Update status lelang ke FAILED atau CANCELLED
        await auction.update({ status: 'FAILED' }, { transaction });

        // Buka gembok produk
        await Product.update(
            { is_locked: false },
            { where: { id: auction.product_id }, transaction }
        );

        await transaction.commit();

        return successResponse(res, 200, 'Lelang berhasil dibatalkan. Produk kembali tersedia.');
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
});