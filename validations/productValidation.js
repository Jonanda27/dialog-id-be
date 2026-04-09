// File: dialog-id-be/validations/productValidation.js
import { z } from 'zod';

/**
 * Skema validasi untuk pembuatan produk baru.
 * Menggunakan z.coerce untuk menangani input string dari multipart/form-data.
 */
export const createProductSchema = z.object({
    name: z.string()
        .min(5, 'Nama produk minimal 5 karakter.')
        .max(255, 'Nama produk maksimal 255 karakter.'),

    description: z.string()
        .min(20, 'Deskripsi produk terlalu singkat (minimal 20 karakter).'),

    // Coercion: Mengubah "150000" menjadi 150000 secara otomatis
    price: z.coerce.number({
        required_error: 'Harga produk wajib diisi.',
        invalid_type_error: 'Format harga tidak valid, harus berupa angka.'
    }).positive('Harga produk harus lebih dari 0.'),

    // Coercion: Mengubah "10" menjadi 10 dan memastikan dia bilangan bulat (integer)
    stock: z.coerce.number({
        required_error: 'Stok produk wajib diisi.',
        invalid_type_error: 'Format stok tidak valid, harus berupa angka.'
    }).int('Stok harus berupa bilangan bulat.').nonnegative('Stok tidak boleh bernilai negatif.'),

    condition: z.enum(['new', 'used'], {
        errorMap: () => ({ message: "Kondisi produk hanya boleh 'new' (Baru) atau 'used' (Bekas)." })
    }).default('new'),

    // Opsional: Jika Anda memiliki relasi kategori, ubah tipe datanya sesuai skema (UUID/Integer)
    category_id: z.string().uuid('Kategori yang dipilih tidak valid.').optional(),
});

/**
 * Skema validasi untuk update produk.
 * Semua field dibuat opsional (.partial) karena update bisa parsial.
 */
export const updateProductSchema = createProductSchema.partial();