import { Op } from 'sequelize';
import db from '../models/index.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

// Menggunakan Store dan AuctionMedia
const { Auction, Store, AuctionMedia, sequelize } = db;

/* ==========================================================
 * SELLER AREA (MANAJEMEN LELANG OLEH TOKO)
 * ========================================================== */

/**
 * @desc    Membuat lelang baru (Decoupled dari Product)
 * @route   POST /api/v1/auctions
 * @access  Private (Seller only)
 */
export const createAuction = asyncHandler(async (req, res) => {
    const {
        item_name, description, condition,
        weight, length, width, height,
        start_time, end_time, increment, start_price
    } = req.body;

    const sellerId = req.user.id;

    const store = await Store.findOne({ where: { user_id: sellerId } });
    if (!store) {
        return errorResponse(res, 404, 'Toko tidak ditemukan.');
    }

    if (!req.files || req.files.length === 0) {
        return errorResponse(res, 400, 'Minimal satu foto barang lelang harus diunggah.');
    }

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

    const transaction = await sequelize.transaction();

    try {
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

        const mediaData = req.files.map((file, index) => ({
            auction_id: auction.id,
            media_url: `/uploads/auctions/${file.filename || file.originalname}`,
            is_primary: index === 0
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

    await auction.update({ status: 'FAILED' });
    return successResponse(res, 200, 'Lelang berhasil dibatalkan secara permanen.');
});


/* ==========================================================
 * BUYER / PUBLIC AREA (EKSPLORASI LELANG)
 * ========================================================== */

/**
 * @desc    Mengambil daftar lelang aktif/terjadwal untuk Event Toko (Dashboard Buyer)
 * @route   GET /api/v1/auctions/market
 * @access  Public / Protected Buyer
 */
export const getMarketAuctions = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() + 24);

    const { count, rows } = await Auction.findAndCountAll({
        where: {
            [Op.or]: [
                { status: 'ACTIVE' },
                {
                    status: 'SCHEDULED',
                    start_time: { [Op.lte]: thresholdDate }
                }
            ]
        },
        include: [
            {
                model: Store,
                as: 'store',
                // ⚡ WAJIB: Hanya gunakan 'id' dan 'name' yang benar-benar ada di model Store Anda
                attributes: ['id', 'name']
            },
            {
                model: AuctionMedia,
                as: 'media',
                attributes: ['media_url', 'is_primary'],
                where: { is_primary: true },
                required: false
            }
        ],
        order: [
            ['status', 'ASC'],
            ['start_time', 'ASC']
        ],
        limit,
        offset,
        distinct: true
    });

    return successResponse(res, 200, 'Berhasil mengambil daftar pasar lelang.', {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        auctions: rows
    });
});

/**
 * @desc    Mengambil detail statis lelang untuk halaman khusus produk lelang
 * @route   GET /api/v1/auctions/market/:id
 * @access  Public / Protected Buyer
 */
export const getAuctionDetail = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const auction = await Auction.findByPk(id, {
        include: [
            {
                model: Store,
                as: 'store',
                // ⚡ WAJIB: Hanya gunakan 'id', 'name', dan 'description'
                attributes: ['id', 'name', 'description']
            },
            {
                model: AuctionMedia,
                as: 'media',
                attributes: ['id', 'media_url', 'is_primary']
            }
        ]
    });

    if (!auction) {
        return errorResponse(res, 404, 'Detail lelang tidak ditemukan atau telah dihapus.');
    }

    return successResponse(res, 200, 'Berhasil mengambil detail lelang.', auction);
});