import db from '../models/index.js';

export const autoCancelOrder = async (orderId) => {
    const t = await db.sequelize.transaction();

    try {
        const order = await db.Order.findByPk(orderId, {
            include: [{ model: db.OrderItem, as: 'items' }],
            transaction: t, lock: t.LOCK.UPDATE
        });

        if (!order) throw { statusCode: 404, message: 'Order tidak ditemukan' };

        // Hanya bisa membatalkan pesanan yang belum dikirim
        if (order.status !== 'pending_payment' && order.status !== 'paid') {
            throw { statusCode: 400, message: `Order dengan status ${order.status} tidak dapat dibatalkan otomatis.` };
        }

        // 1. Ubah status Order dan Escrow
        order.status = 'cancelled';
        await order.save({ transaction: t });

        const escrow = await db.Escrow.findOne({ where: { order_id: orderId }, transaction: t, lock: t.LOCK.UPDATE });
        if (escrow) {
            escrow.status = 'refunded';
            await escrow.save({ transaction: t });
        }

        // 2. Kembalikan Stok Produk (Atomik)
        for (const item of order.items) {
            const product = await db.Product.findByPk(item.product_id, { transaction: t, lock: t.LOCK.UPDATE });
            if (product) {
                await product.update({ stock: product.stock + item.qty }, { transaction: t });
            }
        }

        await t.commit();
        return { order_id: order.id, status: 'cancelled', message: 'Stok berhasil dikembalikan.' };
    } catch (error) {
        await t.rollback();
        throw error;
    }
};