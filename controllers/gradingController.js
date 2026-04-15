import fs from 'fs';
import path from 'path';
import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import GradingService from '../services/gradingService.js';
import db from '../models/index.js'; // Akses langsung ke model untuk verifikasi mandiri

export const request = asyncHandler(async (req, res) => {
    const buyerId = req.user.id;
    const { product_id } = req.body;

    // --- PROTEKSI ANTI-SPAM (Maksimal 3 Tiket Aktif) ---
    const activeTicketsCount = await db.GradingRequest.count({
        where: {
            buyer_id: buyerId,
            status: ['AWAITING_SELLER_MEDIA', 'MEDIA_READY']
        }
    });

    if (activeTicketsCount >= 3) {
        return res.status(400).json({
            success: false,
            message: "Batas maksimal tiket verifikasi premium (3 aktif) telah tercapai. Harap checkout atau tunggu kedaluwarsa tiket sebelumnya untuk mencegah spam."
        });
    }

    // Lolos proteksi, teruskan ke Service. 
    // Pastikan Service membuat data dengan status default 'AWAITING_SELLER_MEDIA'
    const result = await GradingService.requestGrading(buyerId, product_id);
    return successResponse(res, 201, 'Permintaan verifikasi premium berhasil diajukan. Penjual telah dinotifikasi.', result);
});

export const getStoreRequests = asyncHandler(async (req, res) => {
    const storeId = req.store.id;
    const result = await GradingService.getStoreGradingRequests(storeId);
    return successResponse(res, 200, 'Berhasil memuat daftar request grading toko.', result);
});

export const fulfill = asyncHandler(async (req, res) => {
    const storeId = req.store.id;
    const gradingId = req.params.id;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ success: false, message: "File video detail wajib disertakan." });
    }

    // Pastikan Service mengubah status menjadi 'MEDIA_READY'
    const result = await GradingService.fulfillGrading(storeId, gradingId, file);
    return successResponse(res, 200, 'Video berhasil diunggah. Pembeli kini dapat melihat detail dan melanjutkan checkout.', result);
});

// --- MEDIA ACCESS CONTROL (Endpoint Proxy Streaming Privat) ---
export const streamMedia = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 1. Ambil data tiket beserta relasi struktur kepemilikan produk
    const ticket = await db.GradingRequest.findByPk(id, {
        include: [{
            model: db.Product,
            as: 'product',
            include: [{ model: db.Store, as: 'store' }]
        }]
    });

    if (!ticket) {
        return res.status(404).json({ success: false, message: "Tiket verifikasi tidak ditemukan." });
    }

    // 2. Lapisan Otorisasi Bertingkat
    const isAuthorized =
        (userId === ticket.buyer_id) || // Pembeli yang memesan tiket
        (ticket.product && ticket.product.store && userId === ticket.product.store.user_id) || // Penjual pemilik barang
        (userRole === 'admin'); // Super User (Admin)

    if (!isAuthorized) {
        return res.status(403).json({ success: false, message: "Akses Ditolak. Video ini bersifat privat eksklusif untuk pembeli dan penjual terkait." });
    }

    // 3. Resolusi Path File
    // Tergantung bagaimana GradingService Anda menyimpan path videonya.
    // Jika tidak menyimpan path absolut, sistem dapat menggunakan standar konvensi penamaan tiket.
    const filePath = ticket.video_url || path.resolve(`storage/private_media/grading_${ticket.id}.mp4`);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: "File video fisik tidak ditemukan di server." });
    }

    // 4. Proses Streaming Data (Mendukung Seek/Scrubbing di HTML5 Video Player)
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });

        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(206, head); // 206 Partial Content
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
    }
});