import { z } from 'zod';

/**
 * Validasi untuk Checkout Multi-Toko (Single Billing)
 * Struktur payload: 
 * {
 * address_id: "uuid",
 * orders: [
 * { store_id: "uuid", items: [...], courier_code: "jne", ... },
 * { store_id: "uuid", items: [...], courier_code: "sicepat", ... }
 * ]
 * }
 */
export const checkoutSchema = z.object({
    address_id: z.string().uuid('ID Alamat tidak valid'),
    
    orders: z.array(
        z.object({
            store_id: z.string().uuid('ID Toko tidak valid'),
            
            items: z.array(
                z.object({
                    product_id: z.string().uuid('ID Produk tidak valid'),
                    qty: z.number().int().positive('Kuantitas minimal 1')
                })
            ).min(1, 'Daftar produk tidak boleh kosong'),

            courier_code: z.string().min(1, 'Kode kurir wajib diisi'),
            service_type: z.string().min(1, 'Tipe layanan pengiriman wajib diisi'),
            shipping_fee: z.number().min(0, 'Ongkos kirim tidak valid'),
            
            // Opsional jika ada biaya tambahan per toko
            grading_fee: z.number().optional().default(0)
        })
    ).min(1, 'Minimal harus ada satu pesanan toko')
});

/**
 * Validasi untuk Input Nomor Resi saat Pengiriman
 */
export const shipOrderSchema = z.object({
    body: z.object({
        tracking_number: z.string().min(5, 'Nomor resi tidak valid')
    })
});

/**
 * Validasi untuk Update Status Pesanan (Contoh tambahan untuk melengkapi sistem)
 */
export const updateOrderStatusSchema = z.object({
    body: z.object({
        status: z.enum([
            'pending_payment', 
            'processing', 
            'shipped', 
            'delivered', 
            'completed', 
            'cancelled'
        ], {
            errorMap: () => ({ message: "Status pesanan tidak valid" })
        })
    })
});
