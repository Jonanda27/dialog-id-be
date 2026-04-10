import db from '../models/index.js';

class OrderService {
    /**
     * Membuat pesanan baru dengan validasi stok, toko tunggal, dan penanganan biaya.
     * Menggunakan Pessimistic Locking dan Transaksi ACID.
     */
    static async createOrder(buyerId, payload) {
        const { items, shipping_address } = payload;

        // Memulai Transaksi Database (ACID)
        const t = await db.sequelize.transaction();

        try {
            let subtotal = 0;
            let totalGradingFee = 0;
            const shippingFee = 15000; // Simulasi statis ongkir
            let storeId = null;
            const orderItemsData = [];

            // Loop setiap item dalam keranjang
            for (const item of items) {
                // 1. Pessimistic Lock: Kunci baris produk ini agar tidak bisa dibeli orang lain saat proses ini berjalan
                const product = await db.Product.findByPk(item.product_id, {
                    transaction: t,
                    lock: t.LOCK.UPDATE
                });

                if (!product || !product.is_active) {
                    throw { statusCode: 404, message: `Produk dengan ID ${item.product_id} tidak ditemukan atau tidak aktif.` };
                }

                // Validasi single-store (1 Checkout = 1 Toko)
                if (!storeId) storeId = product.store_id;
                if (storeId !== product.store_id) {
                    throw { statusCode: 400, message: 'Semua produk dalam satu pesanan harus berasal dari toko yang sama.' };
                }

                // 2. Stock Validation
                if (product.stock < item.qty) {
                    throw { statusCode: 400, message: `Stok produk ${product.name} tidak mencukupi. Sisa: ${product.stock}` };
                }

                // 3. Lazy Evaluation: Cek apakah Buyer ini pernah request grading dan sudah dipenuhi oleh Seller
                const gradingRequest = await db.GradingRequest.findOne({
                    where: {
                        buyer_id: buyerId,
                        product_id: product.id,
                        status: 'fulfilled'
                    },
                    transaction: t
                });

                // Jika ada request grading terpenuhi, bebankan biaya 25.000 per jenis barang
                const itemGradingFee = gradingRequest ? 25000 : 0;
                totalGradingFee += itemGradingFee;

                // 4. Kalkulasi Harga
                const itemSubtotal = parseFloat(product.price) * item.qty;
                subtotal += itemSubtotal;

                // Persiapkan data order_items (simpan historical price & grading)
                orderItemsData.push({
                    product_id: product.id,
                    qty: item.qty,
                    price_at_purchase: product.price,
                    grading_at_purchase: product.grading
                });

                // 5. Kurangi Stok Produk
                await product.update({ stock: product.stock - item.qty }, { transaction: t });
            }

            const grandTotal = subtotal + shippingFee + totalGradingFee;

            // 6. Create Order Utama
            const order = await db.Order.create({
                buyer_id: buyerId,
                store_id: storeId,
                subtotal,
                shipping_fee: shippingFee,
                grading_fee: totalGradingFee,
                grand_total: grandTotal,
                status: 'pending_payment',
                shipping_address
            }, { transaction: t });

            // 7. Insert Order Items dengan Order ID yang baru terbuat
            const itemsWithOrderId = orderItemsData.map(item => ({ ...item, order_id: order.id }));
            await db.OrderItem.bulkCreate(itemsWithOrderId, { transaction: t });

            // 8. Create Escrow Record (Penahanan Dana)
            await db.Escrow.create({
                order_id: order.id,
                amount_held: grandTotal,
                status: 'held'
            }, { transaction: t });

            // Jika semua proses di atas sukses tanpa error, COMMIT perubahan permanen ke database
            await t.commit();

            return order;

        } catch (error) {
            // Jika ADA SATU SAJA proses yang gagal, BATALKAN SEMUA perubahan!
            await t.rollback();

            const err = new Error(error.message || 'Terjadi kesalahan sistem saat checkout');
            err.statusCode = error.statusCode || 500;
            throw err;
        }
    }

    /**
     * Mengambil daftar pesanan yang masuk ke toko.
     * Menerapkan Eager Loading untuk detail pembeli dan item produk.
     */
    static async getStoreOrders(storeId, statusFilter) {
        const whereClause = { store_id: storeId };

        // Memungkinkan filter seperti ?status=paid atau ?status=shipped
        if (statusFilter) {
            whereClause.status = statusFilter;
        }

        return await db.Order.findAll({
            where: whereClause,
            include: [
                {
                    model: db.User,
                    as: 'buyer', // Sesuai relasi belongsTo di model Order
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: db.OrderItem,
                    as: 'items', // Sesuai relasi hasMany di model Order
                    include: [
                        {
                            model: db.Product,
                            as: 'product',
                            attributes: ['name', 'format']
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
        // PERBAIKAN ARSITEKTUR: Tidak perlu JOIN ke tabel Store. Cukup ambil ordernya.
        const order = await db.Order.findByPk(orderId);

        if (!order) {
            throw { statusCode: 404, message: 'Pesanan tidak ditemukan.' };
        }

        // Otorisasi Kepemilikan (Memastikan pesanan milik toko yang sedang login)
        if (order.store_id !== storeId) {
            throw { statusCode: 403, message: 'Akses ditolak. Ini bukan pesanan dari toko Anda.' };
        }

        // Validasi State Machine
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
        // Memulai Transaksi Database untuk integritas Finansial
        const t = await db.sequelize.transaction();

        try {
            const order = await db.Order.findByPk(orderId, { transaction: t });
            if (!order) throw { statusCode: 404, message: 'Pesanan tidak ditemukan.' };

            // Otorisasi Kepemilikan Pembeli
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
            // amount_to_seller = (Subtotal + GradingFee) - (AdminFee 3%) + Ongkir
            const subtotal = Number(order.subtotal);
            const gradingFee = Number(order.grading_fee);
            const shippingFee = Number(order.shipping_fee);

            const baseAmount = subtotal + gradingFee;
            const adminFee = baseAmount * 0.03;
            // Sesuai instruksi: Masukkan total bersih + ongkir ke seller untuk simulasi
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