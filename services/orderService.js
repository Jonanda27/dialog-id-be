import db from '../models/index.js';

class OrderService {
    /**
     * Membuat pesanan baru dengan validasi stok, toko tunggal, dan penanganan biaya.
     * ⚡ MENGGUNAKAN PESSIMISTIC LOCKING UNTUK MENCEGAH OVERSELLING ⚡
     */
    static async createOrder(buyerId, payload) {
        const { items, shipping_address, shipping_fee = 15000 } = payload; // Ongkir bisa dari payload hasil kalkulasi shippingService

        // Memulai Transaksi Database (ACID)
        const t = await db.sequelize.transaction();

        try {
            let subtotal = 0;
            let totalGradingFee = 0;
            let storeId = null;
            const orderItemsData = [];

            // Loop setiap item dalam keranjang
            for (const item of items) {
                // 1. PESSIMISTIC LOCK: Kunci baris produk ini. 
                // Jika Kolektor B mencoba membeli barang ini, kuerinya akan "menunggu" sampai Transaksi Kolektor A selesai.
                const product = await db.Product.findByPk(item.product_id, {
                    transaction: t,
                    lock: t.LOCK.UPDATE
                });

                if (!product || product.metadata?.status !== 'active') {
                    throw { statusCode: 404, message: `Produk dengan ID ${item.product_id} tidak ditemukan atau sudah tidak aktif.` };
                }

                // Validasi single-store (1 Checkout = 1 Toko)
                if (!storeId) storeId = product.store_id;
                if (storeId !== product.store_id) {
                    throw { statusCode: 400, message: 'Semua produk dalam satu pesanan harus berasal dari toko yang sama.' };
                }

                // 2. STOCK VALIDATION (Pencegahan Minus)
                if (product.stock < item.qty) {
                    throw { statusCode: 400, message: `Maaf, stok ${product.name} tidak mencukupi (Sisa: ${product.stock}). Mungkin baru saja dibeli orang lain.` };
                }

                // 3. Lazy Evaluation: Cek request grading
                const gradingRequest = await db.GradingRequest.findOne({
                    where: {
                        buyer_id: buyerId,
                        product_id: product.id,
                        status: 'fulfilled'
                    },
                    transaction: t
                });

                const itemGradingFee = gradingRequest ? 25000 : 0;
                totalGradingFee += itemGradingFee;

                // 4. Kalkulasi Harga
                const itemSubtotal = parseFloat(product.price) * item.qty;
                subtotal += itemSubtotal;

                // 5. Persiapkan data order_items (ADAPTASI JSONB METADATA)
                // Mengambil nilai grading dari metadata (bisa media_grading untuk audio, atau physical_condition untuk gear)
                const itemGrading = product.metadata?.media_grading || product.metadata?.physical_condition || 'N/A';

                orderItemsData.push({
                    product_id: product.id,
                    qty: item.qty,
                    price_at_purchase: product.price,
                    grading_at_purchase: itemGrading // <-- Menggunakan data dari JSONB
                });

                // 6. KURANGI STOK PRODUK (Aman dari race condition karena sudah di-lock)
                await product.update({ stock: product.stock - item.qty }, { transaction: t });
            }

            const grandTotal = subtotal + shippingFee + totalGradingFee;

            // 7. Create Order Utama
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

            // 8. Insert Order Items dengan Order ID yang baru terbuat
            const itemsWithOrderId = orderItemsData.map(item => ({ ...item, order_id: order.id }));
            await db.OrderItem.bulkCreate(itemsWithOrderId, { transaction: t });

            // 9. Create Escrow Record (Penahanan Dana)
            await db.Escrow.create({
                order_id: order.id,
                amount_held: grandTotal,
                status: 'held'
            }, { transaction: t });

            // JIKA SEMUA SUKSES: Bebaskan lock dan simpan permanen!
            await t.commit();

            return order;

        } catch (error) {
            // JIKA ADA 1 SAJA YANG GAGAL: Batalkan semua (Rollback) & lepaskan lock!
            await t.rollback();

            const err = new Error(error.message || 'Terjadi kesalahan sistem saat checkout');
            err.statusCode = error.statusCode || 500;
            throw err; // Lempar ke Controller
        }
    }

    /**
     * Mengambil daftar pesanan yang masuk ke toko.
     */
    static async getStoreOrders(storeId, statusFilter) {
        const whereClause = { store_id: storeId };

        if (statusFilter) {
            whereClause.status = statusFilter;
        }

        return await db.Order.findAll({
            where: whereClause,
            include: [
                {
                    model: db.User,
                    as: 'buyer', // Sesuai relasi belongsTo di model Order
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

        if (!order) throw { statusCode: 404, message: 'Pesanan tidak ditemukan.' };
        if (order.store_id !== storeId) throw { statusCode: 403, message: 'Akses ditolak. Ini bukan pesanan dari toko Anda.' };

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
            if (order.buyer_id !== buyerId) throw { statusCode: 403, message: 'Akses ditolak. Anda bukan pembeli pesanan ini.' };

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

            // 4. Catat Mutasi Finansial (CREDIT)
            await db.WalletTransaction.create({
                store_id: order.store_id,
                type: 'CREDIT',
                amount: netToSeller,
                source: 'order_release',
                reference_id: order.id
            }, { transaction: t });

            // 5. Update Saldo Toko dengan Pessimistic Lock
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
}

export default OrderService;