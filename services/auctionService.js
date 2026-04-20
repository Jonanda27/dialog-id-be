import db from '../models/index.js';

// PERHATIAN: Model Product tidak lagi di-import karena lelang kini berdiri secara independen.
const { Auction, AuctionMedia, sequelize } = db;

export const auctionService = {
    /**
     * Membuat entitas lelang baru beserta galerinya.
     * Parameter 'storeId' digunakan karena lelang kini terikat langsung ke toko, bukan produk.
     * Parameter 'mediaUrls' adalah array string URL gambar hasil upload dari controller.
     */
    async createAuction(payload, storeId, mediaUrls = []) {
        const {
            item_name,
            description,
            condition,
            weight,
            length,
            width,
            height,
            start_price,
            bid_increment,
            increment,
            start_time,
            end_time
        } = payload;

        const transaction = await sequelize.transaction();
        try {
            // 1. Eksekusi Atomic Create untuk Data Lelang Induk
            const auction = await Auction.create({
                store_id: storeId,
                item_name,
                description,
                condition: condition || 'USED',
                weight: weight || 0,
                length: length || 0,
                width: width || 0,
                height: height || 0,
                // start_price secara otomatis menjadi harga awal (current_price) di tabel lelang
                current_price: start_price,
                increment: bid_increment || increment,
                start_time,
                end_time,
                status: 'SCHEDULED'
            }, { transaction });

            // 2. Eksekusi Bulk Insert untuk Galeri Media Lelang (Jika ada gambar)
            if (mediaUrls && mediaUrls.length > 0) {
                const mediaData = mediaUrls.map((url, index) => ({
                    auction_id: auction.id,
                    media_url: url,
                    // Gambar pertama pada array akan di-set sebagai thumbnail utama (primary)
                    is_primary: index === 0
                }));

                await AuctionMedia.bulkCreate(mediaData, { transaction });
            }

            // 3. Commit transaksi (Produk is_locked telah dihapus total dari logika ini)
            await transaction.commit();
            return auction;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    /**
     * Membatalkan lelang yang belum berjalan.
     */
    async cancelAuction(auctionId, storeId) {
        const transaction = await sequelize.transaction();
        try {
            const auction = await Auction.findOne({
                where: { id: auctionId, store_id: storeId },
                transaction
            });

            if (!auction) {
                throw new Error('Lelang tidak ditemukan atau Anda tidak memiliki akses pembatalan.');
            }
            if (auction.status !== 'SCHEDULED') {
                throw new Error('Hanya lelang berstatus SCHEDULED yang dapat dibatalkan.');
            }

            // Cukup ubah status lelang menjadi CANCELLED. 
            // Tidak perlu lagi melakukan logika pembukaan gembok (is_locked: false) ke tabel produk.
            await auction.update({ status: 'CANCELLED' }, { transaction });

            await transaction.commit();
            return true;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
};