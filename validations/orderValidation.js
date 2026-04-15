import { z } from 'zod';

export const checkoutSchema = z.object({
    address_id: z.string().uuid('ID Alamat tidak valid'),
    store_id: z.string().uuid('ID Toko tidak valid'),
    items: z.array(
        z.object({
            product_id: z.string().uuid('ID Produk tidak valid'),
            qty: z.number().int().positive('Kuantitas minimal 1')
        })
    ).min(1, 'Keranjang belanja tidak boleh kosong'),

    courier_code: z.string().min(1, 'Kode kurir wajib diisi'),
    service_type: z.string().min(1, 'Tipe layanan pengiriman wajib diisi'),
    shipping_fee: z.number().min(0, 'Ongkos kirim tidak valid'),
    grading_fee: z.number().optional().default(0)
});

// Pastikan skema lain juga pakai pola yang sama (body: z.object)
export const shipOrderSchema = z.object({
    body: z.object({
        tracking_number: z.string().min(5, 'Nomor resi tidak valid')
    })
});