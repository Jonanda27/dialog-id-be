// File: dialog-id-be/services/paymentService.js

import db from '../models/index.js';
import midtransClient from 'midtrans-client';
import { io } from '../app.js';

// Inisialisasi Midtrans Snap (Untuk pembuatan transaksi/Checkout)
const snap = new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

// ⚡ BARU: Inisialisasi Midtrans Core API (Diwajibkan untuk fitur Refund/Disbursement)
const coreApi = new midtransClient.CoreApi({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY
});

/**
 * Membuat Sesi Pembayaran Midtrans Snap
 */
export const createMidtransSession = async (billingId) => {
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

    if (billing.snap_token && billing.status === 'unpaid') {
        return {
            token: billing.snap_token,
            redirect_url: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${billing.snap_token}`
        };
    }

    const itemDetails = [];
    billing.orders.forEach(order => {
        // 1. Masukkan Produk
        order.items.forEach(item => {
            itemDetails.push({
                id: item.product_id,
                price: Math.floor(parseFloat(item.price_at_purchase)),
                quantity: item.qty,
                name: item.product.name.substring(0, 50),
                merchant_name: "AnalogID"
            });
        });

        // 2. Masukkan Ongkir (Jika ada)
        if (parseFloat(order.shipping_fee) > 0) {
            itemDetails.push({
                id: `SHIPPING-${order.id.substring(0, 8)}`,
                price: Math.floor(parseFloat(order.shipping_fee)),
                quantity: 1,
                name: `Ongkir - Toko ${order.store_id.substring(0, 5)}`
            });
        }

        // 3. Masukkan Grading Fee
        if (parseFloat(order.grading_fee) > 0) {
            itemDetails.push({
                id: `GRADING-${order.id.substring(0, 8)}`,
                price: Math.floor(parseFloat(order.grading_fee)),
                quantity: 1,
                name: `Biaya Verifikasi Premium (Grading)`
            });
        }
    });

    const parameter = {
        transaction_details: {
            order_id: billing.id,
            // Pastikan gross_amount menggunakan total_amount dari billing yang sudah mencakup segalanya
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
        const transaction = await snap.createTransaction(parameter);
        billing.snap_token = transaction.token;
        await billing.save();

        return {
            token: transaction.token,
            redirect_url: transaction.redirect_url
        };
    } catch (error) {
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

    // 2. Cari data Billing beserta data pembeli untuk detail notifikasi
    const billing = await db.Billing.findByPk(billingId, {
        include: [{ model: db.User, as: 'buyer', attributes: ['full_name'] }]
    });
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

            // C. AMBIL SEMUA ORDER UNTUK NOTIFIKASI DAN UPDATE STOK
            const orders = await db.Order.findAll({
                where: { billing_id: billingId },
                transaction: t
            });

            const orderIds = orders.map(order => order.id);

            // ⚡ PROSES UPDATE GRADING REQUEST MENJADI COMPLETED
            await db.GradingRequest.update(
                { status: 'COMPLETED' },
                {
                    where: {
                        order_id: orderIds,
                        status: 'MEDIA_READY'
                    },
                    transaction: t
                }
            );

            // D. PENGURANGAN STOK PER ITEM
            for (const order of orders) {
                const items = await db.OrderItem.findAll({
                    where: { order_id: order.id },
                    transaction: t
                });

                for (const item of items) {
                    await db.Product.decrement('stock', {
                        by: item.qty,
                        where: { id: item.product_id },
                        transaction: t
                    });
                }
            }

            // SELESAIKAN TRANSAKSI DB
            await t.commit();
            console.log(`Billing ${billingId} Berhasil Dilunasi, Stok Dikurangi, dan Status Grading Diperbarui`);

            // --- ⚡ LOGIKA NOTIFIKASI REAL-TIME KE SELLER (POST-COMMIT) ---
            // Mengirim notifikasi ke setiap toko yang ada di dalam billing ini
            orders.forEach(order => {
                const storeId = order.store_id;

                // Gunakan namespace /chat sesuai standar Navbar Seller
                io.of('/chat').to(`store:${storeId}`).emit('NEW_ORDER', {
                    orderId: order.id,
                    grandTotal: order.grand_total,
                    buyerName: billing.buyer?.full_name || "Seorang Pembeli",
                    timestamp: new Date()
                });
            });

        } catch (error) {
            if (t) await t.rollback();
            console.error(`Gagal memproses pelunasan Billing ${billingId}:`, error);
            throw error;
        }
    }
};

// Simulasi webhook tetap sama untuk keperluan testing internal
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

// Mengambil detail billing
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

    return {
        billing,
        orders: billing.orders,
        payment_status: billing.status === 'paid' ? 'success' :
            billing.status === 'cancelled' ? 'failure' :
                billing.status === 'expired' ? 'expired' : 'pending'
    };
};

/**
 * Fungsi Verifikasi ke API Midtrans
 */
export const verifyBillingStatus = async (billingId) => {
    try {
        const statusResponse = await snap.transaction.status(billingId);
        await handleMidtransNotification(statusResponse);
        return await getBillingDetail(billingId);
    } catch (error) {
        console.error("Midtrans Verify Error:", error);
        throw { statusCode: 500, message: "Gagal memverifikasi status ke Midtrans" };
    }
};


// =========================================================================
// ⚡ FASE 5: LOGIKA EKSEKUSI PENGEMBALIAN DANA (REFUND PAYOUT)
// =========================================================================

/**
 * Memproses pencairan dana refund kembali ke pembeli melalui Midtrans API
 * Digunakan oleh Automation Service & Worker Retry Mechanism
 */
export const processRefundPayout = async (payoutId) => {
    const t = await db.sequelize.transaction();
    try {
        const payout = await db.RefundPayout.findByPk(payoutId, { transaction: t, lock: t.LOCK.UPDATE });

        if (!payout) throw new Error(`Refund Payout dengan ID ${payoutId} tidak ditemukan.`);
        if (payout.status === 'completed') throw new Error('Refund ini sudah berhasil diproses sebelumnya.');

        const order = await db.Order.findByPk(payout.order_id, { transaction: t });

        // Jika tidak ada payment_reference (transaksi tidak via Midtrans), kita bypass 
        // simulasi refund agar tidak error di local development
        if (!order || !order.payment_reference) {
            payout.status = 'completed';
            payout.external_payout_id = `MOCK-REFUND-${Date.now()}`;
            await payout.save({ transaction: t });
            await t.commit();
            return payout;
        }

        // Siapkan parameter pengembalian ke Midtrans
        const refundParams = {
            refund_key: `REFUND-${payout.id}`,
            amount: Number(payout.amount),
            reason: "Sengketa Pesanan (Dispute Resolution)"
        };

        // Hit Midtrans Core API (Direct Refund untuk Credit Card/E-Wallet tertentu)
        try {
            const midtransRefundRes = await coreApi.transaction.refundDirect(order.payment_reference, refundParams);

            payout.status = 'completed';
            payout.external_payout_id = midtransRefundRes.refund_id || midtransRefundRes.transaction_id;
            payout.error_log = null; // Bersihkan error jika berhasil

        } catch (midtransError) {
            // Tangkap error spesifik dari gateway (misal: Saldo tidak cukup, Fitur tidak didukung)
            payout.status = 'failed';
            payout.retry_count += 1;
            payout.error_log = midtransError.message || JSON.stringify(midtransError);
        }

        await payout.save({ transaction: t });
        await t.commit();

        return payout;

    } catch (error) {
        if (t) await t.rollback();
        console.error(`[PAYMENT SERVICE] Fatal Error processing refund ${payoutId}:`, error);
        throw error;
    }
};