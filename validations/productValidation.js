// File: dialog-id-be/validations/productValidation.js
import { z } from 'zod';

/**
 * Skema validasi untuk pembuatan produk baru.
 * Menggunakan z.coerce untuk menangani input string dari multipart/form-data.
 */
export const createProductSchema = z.object({
  body: z.object({ // 👈 Tambahkan pembungkus body di sini
    name: z.string().trim().min(1, 'Nama produk/album wajib diisi'),
    artist: z.string().trim().min(1, 'Nama artis wajib diisi'),
    
    // Gunakan coerce agar string "2000" otomatis jadi number 2000
    release_year: z.coerce.number()
      .int()
      .min(1900)
      .max(new Date().getFullYear() + 1)
      .optional(),
    
    format: z.enum(['Vinyl', 'Cassette', 'CD', 'Gear'], {
      errorMap: () => ({ message: "Format tidak valid" })
    }),
    
    grading: z.enum(['Mint', 'NM', 'VG+', 'VG', 'Good', 'Fair'], {
      errorMap: () => ({ message: "Grading tidak valid" })
    }),
    
    // Coerce mengatasi masalah "NaN" dari Multer
    price: z.coerce.number().positive('Harga harus lebih dari 0'),
    stock: z.coerce.number().int().nonnegative('Stok tidak boleh negatif'),
    
    label: z.preprocess((val) => (val === "" ? null : val), z.string().optional().nullable()),
    matrix_number: z.preprocess((val) => (val === "" ? null : val), z.string().optional().nullable()),
    condition_notes: z.preprocess((val) => (val === "" ? null : val), z.string().optional().nullable())
  })
});