import { z } from 'zod';

export const checkoutSchema = z.object({
    body: z.object({
        items: z.array(
            z.object({
                product_id: z.string().uuid('ID Produk tidak valid'),
                qty: z.number().int().positive('Kuantitas minimal 1')
            })
        ).min(1, 'Keranjang belanja tidak boleh kosong'),
        shipping_address: z.string().min(10, 'Alamat pengiriman terlalu pendek/tidak lengkap')
    })
});