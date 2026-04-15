import { z } from 'zod';

/**
 * Skema validasi untuk pembuatan produk baru.
 * Beradaptasi dengan arsitektur JSONB Metadata dan Atribut Fisik Logistik Absolut.
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

    // Relasi Sub-Kategori
    sub_category_id: z.string({
        required_error: 'Sub Kategori wajib dipilih.'
    }).uuid('Format ID Sub Kategori tidak valid.'),

    // --- ATRIBUT FISIK & LOGISTIK (NEW & MANDATORY) ---
    // Diwajibkan untuk akurasi kalkulasi volumetrik Biteship API
    product_weight: z.coerce.number({
        required_error: 'Berat aktual produk wajib diisi.',
        invalid_type_error: 'Format berat tidak valid, harus berupa angka.'
    }).int('Berat harus berupa bilangan bulat (Gram).')
        .min(1, 'Berat produk minimal 1 gram.')
        .max(500000, 'Berat melebihi batas maksimal logistik (500kg).'),

    product_length: z.coerce.number({
        required_error: 'Panjang dimensi produk wajib diisi.',
        invalid_type_error: 'Format panjang tidak valid, harus berupa angka.'
    }).int('Panjang harus berupa bilangan bulat (Cm).')
        .min(1, 'Panjang produk minimal 1 Cm.'),

    product_width: z.coerce.number({
        required_error: 'Lebar dimensi produk wajib diisi.',
        invalid_type_error: 'Format lebar tidak valid, harus berupa angka.'
    }).int('Lebar harus berupa bilangan bulat (Cm).')
        .min(1, 'Lebar produk minimal 1 Cm.'),

    product_height: z.coerce.number({
        required_error: 'Tinggi dimensi produk wajib diisi.',
        invalid_type_error: 'Format tinggi tidak valid, harus berupa angka.'
    }).int('Tinggi harus berupa bilangan bulat (Cm).')
        .min(1, 'Tinggi produk minimal 1 Cm.'),

    // --- GAME CHANGER: Validasi Dinamis Metadata ---
    // z.preprocess akan menangkap data sebelum divalidasi. Jika data berupa String (karena multipart/form-data), ia akan mencoba mengubahnya menjadi JSON.
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