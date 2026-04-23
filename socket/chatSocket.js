// socket/chatSocket.js
import { chatService } from '../services/chatService.js';
import jwt from 'jsonwebtoken';

export default function initializeChatSocket(io) {
    const chatNs = io.of('/chat');

    chatNs.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error: No token provided'));

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded; 
            next();
        } catch (err) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    chatNs.on('connection', (socket) => {
        const userId = socket.user.id;
        console.log(`User connected: ${userId}`);

        socket.on('JOIN_STORE', (storeId) => {
            socket.join(`store:${storeId}`);
        });

        socket.on('SEND_MESSAGE', async (payload) => {
            // DIUBAH: Menambahkan fileUrl dan messageType ke dalam payload
            const { storeId, message, receiverId, fileUrl, messageType } = payload;
            const senderId = socket.user.id;

            try {
                // DIUBAH: Mengirimkan parameter tambahan ke service
                // Urutan parameter harus sesuai dengan definisi di chatService.saveMessage
                const chat = await chatService.saveMessage(
                    senderId, 
                    receiverId, 
                    storeId, 
                    message, 
                    fileUrl, 
                    messageType
                );

                // Broadcast ke room toko agar pengirim dan penerima menerima pesan real-time
                chatNs.to(`store:${storeId}`).emit('RECEIVE_MESSAGE', chat);
            } catch (error) {
                console.error("Socket Send Message Error:", error);
                socket.emit('ERROR', { message: 'Gagal mengirim pesan' });
            }
        });

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${userId}`);
        });
    });
}