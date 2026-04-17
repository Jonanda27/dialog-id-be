import { z } from 'zod';

export const createReviewSchema = z.object({
    body: z.object({
        order_item_id: z.string().uuid('ID Item Pesanan tidak valid'),
        // Gunakan coerce agar string "5" otomatis jadi number 5
        rating: z.coerce.number().int().min(1, 'Rating minimal 1').max(5, 'Rating maksimal 5'),
        comment: z.string().max(1000, 'Komentar terlalu panjang').optional()
    })
});

export const replyReviewSchema = z.object({
    body: z.object({
        seller_reply: z.string().min(5, 'Balasan terlalu pendek').max(1000, 'Balasan terlalu panjang')
    })
});