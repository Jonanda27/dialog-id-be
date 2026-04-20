import db from '../models/index.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// PERBAIKAN: Menghapus Product dan ProductMedia, diganti Store dan AuctionMedia
const { Auction, Store, AuctionMedia, sequelize } = db;

/**
 * @desc    Membuat lelang baru (Decoupled dari Product)
 * @route   POST /api/v1/auctions
 * @access  Private (Seller only)
 */
export const createAuction = asyncHandler(async (req, res) => {
    // Parsing text dari multipart/form-data
    const {
        item_name, description, condition,
        weight, length, width, height,
        start_time, end_time, increment, start_price
    } = req.body;

    const sellerId = req.user.id;

    // 1. Dapatkan referensi Toko (Store ID)
    const store = await Store.findOne({ where: { user_id: sellerId } });
    if (!store) {
        return errorResponse(res, 404, 'Toko tidak ditemukan.');
    }

    // 2. Validasi Foto
    if (!req.files || req.files.length === 0) {
        return errorResponse(res, 400, 'Minimal satu foto barang lelang harus diunggah.');
    }

    // 3. Validasi input waktu
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

    // 4. Eksekusi Atomic Transaction
    const transaction = await sequelize.transaction();

    try {
        // 4A. Simpan Induk Lelang
        const auction = await Auction.create({
            store_id: store.id,
            item_name,
            description,
            condition: condition || 'USED',
            weight: parseInt(weight) || 0,
            length: parseInt(length) || 0,
            width: parseInt(width) || 0,
            height: parseInt(height) || 0,
            start_time: start,
            end_time: end,
            increment: parseFloat(increment),
            current_price: parseFloat(start_price),
            status: 'SCHEDULED'
        }, { transaction });

        // 4B. Simpan Media Galeri Lelang
        const mediaData = req.files.map((file, index) => ({
            auction_id: auction.id,
            // Sesuaikan properti file.filename dengan setup multer Anda
            media_url: `/uploads/auctions/${file.filename || file.originalname}`,
            is_primary: index === 0 // Gambar indeks 0 dijadikan thumbnail
        }));

        await AuctionMedia.bulkCreate(mediaData, { transaction });

        await transaction.commit();

        return successResponse(res, 201, 'Lelang baru berhasil didaftarkan ke dalam sistem.', auction);
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

    // PERBAIKAN: Langsung include AuctionMedia, tidak perlu lewat relasi produk lagi
    const auctions = await Auction.findAll({
        where: { store_id: store.id },
        include: [{
            model: AuctionMedia,
            as: 'media',
            attributes: ['media_url', 'is_primary']
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
        include: [{ model: Store, as: 'store' }]
    });

    if (!auction) {
        return errorResponse(res, 404, 'Data lelang tidak ditemukan.');
    }

    if (auction.store.user_id !== sellerId) {
        return errorResponse(res, 403, 'Akses ditolak.');
    }

    if (auction.status !== 'SCHEDULED' && auction.status !== 'DRAFT') {
        return errorResponse(res, 400, 'Hanya lelang berstatus SCHEDULED yang dapat dibatalkan.');
    }

    // PERBAIKAN: Tidak perlu transaction dan hapus logika gembok product.is_locked
    await auction.update({ status: 'FAILED' });

    return successResponse(res, 200, 'Lelang berhasil dibatalkan secara permanen.');
});