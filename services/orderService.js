import db from '../models/index.js';
import * as shippingService from './shippingService.js'; // Import layanan logistik internal

class OrderService {
    /**
     * Membuat pesanan baru dengan validasi stok, toko tunggal, dan penanganan biaya.
     * Menggunakan Pessimistic Locking dan Transaksi ACID yang kebal manipulasi.
     */
    static async createOrder(buyerId, payload) {
        // ⚡ HARDENING TAHAP 4: Mengekstrak payload terstandarisasi (snake_case)
        const { items, address_id, store_id, courier_code, service_type, shipping_fee } = payload;

        // Memulai Transaksi Database Ekstra Ketat (ACID)
        const t = await db.sequelize.transaction();

        try {
            let subtotal = 0;
            let totalGradingFee = 0;
            const orderItemsData = [];
            const shippingItemsPayload = [];

            // 1. Validasi Keberadaan Alamat Tujuan & Asal untuk Kalkulasi Biteship
            const destinationAddress = await db.Address.findOne({
                where: { id: address_id, user_id: buyerId },
                transaction: t
            });
            if (!destinationAddress) throw { statusCode: 404, message: 'Alamat pengiriman tidak valid atau tidak ditemukan.' };

            const store = await db.Store.findByPk(store_id, {
                include: [{ model: db.Address, as: 'originAddress' }],
                transaction: t
            });
            if (!store || !store.originAddress) throw { statusCode: 404, message: 'Data toko atau alamat asal toko tidak ditemukan.' };

            // 2. Pessimistic Locking & Server-Side Pricing (Mencegah Manipulasi Harga)
            for (const item of items) {
                // ⚡ t.LOCK.UPDATE: Mengunci baris produk. Cegah Race Condition.
                const product = await db.Product.findOne({
                    where: { id: item.product_id, store_id: store.id },
                    lock: t.LOCK.UPDATE,
                    transaction: t
                });

                if (!product || !product.is_active) {
                    throw { statusCode: 404, message: `Produk dengan ID ${item.product_id} tidak ditemukan atau tidak aktif.` };
                }

                // Mencegah Overselling (Stok Habis)
                if (product.stock < item.qty) {
                    throw { statusCode: 400, message: `Stok produk ${product.name} tidak mencukupi. Hanya tersisa: ${product.stock}.` };
                }

                // Bundling Logic: Cek Grading Request yang fulfilled
                const gradingRequest = await db.GradingRequest.findOne({
                    where: { buyer_id: buyerId, product_id: product.id, status: 'fulfilled' },
                    transaction: t
                });

                // Bebankan biaya grading 25.000 jika request grading terpenuhi
                if (gradingRequest) totalGradingFee += 25000;

                // ⚡ Server-Side Calc: Harga dikalikan murni dari Database
                const itemSubtotal = parseFloat(product.price) * item.qty;
                subtotal += itemSubtotal;

                // Persiapkan data order_items
                orderItemsData.push({
                    product_id: product.id,
                    qty: item.qty,
                    price_at_purchase: product.price,
                    grading_at_purchase: product.metadata?.grading || 'Raw'
                });

                // ⚡ CORE FIX TAHAP 4: Siapkan data Fisik Absolut untuk Biteship
                shippingItemsPayload.push({
                    name: product.name,
                    value: Number(product.price), // Biteship menggunakan properti 'value' untuk harga/asuransi
                    weight: product.product_weight,
                    length: product.product_length,
                    width: product.product_width,
                    height: product.product_height,
                    quantity: item.qty
                });

                // Kurangi Stok Secara Aman di dalam transaksi
                await product.update({ stock: product.stock - item.qty }, { transaction: t });
            }

            // 3. ⚡ SHIPPING RE-VALIDATION (The Handshake Check)
            // Backend menembak API Biteship secara internal untuk membuktikan klaim Frontend
            const availableRates = await shippingService.calculateRates(
                store.originAddress.biteship_area_id,
                destinationAddress.biteship_area_id,
                shippingItemsPayload
            );

            const matchedRate = availableRates.find(
                rate => rate.courier_company === courier_code && rate.service_type === service_type
            );

            if (!matchedRate) {
                throw { statusCode: 400, message: 'Layanan kurir yang dipilih tidak tersedia untuk rute ini.' };
            }

            // ⚡ Mismatch Check: Tolak transaksi dan lempar flag 409 Conflict agar Frontend me-refresh
            if (Number(matchedRate.price) !== Number(shipping_fee)) {
                throw {
                    statusCode: 409,
                    message: 'Harga ongkos kirim telah berubah. Silakan muat ulang perhitungan ongkir Anda.'
                };
            }

            const actualShippingFee = matchedRate.price;
            const grandTotal = subtotal + actualShippingFee + totalGradingFee;

            // Merakit alamat lengkap beserta ID/Kode pos dan Info Kurir
            const fullShippingAddress = `[${courier_code.toUpperCase()} - ${service_type.toUpperCase()}] ${destinationAddress.address_detail}, Kec. ${destinationAddress.district}, Kab/Kota. ${destinationAddress.city}, Prov. ${destinationAddress.province}, ${destinationAddress.postal_code}`;

            // 4. Create Order Utama
            const order = await db.Order.create({
                buyer_id: buyerId,
                store_id: store.id,
                subtotal,
                shipping_fee: actualShippingFee,
                grading_fee: totalGradingFee,
                grand_total: grandTotal,
                status: 'pending_payment',
                shipping_address: fullShippingAddress,
                courier_company: courier_code, // Tersimpan permanen di DB
                service_type: service_type     // Tersimpan permanen di DB
            }, { transaction: t });

            // 5. Insert Order Items dengan Order ID yang baru terbuat
            const itemsWithOrderId = orderItemsData.map(item => ({ ...item, order_id: order.id }));
            await db.OrderItem.bulkCreate(itemsWithOrderId, { transaction: t });

            // 6. Create Escrow Record (Penahanan Dana)
            await db.Escrow.create({
                order_id: order.id,
                amount_held: grandTotal,
                status: 'held'
            }, { transaction: t });

            // COMMIT perubahan permanen ke database
            await t.commit();

            return order;

        } catch (error) {
            await t.rollback();
            const err = new Error(error.message || 'Terjadi kesalahan sistem saat checkout');
            err.statusCode = error.statusCode || 500;
            throw err; // Lempar ke Controller untuk ditangkap dan diteruskan ke FE
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