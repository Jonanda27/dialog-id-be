import db from '../models/index.js';
import { Op } from 'sequelize';

export const chatService = {
    // Menyimpan pesan baru ke database (DIUPDATE untuk Media)
    saveMessage: async (senderId, receiverId, storeId, message, fileUrl = null, messageType = 'text') => {
        // Jika storeId tidak ada, jangan crash!
        if (!storeId) {
            throw new Error("Store ID is required");
        }

        const store = await db.Store.findByPk(storeId);
        if (!store) {
            console.error(`Toko dengan ID ${storeId} tidak ditemukan.`);
            return null; 
        }

        const finalReceiverId = receiverId || store.user_id;

        return await db.Chat.create({
            sender_id: senderId,
            receiver_id: finalReceiverId,
            store_id: storeId,
            message: message, // Sekarang bisa null/string kosong dari socket
            message_type: messageType, // Tambahan kolom baru
            file_url: fileUrl,         // Tambahan kolom baru
            is_read: false
        });
    },

    // Mengambil riwayat chat spesifik antara user dan toko
    getChatHistory: async (storeId, userId) => {
        return await db.Chat.findAll({
            where: {
                store_id: storeId,
                [Op.or]: [
                    { sender_id: userId },
                    { receiver_id: userId }
                ]
            },
            order: [['created_at', 'ASC']],
            include: [
                { model: db.User, as: 'sender', attributes: ['id', 'full_name'] }
            ]
        });
    },

    // Mengambil daftar toko yang pernah di-chat oleh user (untuk sidebar)
    getUserChatList: async (userId) => {
        return await db.Chat.findAll({
            where: {
                [Op.or]: [{ sender_id: userId }, { receiver_id: userId }]
            },
            attributes: ['store_id'],
            group: ['store_id', 'store.id'], // Tambahkan store.id agar valid di beberapa dialek SQL
            include: [{ model: db.Store, as: 'store', attributes: ['id', 'name', 'logo_url'] }]
        });
    },

    getPenjualChatList: async (sellerId) => {
        // 1. Cari semua toko yang dimiliki penjual ini
        const stores = await db.Store.findAll({ where: { user_id: sellerId } });
        const storeIds = stores.map(s => s.id);

        if (storeIds.length === 0) return [];

        // 2. Ambil semua pesan untuk toko-toko tersebut
        const chats = await db.Chat.findAll({
            where: { store_id: { [Op.in]: storeIds } },
            attributes: [
                'id', 'sender_id', 'store_id', 'message', 'message_type', 'file_url', 'created_at',
            ],
            order: [['created_at', 'DESC']],
            include: [
                { model: db.User, as: 'sender', attributes: ['id', 'full_name'] }
            ],
        });

        // Filter unik per percakapan
        const uniqueChats = [];
        const seen = new Set();

        for (const chat of chats) {
            const key = `${chat.store_id}-${chat.sender_id}`;
            if (!seen.has(key)) {
                uniqueChats.push(chat);
                seen.add(key);
            }
        }

        return uniqueChats;
    }
};