import { z } from 'zod';

export const createProductSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Nama produk/album wajib diisi'),
        artist: z.string().min(1, 'Nama artis wajib diisi'),
        release_year: z.preprocess(
            (val) => (val ? parseInt(val, 10) : undefined),
            z.number().int().min(1900, 'Tahun tidak valid').optional()
        ),
        label: z.string().optional(),
        matrix_number: z.string().optional(),
        format: z.enum(['Vinyl', 'Cassette', 'CD', 'Gear'], {
            errorMap: () => ({ message: "Format harus berupa 'Vinyl', 'Cassette', 'CD', atau 'Gear'" })
        }),
        grading: z.enum(['Mint', 'NM', 'VG+', 'VG', 'Good', 'Fair'], {
            errorMap: () => ({ message: "Grading tidak valid sesuai standar yang ditetapkan" })
        }),
        condition_notes: z.string().optional(),
        // Menggunakan preprocess untuk konversi string dari form-data ke tipe numerik
        price: z.preprocess(
            (val) => Number(val),
            z.number().positive('Harga harus lebih dari 0')
        ),
        stock: z.preprocess(
            (val) => Number(val),
            z.number().int().nonnegative('Stok tidak boleh bernilai negatif')
        )
    })
});