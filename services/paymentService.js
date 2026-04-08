import db from '../models/index.js';

export const handleWebhook = async (orderId, paymentData) => {
    const { payment_method, payment_reference } = paymentData;

    const order = await db.Order.findByPk(orderId);
    if (!order) {
        const error = new Error('Pesanan tidak ditemukan');
        error.statusCode = 404;
        throw error;
    }

    if (order.status !== 'pending_payment') {
        const error = new Error(`Pesanan ini sudah diproses (Status: ${order.status})`);
        error.statusCode = 400;
        throw error;
    }

    // Update status menjadi paid dan catat referensi PG
    order.status = 'paid';
    order.payment_method = payment_method;
    order.payment_reference = payment_reference;
    await order.save();

    return order;
};