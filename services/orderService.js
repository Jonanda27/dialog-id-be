import db from '../models/index.js';
import * as shippingService from './shippingService.js'; // Import layanan logistik internal

class OrderService {
    /**
     * Membuat pesanan baru dengan validasi stok, toko tunggal, dan penanganan biaya.
     * Menggunakan Pessimistic Locking dan Transaksi ACID yang kebal manipulasi.
     */
    static async createOrder(buyerId, payload) {
        const { address_id, orders } = payload;

        // 1. VALIDASI ALAMAT (DI LUAR TRANSAKSI)
        const destinationAddress = await db.Address.findOne({
            where: { id: address_id, user_id: buyerId }
        });
        if (!destinationAddress) throw { statusCode: 404, message: 'Alamat pengiriman tidak ditemukan.' };

        const fullAddressString = `${destinationAddress.address_detail}, ${destinationAddress.district}, ${destinationAddress.city}, ${destinationAddress.province} ${destinationAddress.postal_code}`;

        // 2. MULAI TRANSAKSI
        const t = await db.sequelize.transaction();

        try {
            let totalGrandTotal = 0;
            const createdOrders = [];

            // --- TAHAP A: BUAT MASTER BILLING ---
            const billing = await db.Billing.create({
                buyer_id: buyerId,
                total_amount: 0,
                status: 'unpaid'
            }, { transaction: t });

            // --- TAHAP B: LOOPING PER TOKO ---
            for (const storeOrder of orders) {
                const { store_id, courier_code, service_type, shipping_fee, items } = storeOrder;

                const store = await db.Store.findByPk(store_id, { transaction: t });
                if (!store) throw { statusCode: 404, message: `Toko ${store_id} tidak ditemukan.` };

                let subtotal = 0;
                let storeGradingFee = 0;
                const orderItemsData = [];

                // --- TAHAP C: LOOPING ITEM PER TOKO ---
                for (const item of items) {
                    const product = await db.Product.findOne({
                        where: { id: item.product_id, store_id: store.id },
                        lock: t.LOCK.UPDATE, // Tetap gunakan lock untuk validasi yang akurat
                        transaction: t
                    });

                    if (!product) throw { statusCode: 404, message: `Produk ${item.product_id} tidak ditemukan di toko ini.` };

                    // VALIDASI STOK (Tetap ada agar tidak bisa checkout jika kosong)
                    if (product.stock < item.qty) throw { statusCode: 400, message: `Stok ${product.name} tidak mencukupi.` };

                    subtotal += parseFloat(product.price) * item.qty;

                    // (FIX) LOGIKA GRADING:
                    // Gunakan nilai yang di-inject dari Controller. Mencegah Double Query & Hardcode Price.
                    if (item.apply_grading_fee) {
                        storeGradingFee += item.grading_fee_value || 0;
                    }

                    
                    orderItemsData.push({
                        product_id: product.id,
                        qty: item.qty,
                        price_at_purchase: product.price,
                        grading_at_purchase: product.metadata?.grading || 'Raw'
                    });

                    // PENGURANGAN STOK DIHAPUS DARI SINI
                    // Logika dipindah ke handleMidtransNotification
                }

                const storeGrandTotal = subtotal + Number(shipping_fee) + storeGradingFee;
                totalGrandTotal += storeGrandTotal;

                // --- TAHAP D: BUAT PESANAN (ORDER) PER TOKO ---
                const order = await db.Order.create({
                    billing_id: billing.id,
                    buyer_id: buyerId,
                    store_id: store.id,
                    subtotal,
                    shipping_fee,
                    grading_fee: storeGradingFee,
                    grand_total: storeGrandTotal,
                    status: 'pending_payment',
                    shipping_address: fullAddressString,
                    courier_company: courier_code,
                    service_type: service_type
                }, { transaction: t });

                // Simpan Item Pesanan
                const itemsWithOrderId = orderItemsData.map(oi => ({ ...oi, order_id: order.id }));
                await db.OrderItem.bulkCreate(itemsWithOrderId, { transaction: t });

                // Simpan ke Escrow per Order
                await db.Escrow.create({
                    order_id: order.id,
                    amount_held: storeGrandTotal,
                    status: 'held'
                }, { transaction: t });

                createdOrders.push(order);
            }

            // --- TAHAP E: UPDATE TOTAL DI MASTER BILLING ---
            await billing.update({ total_amount: totalGrandTotal }, { transaction: t });

            await t.commit();

            return {
                billing_id: billing.id,
                grand_total: totalGrandTotal,
                orders: createdOrders
            };

        } catch (error) {
            await t.rollback();
            throw error;
        }
    }

    /**
     * Mengambil detail spesifik pesanan (Digunakan oleh halaman Pembayaran)
     */
    static async getOrderById(orderId, userId) {
        const order = await db.Order.findByPk(orderId, {
            include: [
                { model: db.User, as: 'buyer', attributes: ['id', 'full_name', 'email'] },
                { model: db.Store, as: 'store' },
                {
                    model: db.OrderItem,
                    as: 'items',
                    include: [
                        { model: db.Product, as: 'product', attributes: ['id', 'name', 'price'] }
                    ]
                }
            ]
        });

        if (!order) {
            throw { statusCode: 404, message: 'Pesanan tidak ditemukan.' };
        }

        // Otorisasi: Hanya pembeli atau pemilik toko yang boleh melihat detail ini
        if (order.buyer_id !== userId && order.store_id !== userId) {
            throw { statusCode: 403, message: 'Akses ditolak.' };
        }

        return order;
    }

    /**
     * Mengambil riwayat pesanan milik pembeli (Buyer)
     */
    static async getBuyerOrders(buyerId, statusFilter) {
        const whereClause = { buyer_id: buyerId };
        if (statusFilter) whereClause.status = statusFilter;

        return await db.Order.findAll({
            where: whereClause,
            include: [
                { model: db.Store, as: 'store' },
                {
                    model: db.OrderItem,
                    as: 'items',
                    include: [
                        { model: db.Product, as: 'product', attributes: ['id', 'name', 'price'] }
                    ]
                }
            ],
            order: [['created_at', 'DESC']]
        });
    }

    /**
     * Mengambil daftar pesanan yang masuk ke toko.
     */
    static async getStoreOrders(storeId, statusFilter) {
        const whereClause = { store_id: storeId };
        if (statusFilter) whereClause.status = statusFilter;

        return await db.Order.findAll({
            where: whereClause,
            include: [
                {
                    model: db.User,
                    as: 'buyer',
                    attributes: ['id', 'full_name', 'email']
                },
                {
                    model: db.OrderItem,
                    as: 'items',
                    include: [
                        {
                            model: db.Product,
                            as: 'product',
                            attributes: ['id', 'name', 'price', 'metadata']
                        }
                    ]
                }
            ],
            order: [['created_at', 'DESC']]
        });
    }

    /**
     * Memproses pengiriman pesanan dan input resi.
     */
    static async shipOrder(orderId, storeId, trackingNumber) {
        const order = await db.Order.findByPk(orderId);

        if (!order) {
            throw { statusCode: 404, message: 'Pesanan tidak ditemukan.' };
        }

        if (order.store_id !== storeId) {
            throw { statusCode: 403, message: 'Akses ditolak. Ini bukan pesanan dari toko Anda.' };
        }

        if (order.status !== 'paid' && order.status !== 'processing') {
            throw { statusCode: 400, message: `Tidak dapat mengirim pesanan dengan status '${order.status}'.` };
        }

        order.tracking_number = trackingNumber;
        order.status = 'shipped';
        await order.save();

        return order;
    }

    /**
     * Menyelesaikan pesanan, merilis dana Escrow, dan mengupdate saldo dompet toko.
     * Menggunakan Transaksi ACID.
     */
    static async completeOrder(orderId, buyerId) {
        const t = await db.sequelize.transaction();

        try {
            const order = await db.Order.findByPk(orderId, { transaction: t });
            if (!order) throw { statusCode: 404, message: 'Pesanan tidak ditemukan.' };

            if (order.buyer_id !== buyerId) {
                throw { statusCode: 403, message: 'Akses ditolak. Anda bukan pembeli pesanan ini.' };
            }

            if (order.status !== 'shipped' && order.status !== 'delivered') {
                throw { statusCode: 400, message: 'Pesanan belum dikirim, tidak dapat diselesaikan.' };
            }

            // 1. Update Status Order
            order.status = 'completed';
            await order.save({ transaction: t });

            // 2. Rilis Dana Escrow
            const escrow = await db.Escrow.findOne({ where: { order_id: orderId }, transaction: t });
            if (!escrow || escrow.status !== 'held') {
                throw { statusCode: 400, message: 'Dana escrow tidak valid atau sudah diproses.' };
            }
            escrow.status = 'released';
            await escrow.save({ transaction: t });

            // 3. Kalkulasi Mutasi Finansial
            const subtotal = Number(order.subtotal);
            const gradingFee = Number(order.grading_fee);
            const shippingFee = Number(order.shipping_fee);

            const baseAmount = subtotal + gradingFee;
            const adminFee = baseAmount * 0.03;
            const netToSeller = (baseAmount - adminFee) + shippingFee;

            // 4. Catat Mutasi ke Wallet Transactions (CREDIT)
            await db.WalletTransaction.create({
                store_id: order.store_id,
                type: 'CREDIT',
                amount: netToSeller,
                source: 'order_release',
                reference_id: order.id
            }, { transaction: t });

            // 5. Update Saldo Toko (Store Balance)
            const store = await db.Store.findByPk(order.store_id, { transaction: t, lock: t.LOCK.UPDATE });
            store.balance = Number(store.balance) + netToSeller;
            await store.save({ transaction: t });

            // Commit semua perubahan permanen
            await t.commit();
            return order;

        } catch (error) {
            await t.rollback();
            const err = new Error(error.message || 'Gagal menyelesaikan pesanan.');
            err.statusCode = error.statusCode || 500;
            throw err;
        }
    }

    static async getAllOrdersForAdmin(statusFilter) {
        const whereClause = {};
        if (statusFilter) whereClause.status = statusFilter;

        return await db.Order.findAll({
            where: whereClause,
            include: [
                {
                    model: db.User,
                    as: 'buyer',
                    attributes: ['id', 'full_name', 'email']
                },
                {
                    model: db.Store,
                    as: 'store',
                    attributes: ['id', 'name']
                },
                {
                    model: db.OrderItem,
                    as: 'items',
                    include: [
                        {
                            model: db.Product,
                            as: 'product',
                            attributes: ['id', 'name', 'price']
                        }
                    ]
                }
            ],
            order: [['created_at', 'DESC']]
        });
    }
}

export default OrderService;