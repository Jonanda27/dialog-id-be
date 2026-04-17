import db from '../models/index.js';

const { Auction, Product, sequelize } = db;

export const auctionService = {
    async createAuction(payload, sellerId) {
        // ⚡ FIX: Ambil bid_increment dari payload (Frontend), 
        // dan sediakan fallback 'increment' jika sewaktu-waktu format berubah
        const {
            product_id,
            start_price,
            bid_increment,
            increment,
            start_time,
            end_time
        } = payload;

        // 1. Validasi eksistensi produk
        const product = await Product.findByPk(product_id);
        if (!product) throw new Error('Produk tidak ditemukan');

        // 2. Validasi status penguncian produk
        if (product.is_locked) {
            throw new Error('Produk sedang dikunci untuk transaksi reguler atau lelang lain.');
        }

        const transaction = await sequelize.transaction();
        try {
            // 3. Eksekusi Atomic Create
            const auction = await Auction.create({
                product_id,
                seller_id: sellerId,
                start_price: start_price,
                current_price: start_price,
                // ⚡ FIX: Petakan 'bid_increment' dari Frontend ke kolom 'increment' di Database
                increment: bid_increment || increment,
                start_time,
                end_time,
                status: 'SCHEDULED'
            }, { transaction });

            // 4. Kunci produk agar tidak bisa di-checkout reguler
            await product.update({ is_locked: true }, { transaction });

            await transaction.commit();
            return auction;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    async cancelAuction(auctionId, sellerId) {
        const transaction = await sequelize.transaction();
        try {
            const auction = await Auction.findOne({
                where: { id: auctionId, seller_id: sellerId },
                transaction
            });

            if (!auction) throw new Error('Lelang tidak ditemukan atau akses ditolak.');
            if (auction.status !== 'SCHEDULED') throw new Error('Hanya lelang berstatus SCHEDULED yang dapat dibatalkan.');

            const product = await Product.findByPk(auction.product_id, { transaction });

            // Kembalikan status lelang dan buka gembok produk
            await auction.update({ status: 'CANCELLED' }, { transaction });
            await product.update({ is_locked: false }, { transaction });

            await transaction.commit();
            return true;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
};