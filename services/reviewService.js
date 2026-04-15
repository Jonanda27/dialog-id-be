import db from '../models/index.js';

class ReviewService {
   /**
     * Buyer membuat ulasan baru (diperbarui dengan media)
     */
    static async createReview(buyerId, payload, files) {
        const { order_item_id, rating, comment } = payload;
        const t = await db.sequelize.transaction(); // Gunakan transaksi agar atomik

        try {
            // 1-4. (Logika validasi Order Item, Kepemilikan, Status, dan Spam sama persis seperti sebelumnya) ...
            const orderItem = await db.OrderItem.findByPk(order_item_id, { include: [{ model: db.Order, as: 'order' }], transaction: t });
            if (!orderItem) throw { statusCode: 404, message: 'Item pesanan tidak ditemukan.' };
            if (orderItem.order.buyer_id !== buyerId) throw { statusCode: 403, message: 'Akses ditolak.' };
            if (orderItem.order.status !== 'completed') throw { statusCode: 400, message: 'Pesanan belum selesai.' };
            
            const existingReview = await db.Review.findOne({ where: { order_item_id }, transaction: t });
            if (existingReview) throw { statusCode: 409, message: 'Anda sudah mengulas item ini.' };

            // 5. Simpan Ulasan
            const review = await db.Review.create({
                buyer_id: buyerId,
                store_id: orderItem.order.store_id,
                product_id: orderItem.product_id,
                order_item_id: order_item_id,
                rating,
                comment
            }, { transaction: t });

            // 6. Simpan Foto (Jika Ada)
            if (files && files.length > 0) {
                const mediaRecords = files.map(file => ({
                    review_id: review.id,
                    media_url: `/uploads/reviews/${file.filename}`
                }));
                await db.ReviewMedia.bulkCreate(mediaRecords, { transaction: t });
            }

            await t.commit();
            return review;
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Saat mengambil data ulasan, pastikan media ikut terambil (Eager Loading)
     */
    static async getProductReviews(productId) {
        return await db.Review.findAll({
            where: { product_id: productId },
            include: [
                { model: db.User, as: 'buyer', attributes: ['id', 'full_name'] },
                { model: db.ReviewMedia, as: 'media', attributes: ['id', 'media_url'] } // <-- TAMBAHKAN INI
            ],
            order: [['created_at', 'DESC']]
        });
    }

    static async getStoreReviews(storeId) {
        return await db.Review.findAll({
            where: { store_id: storeId },
            include: [
                { model: db.User, as: 'buyer', attributes: ['id', 'full_name'] },
                { model: db.Product, as: 'product', attributes: ['id', 'name'] },
                { model: db.ReviewMedia, as: 'media', attributes: ['id', 'media_url'] } // <-- TAMBAHKAN INI
            ],
            order: [['created_at', 'DESC']]
        });
    }
    
    /**
     * Seller membalas ulasan pembeli
     */
    static async replyToReview(storeId, reviewId, replyText) {
        const review = await db.Review.findByPk(reviewId);

        if (!review) throw { statusCode: 404, message: 'Ulasan tidak ditemukan.' };
        if (review.store_id !== storeId) throw { statusCode: 403, message: 'Ini bukan ulasan untuk toko Anda.' };

        review.seller_reply = replyText;
        await review.save();

        return review;
    }
}

export default ReviewService;