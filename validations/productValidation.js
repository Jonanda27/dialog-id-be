import { z } from 'zod';

/**
 * Skema validasi untuk pembuatan produk baru.
 * Beradaptasi dengan arsitektur JSONB Metadata.
 */
export const createProductSchema = z.object({
    name: z.string()
        .min(5, 'Nama produk minimal 5 karakter.')
        .max(255, 'Nama produk maksimal 255 karakter.'),

    // Coercion: Mengubah string dari form-data ke Number
    price: z.coerce.number({
        required_error: 'Harga produk wajib diisi.',
        invalid_type_error: 'Format harga tidak valid, harus berupa angka.'
    }).positive('Harga produk harus lebih dari 0.'),

    // Coercion: Memastikan dia bilangan bulat (integer)
    stock: z.coerce.number({
        required_error: 'Stok produk wajib diisi.',
        invalid_type_error: 'Format stok tidak valid, harus berupa angka.'
    }).int('Stok harus berupa bilangan bulat.').nonnegative('Stok tidak boleh bernilai negatif.'),

    // BARU: Relasi Sub-Kategori
    sub_category_id: z.string({
        required_error: 'Sub Kategori wajib dipilih.'
    }).uuid('Format ID Sub Kategori tidak valid.'),

    // BARU & GAME CHANGER: Validasi Dinamis Metadata
    // z.preprocess akan menangkap data sebelum divalidasi. Jika data berupa String (biasanya karena multipart/form-data), ia akan mencoba mengubahnya menjadi JSON.
    metadata: z.preprocess(
        (val) => {
            if (typeof val === 'string') {
                try {
                    return JSON.parse(val);
                } catch (e) {
                    return { error: 'Invalid JSON' }; // Lempar bentuk cacat agar gagal di validasi bawah
                }
            }
            return val;
        },
        // Validasi akhirnya harus berupa Object yang bebas isinya (record)
        z.record(z.any(), {
            required_error: "Metadata (atribut dinamis) wajib disertakan.",
            invalid_type_error: "Metadata harus berupa JSON Object yang valid."
        })
    )
});

/**
 * Skema validasi untuk update produk.
 * Semua field dibuat opsional (.partial) karena update bisa parsial.
 */
export const updateProductSchema = createProductSchema.partial();