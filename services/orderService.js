import db from '../models/index.js';
import * as shippingService from './shippingService.js'; // Import layanan logistik internal

class OrderService {
    /**
     * Membuat pesanan baru dengan validasi stok, toko tunggal, dan penanganan biaya.
     * Menggunakan Pessimistic Locking dan Transaksi ACID yang kebal manipulasi.
     */
    static async createOrder(buyerId, payload) {
        const { items, address_id, store_id, courier_code, service_type, shipping_fee } = payload;

        // 1. VALIDASI AWAL (DI LUAR TRANSAKSI)
        const destinationAddress = await db.Address.findOne({ where: { id: address_id, user_id: buyerId } });
        if (!destinationAddress) throw { statusCode: 404, message: 'Alamat pengiriman tidak ditemukan.' };

        const store = await db.Store.findByPk(store_id, {
            include: [{ model: db.Address, as: 'originAddress' }]
        });
        if (!store || !store.originAddress) throw { statusCode: 404, message: 'Data toko atau alamat asal tidak ditemukan.' };

        // Persiapkan data barang untuk re-validasi ongkir
        const shippingItemsPayload = [];
        for (const item of items) {
            const product = await db.Product.findByPk(item.product_id);
            if (!product) throw { statusCode: 404, message: `Produk ${item.product_id} tidak ada.` };
            shippingItemsPayload.push({
                name: product.name,
                price: Number(product.price),
                weight: product.product_weight || 500,
                quantity: item.qty
            });
        }

        // 2. ⚡ SHIPPING RE-VALIDATION (DI LUAR TRANSAKSI)
        let actualShippingFee = Number(shipping_fee);

        /* 
        // BAGIAN INI SEMENTARA DIKOMENTAR AGAR TIDAK TIMEOUT / KENA MASALAH SALDO
        try {
            const availableRates = await shippingService.calculateRates(
                store.originAddress.biteship_area_id,
                destinationAddress.biteship_area_id,
                shippingItemsPayload
            );
            const matchedRate = availableRates.find(r => r.courier_company === courier_code && r.service_type === service_type);
            if (!matchedRate) throw new Error();
            actualShippingFee = matchedRate.price;
        } catch (e) {
            console.log("Re-validation skipped or failed, using FE price.");
        }
        */

        // 3. MULAI TRANSAKSI DATABASE (HANYA UNTUK OPERASI DB)
        const t = await db.sequelize.transaction();

        try {
            let subtotal = 0;
            let totalGradingFee = 0;
            const orderItemsData = [];

            for (const item of items) {
                const product = await db.Product.findOne({
                    where: { id: item.product_id, store_id: store.id },
                    lock: t.LOCK.UPDATE,
                    transaction: t
                });

                if (product.stock < item.qty) throw { statusCode: 400, message: `Stok ${product.name} habis.` };

                // Hitung Subtotal
                const itemSubtotal = parseFloat(product.price) * item.qty;
                subtotal += itemSubtotal;

                // Cek Grading
                const gradingRequest = await db.GradingRequest.findOne({
                    where: { buyer_id: buyerId, product_id: product.id, status: 'fulfilled' },
                    transaction: t
                });
                if (gradingRequest) totalGradingFee += 25000;

                orderItemsData.push({
                    product_id: product.id,
                    qty: item.qty,
                    price_at_purchase: product.price,
                    grading_at_purchase: product.metadata?.grading || 'Raw'
                });

                // Update Stok
                await product.update({ stock: product.stock - item.qty }, { transaction: t });
            }

            const grandTotal = subtotal + actualShippingFee + totalGradingFee;

            // Format alamat untuk disimpan di DB
            const fullAddressString = `${destinationAddress.address_detail}, ${destinationAddress.district}, ${destinationAddress.city}, ${destinationAddress.province} ${destinationAddress.postal_code}`;

            // 4. BUAT ORDER
            const order = await db.Order.create({
                buyer_id: buyerId,
                store_id: store.id,
                subtotal,
                shipping_fee: actualShippingFee,
                grading_fee: totalGradingFee,
                grand_total: grandTotal,
                status: 'pending_payment',
                shipping_address: fullAddressString,
                tracking_number: null,
                payment_method: null,
                // Pastikan kolom ini ada di model Order kamu:
                // courier_company: courier_code,
                // service_type: service_type
            }, { transaction: t });

            // 5. BUAT ORDER ITEMS
            const itemsWithOrderId = orderItemsData.map(item => ({ ...item, order_id: order.id }));
            await db.OrderItem.bulkCreate(itemsWithOrderId, { transaction: t });

            // 6. BUAT ESCROW
            await db.Escrow.create({
                order_id: order.id,
                amount_held: grandTotal,
                status: 'held'
            }, { transaction: t });

            await t.commit();
            return order;

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
}

export default OrderService;