import db from '../models/index.js';
import { io } from '../app.js';

export const openDispute = async (orderId, buyerId, reason, files) => {
    const t = await db.sequelize.transaction();

    try {
        // 1. Ambil Data Order dengan Pessimistic Lock [cite: 3115]
        const order = await db.Order.findByPk(orderId, { 
    transaction: t, 
    lock: t.LOCK.UPDATE,
    include: [{ 
        model: db.User, 
        as: 'buyer', 
        attributes: ['full_name'],
        required: true // Memaksa INNER JOIN agar aman untuk FOR UPDATE
    }] 
});
        if (!order) throw { statusCode: 404, message: 'Pesanan tidak ditemukan.' }; 

        if (order.buyer_id !== buyerId) throw { statusCode: 403, message: 'Bukan pesanan Anda.' }; 

        // Validasi status pesanan [cite: 3118]
        if (order.status !== 'shipped' && order.status !== 'delivered') {
            throw { statusCode: 400, message: 'Dispute hanya bisa diajukan untuk pesanan yang sudah dikirim.' };
        }

        // 2. Ubah Status Order menjadi 'disputed' [cite: 3119]
        order.status = 'disputed';
        await order.save({ transaction: t });

        // 3. Bekukan Dana Escrow [cite: 3120, 3122]
        const escrow = await db.Escrow.findOne({ where: { order_id: orderId }, transaction: t, lock: t.LOCK.UPDATE });
        if (!escrow || escrow.status !== 'held') {
            throw { statusCode: 400, message: 'Dana Escrow tidak valid atau sudah cair.' };
        }
        escrow.status = 'frozen';
        await escrow.save({ transaction: t }); 

        // 4. Buat Record Dispute [cite: 3123]
        const dispute = await db.Dispute.create({
            order_id: orderId,
            buyer_id: buyerId,
            store_id: order.store_id,
            reason: reason,
            status: 'open'
        }, { transaction: t });

        // 5. Simpan Media Bukti (Cloudinary Integration) [cite: 3124]
        if (files && files.length > 0) {
            const mediaData = files.map(file => ({
                dispute_id: dispute.id,
                uploader_id: buyerId,
                media_url: file.path // Path dari Cloudinary [cite: 3125]
            }));

            await db.DisputeMedia.bulkCreate(mediaData, { transaction: t });
        }

        // Commit transaksi database [cite: 3127]
        await t.commit();

        // --- ⚡ LOGIKA REAL-TIME NOTIFICATION (NEW_DISPUTE) ---
        // Kirim notifikasi ke room toko spesifik agar seller menerima pesan secara real-time
        // Format room mengikuti standar chatSocket: `store:${storeId}` 
        const storeId = order.store_id;
        
        // Memancarkan sinyal ke namespace chat agar Navbar Seller (FE) bisa menangkapnya
        io.of('/chat').to(`store:${storeId}`).emit('NEW_DISPUTE', {
            orderId: orderId,
            disputeId: dispute.id,
            reason: reason,
            buyerName: order.buyer?.full_name || "Seorang Pembeli",
            timestamp: new Date()
        });

        return dispute; 
    } catch (error) {
        // Batalkan semua perubahan jika terjadi error [cite: 3128]
        if (t) await t.rollback();
        const err = new Error(error.message || 'Gagal membuka dispute.');
        err.statusCode = error.statusCode || 500;
        throw err;
    }
};

/**
 * Resolusi sengketa oleh Admin
 * @param {string} disputeId 
 * @param {string} resolutionType - 'refund_full', 'reject_buyer', 'refund_partial'
 * @param {string} adminNotes 
 * @param {number} refundAmount - Khusus untuk refund_partial
 */
export const resolveDispute = async (disputeId, resolutionType, adminNotes, refundAmount = 0) => {
    const t = await db.sequelize.transaction();
    try {
        // 1. Ambil ID terkait terlebih dahulu tanpa LOCK
        const initialDispute = await db.Dispute.findByPk(disputeId);
        if (!initialDispute) throw { statusCode: 404, message: 'Dispute tidak ditemukan.' };
        if (initialDispute.status === 'resolved') throw { statusCode: 400, message: 'Dispute ini sudah diselesaikan.' };

        // 2. Lakukan Pessimistic Lock secara terpisah pada tabel utama (DIPERBAIKI)
        // Kita kunci satu per satu tanpa include yang kompleks untuk menghindari error Outer Join
        const dispute = await db.Dispute.findByPk(disputeId, { transaction: t, lock: t.LOCK.UPDATE });
        const order = await db.Order.findByPk(dispute.order_id, { transaction: t, lock: t.LOCK.UPDATE });
        const escrow = await db.Escrow.findOne({
            where: { order_id: dispute.order_id },
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        // 3. Ambil data pendukung (items) secara terpisah (tidak perlu lock karena order sudah dikunci)
        const orderItems = await db.OrderItem.findAll({
            where: { order_id: order.id },
            transaction: t
        });

        // Update status Dispute
        dispute.status = 'resolved';
        dispute.admin_decision_notes = adminNotes;
        await dispute.save({ transaction: t });

        const subtotal = Number(order.subtotal);
        const gradingFee = Number(order.grading_fee);
        const shippingFee = Number(order.shipping_fee);
        const grandTotal = Number(order.grand_total);

        // ==========================================
        // SKENARIO A: REFUND PENUH (Buyer Menang)
        // ==========================================
        if (resolutionType === 'refund_full') {
            order.status = 'cancelled';
            escrow.status = 'refunded';

            // Kembalikan Stok secara atomik menggunakan orderItems yang sudah diambil
            for (const item of orderItems) {
                const product = await db.Product.findByPk(item.product_id, { transaction: t, lock: t.LOCK.UPDATE });
                if (product) {
                    await product.update({ stock: product.stock + item.qty }, { transaction: t });
                }
            }
        }
        // ==========================================
        // SKENARIO B: TOLAK KOMPLAIN (Seller Menang)
        // ==========================================
        else if (resolutionType === 'reject_buyer') {
            order.status = 'completed';
            escrow.status = 'released';

            const baseAmount = subtotal + gradingFee;
            const adminFee = baseAmount * 0.03;
            const netToSeller = (baseAmount - adminFee) + shippingFee;

            await db.WalletTransaction.create({
                store_id: order.store_id,
                type: 'CREDIT',
                amount: netToSeller,
                source: 'dispute_won',
                reference_id: dispute.id
            }, { transaction: t });

            const store = await db.Store.findByPk(order.store_id, { transaction: t, lock: t.LOCK.UPDATE });
            store.balance = Number(store.balance) + netToSeller;
            await store.save({ transaction: t });
        }
        // ==========================================
        // SKENARIO C: REFUND PARSIAL
        // ==========================================
        else if (resolutionType === 'refund_partial') {
            if (refundAmount <= 0 || refundAmount >= grandTotal) {
                throw { statusCode: 400, message: 'Nominal refund parsial tidak valid.' };
            }

            order.status = 'completed';
            escrow.status = 'released';

            const remainingForSeller = grandTotal - refundAmount;
            const adminFee = remainingForSeller * 0.03;
            const netToSeller = remainingForSeller - adminFee;

            await db.WalletTransaction.create({
                store_id: order.store_id,
                type: 'CREDIT',
                amount: netToSeller,
                source: 'dispute_partial',
                reference_id: dispute.id
            }, { transaction: t });

            const store = await db.Store.findByPk(order.store_id, { transaction: t, lock: t.LOCK.UPDATE });
            store.balance = Number(store.balance) + netToSeller;
            await store.save({ transaction: t });
        } else {
            throw { statusCode: 400, message: 'Tipe resolusi tidak dikenali.' };
        }

        await order.save({ transaction: t });
        await escrow.save({ transaction: t });

        await t.commit();
        return { dispute, order_status: order.status, resolution: resolutionType };

    } catch (error) {
        if (t) await t.rollback();
        const err = new Error(error.message || 'Gagal menyelesaikan dispute.');
        err.statusCode = error.statusCode || 500;
        throw err;
    }
};

export const getMyDisputes = async (userId, role) => {
    // 1. Tentukan kondisi filter berdasarkan peran (Seller/Buyer) [cite: 1211, 1212]
    const whereCondition = role === 'seller' 
        ? { store_id: (await db.Store.findOne({ where: { user_id: userId } }))?.id }
        : { buyer_id: userId };

    return await db.Dispute.findAll({
        where: whereCondition,
        // 2. Tambahkan kolom secara eksplisit jika perlu, 
        // atau biarkan default untuk mengambil semua kolom termasuk return_tracking_number 
        attributes: [
            'id', 
            'order_id', 
            'buyer_id', 
            'store_id', 
            'reason', 
            'status', 
            'return_tracking_number', // <-- Kolom yang Anda minta
            'admin_decision_notes', 
            'created_at', 
            'updated_at'
        ],
        include: [
            { model: db.Order, as: 'order' }, 
            { model: db.DisputeMedia, as: 'media' },
            { 
                model: db.User, 
                as: 'buyer', 
                attributes: ['id', 'full_name', 'email'] // Mengambil data buyer tertentu 
            }
        ],
        order: [['created_at', 'DESC']] 
    });
};

export const acceptReturn = async (disputeId, storeId) => {
    const dispute = await db.Dispute.findByPk(disputeId);
    if (!dispute || dispute.store_id !== storeId) {
        throw { statusCode: 403, message: 'Akses ditolak.' };
    }
    
    // Update status dispute agar buyer bisa input resi
    dispute.status = 'returning'; 
    await dispute.save();
    return dispute;
};  

export const submitReturnResi = async (disputeId, buyerId, trackingNumber) => {
    const dispute = await db.Dispute.findByPk(disputeId);
    
    if (!dispute) {
        throw { statusCode: 404, message: 'Data sengketa tidak ditemukan.' };
    }
    
    if (dispute.buyer_id !== buyerId) {
        throw { statusCode: 403, message: 'Akses ditolak. Ini bukan komplain Anda.' };
    }

    // ⚡ PERBAIKAN: Masukkan data dan WAJIB panggil .save() untuk persist ke DB
    dispute.return_tracking_number = trackingNumber;
    dispute.status = 'returning'; 
    
    await dispute.save(); 

    return dispute;
};

export const confirmReturnReceived = async (disputeId, storeId) => {
    const dispute = await db.Dispute.findByPk(disputeId);
    
    if (!dispute || dispute.store_id !== storeId) {
        throw { statusCode: 403, message: 'Akses ditolak atau sengketa tidak ditemukan.' };
    }

    if (dispute.status !== 'returning') {
        throw { statusCode: 400, message: 'Status sengketa tidak valid untuk konfirmasi penerimaan.' };
    }

    // Gunakan fungsi resolveDispute yang sudah ada untuk skenario REFUND PENUH
    // Ini otomatis membatalkan order, refund escrow, dan kembalikan stok.
    return await resolveDispute(
        disputeId, 
        'refund_full', 
        'Barang retur telah diterima oleh penjual. Refund disetujui otomatis.'
    );
};