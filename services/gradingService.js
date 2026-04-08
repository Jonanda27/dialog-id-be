import db from '../models/index.js';

export const requestGrading = async (buyerId, productId) => {
    const product = await db.Product.findByPk(productId);
    if (!product) throw { statusCode: 404, message: 'Produk tidak ditemukan.' };

    // Cek jika buyer sudah pernah request produk ini
    const existingRequest = await db.GradingRequest.findOne({
        where: { buyer_id: buyerId, product_id: productId }
    });

    if (existingRequest) throw { statusCode: 400, message: 'Anda sudah pernah mengajukan grading untuk produk ini.' };

    const gradingRequest = await db.GradingRequest.create({
        buyer_id: buyerId,
        product_id: productId,
        status: 'requested'
    });

    return gradingRequest;
};

export const fulfillGrading = async (gradingId, sellerUserId, videoUrl) => {
    const gradingRequest = await db.GradingRequest.findByPk(gradingId, {
        include: [{ model: db.Product, as: 'product' }]
    });

    if (!gradingRequest) throw { statusCode: 404, message: 'Request grading tidak ditemukan.' };

    // Validasi: Apakah seller yang login adalah pemilik toko dari produk ini?
    const store = await db.Store.findOne({ where: { user_id: sellerUserId } });
    if (!store || store.id !== gradingRequest.product.store_id) {
        throw { statusCode: 403, message: 'Akses ditolak. Produk ini bukan milik toko Anda.' };
    }

    gradingRequest.status = 'fulfilled';
    // Jika tabel grading_requests diubah untuk menampung video_url, tambahkan: gradingRequest.video_url = videoUrl;
    await gradingRequest.save();

    return gradingRequest;
};