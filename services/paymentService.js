import db from '../models/index.js';
import midtransClient from 'midtrans-client';

// Inisialisasi Midtrans Snap
const snap = new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

/**
 * Membuat Sesi Pembayaran Midtrans Snap
 * Menggunakan Billing ID sebagai reference agar satu pembayaran bisa berisi banyak Order (Split Order)
 */
/**
 * Membuat Sesi Pembayaran Midtrans Snap
 * Strategi: Menyimpan dan menggunakan kembali snap_token selama status masih unpaid.
 */
export const createMidtransSession = async (billingId) => {
    // 1. Ambil data Billing lengkap dengan rincian Order dan Buyer
    const billing = await db.Billing.findByPk(billingId, {
        include: [
            { model: db.User, as: 'buyer', attributes: ['full_name', 'email'] },
            { 
                model: db.Order, 
                as: 'orders',
                include: [{ 
                    model: db.OrderItem, 
                    as: 'items',
                    include: [{ model: db.Product, as: 'product' }] 
                }]
            }
        ]
    });

    if (!billing) {
        throw { statusCode: 404, message: 'Data tagihan (billing) tidak ditemukan' };
    }

    // ⚡ LOGIKA PENTING: Cek apakah sesi pembayaran sudah pernah dibuat sebelumnya
    // Jika snap_token ada dan status masih unpaid, kita tidak perlu membuat transaksi baru ke Midtrans.
    if (billing.snap_token && billing.status === 'unpaid') {
        console.log(`[Midtrans] Menggunakan kembali sesi aktif untuk Billing: ${billingId}`);
        return {
            token: billing.snap_token,
            // URL redirect standard Midtrans berdasarkan token
            redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${billing.snap_token}`
        };
    }

    // 2. Siapkan Item Details untuk Midtrans (Gabungan semua item dari semua order)
    const itemDetails = [];
    billing.orders.forEach(order => {
        order.items.forEach(item => {
            itemDetails.push({
                id: item.product_id,
                price: Math.floor(parseFloat(item.price_at_purchase)),
                quantity: item.qty,
                name: item.product.name.substring(0, 50), // Batas karakter midtrans
                merchant_name: "AnalogID"
            });
        });
        
        // Tambahkan Ongkir sebagai item terpisah
        if (parseFloat(order.shipping_fee) > 0) {
            itemDetails.push({
                id: `SHIPPING-${order.id.substring(0, 8)}`,
                price: Math.floor(parseFloat(order.shipping_fee)),
                quantity: 1,
                name: `Ongkir - Toko ${order.store_id.substring(0, 5)}`
            });
        }
    });

    // 3. Payload Midtrans Snap
    const parameter = {
        transaction_details: {
            order_id: billing.id, // ID Billing Master
            gross_amount: Math.floor(parseFloat(billing.total_amount))
        },
        item_details: itemDetails,
        customer_details: {
            first_name: billing.buyer?.full_name,
            email: billing.buyer?.email
        },
        callbacks: {
            finish: `${process.env.CLIENT_URL}/orders/success`,
            error: `${process.env.CLIENT_URL}/orders/failed`,
            pending: `${process.env.CLIENT_URL}/orders/pending`
        }
    };

    try {
        // Jika sampai di sini, berarti token belum ada atau perlu dibuat baru
        const transaction = await snap.createTransaction(parameter);
        
        // Simpan snap_token ke database Billing agar bisa digunakan kembali
        billing.snap_token = transaction.token;
        await billing.save();

        return {
            token: transaction.token,
            redirect_url: transaction.redirect_url
        };
    } catch (error) {
        // Penanganan error spesifik jika Order ID sudah terpakai di Midtrans namun tidak sinkron dengan DB kita
        if (error.message.includes('400') || error.message.includes('already exists')) {
             console.error("[Midtrans Conflict]: ID sudah ada, silakan cek status transaksi via API.");
             // Opsional: Anda bisa melakukan sinkronisasi status di sini jika diperlukan
        }

        console.error("[Midtrans Error]:", error);
        throw { statusCode: 500, message: "Gagal membuat sesi pembayaran Midtrans" };
    }
};

/**
 * Handle Webhook Resmi dari Midtrans
 */
export const handleMidtransNotification = async (notificationData) => {
    // 1. Verifikasi notifikasi ke Midtrans
    const statusResponse = await snap.transaction.notification(notificationData);
    
    const billingId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    
    // 2. Cari data Billing
    const billing = await db.Billing.findByPk(billingId);
    if (!billing) return;

    // 3. Logika Update jika SUKSES (settlement atau capture untuk kartu kredit)
    if (transactionStatus === 'settlement' || transactionStatus === 'capture') {
        const t = await db.sequelize.transaction();
        try {
            // A. UPDATE STATUS BILLING
            await billing.update({
                status: 'paid',
                payment_method: statusResponse.payment_type,
                payment_reference: statusResponse.transaction_id
            }, { transaction: t });

            // B. UPDATE SEMUA ORDER DI BAWAH BILLING INI
            await db.Order.update(
                { 
                    status: 'paid',
                    payment_method: statusResponse.payment_type,
                    payment_reference: statusResponse.transaction_id
                },
                { 
                    where: { billing_id: billingId }, 
                    transaction: t 
                }
            );

            // C. LOGIKA PENGURANGAN STOK
            // Ambil semua order yang terkait dengan billing ini
            const orders = await db.Order.findAll({
                where: { billing_id: billingId },
                transaction: t
            });

            for (const order of orders) {
                // Ambil semua item di setiap order
                const items = await db.OrderItem.findAll({
                    where: { order_id: order.id },
                    transaction: t
                });

                for (const item of items) {
                    // Kurangi stok produk secara atomik
                    await db.Product.decrement('stock', {
                        by: item.qty,
                        where: { id: item.product_id },
                        transaction: t
                    });
                }
            }

            await t.commit();
            console.log(`Billing ${billingId} Berhasil Dilunasi dan Stok Telah Dikurangi`);
        } catch (error) {
            await t.rollback();
            console.error(`Gagal memproses pelunasan Billing ${billingId}:`, error);
            throw error;
        }
    }
};


// Simulasi webhook tetap sama (seperti iPaymu) untuk keperluan testing internal
export const handleWebhookSimulation = async (orderId, paymentData) => {
    const { payment_method, payment_reference } = paymentData;
    const order = await db.Order.findByPk(orderId);
    if (!order) throw { statusCode: 404, message: 'Pesanan tidak ditemukan' };

    order.status = 'paid';
    order.payment_method = payment_method;
    order.payment_reference = payment_reference;
    await order.save();
    return order;
};

// Tambahkan fungsi ini di paymentService.js Anda
export const getBillingDetail = async (billingId) => {
    const billing = await db.Billing.findByPk(billingId, {
        include: [
            {
                model: db.Order,
                as: 'orders',
                include: [
                    {
                        model: db.OrderItem,
                        as: 'items',
                        include: [{ model: db.Product, as: 'product', attributes: ['name', 'price'] }]
                    }
                ]
            }
        ]
    });

    if (!billing) {
        throw { statusCode: 404, message: 'Data billing tidak ditemukan' };
    }

    // Format response agar sesuai dengan interface PaymentResult di FE
    return {
        billing,
        orders: billing.orders,
        payment_status: billing.status === 'paid' ? 'success' : 
                        billing.status === 'cancelled' ? 'failure' : 
                        billing.status === 'expired' ? 'expired' : 'pending'
    };
};

// ⚡ TAMBAHKAN INI: Fungsi Verifikasi ke API Midtrans
export const verifyBillingStatus = async (billingId) => {
    try {
        // Ambil status langsung dari API Midtrans
        const statusResponse = await snap.transaction.status(billingId);
        
        // Gunakan fungsi notifikasi yang sudah ada untuk update DB jika statusnya sukses
        await handleMidtransNotification(statusResponse);
        
        // Kembalikan detail terbaru
        return await getBillingDetail(billingId);
    } catch (error) {
        console.error("Midtrans Verify Error:", error);
        throw { statusCode: 500, message: "Gagal memverifikasi status ke Midtrans" };
    }
};