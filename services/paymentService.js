import db from '../models/index.js';
import crypto from 'node:crypto';

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

/**
 * Membuat Sesi Pembayaran iPaymu
 * Mengintegrasikan data Order, OrderItems, dan User untuk mendapatkan URL Pembayaran.
 */
export const createIpaymuSession = async (orderId) => {
    // 1. Ambil data order lengkap dengan detail produk dan pembeli [cite: 675, 676, 686]
    const order = await db.Order.findByPk(orderId, {
        include: [
            { 
                model: db.User, 
                as: 'buyer', 
                attributes: ['full_name', 'email'] 
            },
            { 
                model: db.OrderItem, 
                as: 'items', 
                include: [{ model: db.Product, as: 'product', attributes: ['name'] }] 
            }
        ]
    });

    if (!order) {
        throw { statusCode: 404, message: 'Pesanan tidak ditemukan' };
    }

    // 2. Konfigurasi Environment
    const va = process.env.IPAYMU_VA;
    const apiKey = process.env.IPAYMU_API_KEY;
    const url = 'https://sandbox.ipaymu.com/api/v2/payment';

    // 3. Transformasi data produk untuk skema iPaymu
    const cleanAmount = Math.floor(parseFloat(order.grand_total));
    const products = order.items.map(item => item.product.name);
    const prices = order.items.map(item => Math.floor(parseFloat(item.price_at_purchase)));
    const quantities = order.items.map(item => item.qty);

    const body = {
        name: order.buyer?.full_name || "Buyer AnalogID",
        email: order.buyer?.email || "buyer@example.com",
        amount: cleanAmount,
        referenceId: order.id,
        escrow: true,
        product: products,
        qty: quantities,
        price: prices,
        notifyUrl: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/payments/callback`,
        cancelUrl: `${process.env.CLIENT_URL || 'http://localhost:5000'}/orders`,
        returnUrl: `${process.env.CLIENT_URL || 'http://localhost:5000'}/orders/${order.id}/success`,
    };

    // 4. Pembuatan Signature iPaymu (Langkah Krusial)
    const bodyString = JSON.stringify(body);
    const bodyHash = crypto.createHash('sha256').update(bodyString).digest('hex').toLowerCase();
    const stringToSign = `POST:${va}:${bodyHash}:${apiKey}`;
    const signature = crypto.createHmac('sha256', apiKey).update(stringToSign).digest('hex').toLowerCase();

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'va': va,
                'signature': signature,
                'timestamp': new Date().getTime().toString()
            },
            body: bodyString
        });

        const result = await response.json();

        // 5. Pengecekan Respon (Case-Sensitive fix: Status dengan S besar)
        if (result.Status !== 200) {
            console.error("[iPaymu Error Response]:", result);
            throw { 
                statusCode: result.Status || 400, 
                message: `iPaymu Error: ${result.Message || 'Terjadi kesalahan pada payment gateway'}` 
            };
        }

        // 6. Update data Order dengan SessionID (Case-Sensitive fix: Data & SessionID)
        order.payment_reference = result.Data.SessionID; 
        await order.save();

        return result.Data; // Mengembalikan Url dan SessionID ke Controller
    } catch (error) {
        console.error("[Internal Payment Service Error]:", error);
        throw error;
    }
};

export const processCallback = async (callbackData) => {
    const { reference_id, status, trx_id, via } = callbackData;

    // 1. Cari Order berdasarkan reference_id (ID Order di database Anda)
    const order = await db.Order.findByPk(reference_id);
    if (!order) {
        throw new Error('Order tidak ditemukan');
    }

    // 2. Jika status dari iPaymu adalah 'berhasil'
    if (status === 'berhasil' && order.status === 'pending_payment') {
        const t = await db.sequelize.transaction();
        try {
            // Update status Order menjadi paid [cite: 212, 733]
            order.status = 'paid';
            order.payment_method = via;
            order.payment_reference = trx_id.toString();
            await order.save({ transaction: t });

            // Pastikan data Escrow sinkron [cite: 233, 671]
            const escrow = await db.Escrow.findOne({ 
                where: { order_id: order.id }, 
                transaction: t 
            });
            if (escrow) {
                escrow.status = 'held'; // Dana ditahan [cite: 233, 302]
                await escrow.save({ transaction: t });
            }

            await t.commit();
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }
    return order;
};