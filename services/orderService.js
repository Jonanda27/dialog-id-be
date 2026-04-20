import db from '../models/index.js';
import * as shippingService from './shippingService.js'; // Import layanan logistik internal

class OrderService {
    /**
     * Membuat pesanan baru dengan validasi stok, toko tunggal, dan penanganan biaya.
     * Menggunakan Pessimistic Locking dan Transaksi ACID yang kebal manipulasi.
     */
   static async createOrder(buyerId, payload) {
        const { address_id, orders } = payload;

        // 1. Validasi awal payload
        if (!orders || !Array.isArray(orders)) {
            throw { statusCode: 400, message: "Payload orders harus berupa array." };
        }

        const destinationAddress = await db.Address.findOne({ 
            where: { id: address_id, user_id: buyerId } 
        });
        if (!destinationAddress) throw { statusCode: 404, message: 'Alamat pengiriman tidak ditemukan.' };

        const fullAddressString = `${destinationAddress.address_detail}, ${destinationAddress.district}, ${destinationAddress.city}, ${destinationAddress.province} ${destinationAddress.postal_code}`;

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

            // --- TAHAP B: LOOPING PER TOKO (MULTI-STORE SPLIT) ---
            for (const storeOrder of orders) {
                const { store_id, courier_code, service_type, shipping_fee, items } = storeOrder;

                if (!items || !Array.isArray(items)) {
                    throw { statusCode: 400, message: `Items tidak ditemukan untuk store ${store_id}` };
                }

                const store = await db.Store.findByPk(store_id, { transaction: t });
                if (!store) throw { statusCode: 404, message: `Toko ${store_id} tidak ditemukan.` };

                let subtotal = 0;
                let storeGradingFee = 0;
                const orderItemsData = [];
                const productsRequiringOrderIdUpdate = [];

                // --- TAHAP C: LOOPING ITEM PER TOKO ---
                for (const item of items) {
                    const product = await db.Product.findOne({
                        where: { id: item.product_id, store_id: store.id },
                        transaction: t,
                        lock: t.LOCK.UPDATE // Pessimistic locking untuk validasi stok
                    });

                    if (!product) throw { statusCode: 404, message: `Produk ${item.product_id} tidak ditemukan.` };
                    if (product.stock < item.qty) throw { statusCode: 400, message: `Stok ${product.name} habis.` };

                    subtotal += parseFloat(product.price) * item.qty;

                    /**
                     * ⚡ LOGIKA BIAYA GRADING:
                     * Sistem mencari tiket grading milik buyer untuk produk ini.
                     * Hanya kenakan biaya jika statusnya 'MEDIA_READY' (siap dibayar pertama kali).
                     * Jika tiket berstatus 'COMPLETED', maka itemGradingFee tetap 0.
                     */
                    const gradingRequest = await db.GradingRequest.findOne({
                        where: { 
                            buyer_id: buyerId, 
                            product_id: product.id, 
                            status: 'MEDIA_READY' 
                        },
                        transaction: t
                    });

                    let itemGradingFee = 0;
                    if (gradingRequest) {
                        itemGradingFee = 25000;
                        storeGradingFee += itemGradingFee;
                        // Tandai produk ini untuk dihubungkan ke order_id nanti
                        productsRequiringOrderIdUpdate.push(product.id);
                    }

                    const metadata = typeof product.metadata === 'string' 
                        ? JSON.parse(product.metadata || '{}') 
                        : (product.metadata || {});

                    orderItemsData.push({
                        product_id: product.id,
                        qty: item.qty,
                        price_at_purchase: product.price,
                        grading_at_purchase: metadata.grading || 'Raw',
                        grading_fee: itemGradingFee // Disimpan di level OrderItem
                    });
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

                // --- TAHAP E: UPDATE ORDER_ID PADA TIKET GRADING ---
                // Ini krusial agar PaymentService bisa mengubah status tiket ke COMPLETED saat lunas
                if (productsRequiringOrderIdUpdate.length > 0) {
                    await db.GradingRequest.update(
                        { order_id: order.id },
                        { 
                            where: { 
                                buyer_id: buyerId, 
                                product_id: productsRequiringOrderIdUpdate,
                                status: 'MEDIA_READY'
                            },
                            transaction: t 
                        }
                    );
                }

                // Simpan detail item pesanan
                const itemsWithOrderId = orderItemsData.map(oi => ({ ...oi, order_id: order.id }));
                await db.OrderItem.bulkCreate(itemsWithOrderId, { transaction: t });

                // Catat ke Escrow
                await db.Escrow.create({
                    order_id: order.id,
                    amount_held: storeGrandTotal,
                    status: 'held'
                }, { transaction: t });

                createdOrders.push(order);
            }

            // --- TAHAP F: UPDATE TOTAL AKHIR PADA BILLING ---
            await billing.update({ total_amount: totalGrandTotal }, { transaction: t });

            await t.commit();

            return {
                billing_id: billing.id,
                grand_total: totalGrandTotal,
                orders: createdOrders
            };

        } catch (error) {
            if (t) await t.rollback();
            console.error("DETAILED ERROR BACKEND:", error);
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
     * ⚡ BARU: Mengambil detail spesifik pesanan (Digunakan oleh halaman Pembayaran)
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
     * ⚡ BARU: Mengambil riwayat pesanan milik pembeli (Buyer)
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
        if (statusFilter) whereClause.status = statusFilter;

        return await db.Order.findAll({
            where: whereClause,
            include: [
                {
                    model: db.User,
                    as: 'buyer',
                    as: 'buyer',
                    attributes: ['id', 'full_name', 'email']
                },
                {
                    model: db.OrderItem,
                    as: 'items',
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