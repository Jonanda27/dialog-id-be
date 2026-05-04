// File: dialog-id-be/services/cartService.js
import db from '../models/index.js';

class CartService {
   /**
     * Mengambil seluruh isi keranjang milik user tertentu
     * ⚡ PERBAIKAN: Menambahkan include Store agar nama toko tersedia
     */
    static async getCart(userId) {
        return await db.Cart.findAll({
            where: { user_id: userId },
            include: [
                {
                    model: db.Product,
                    as: 'product',
                    // Kita tidak membatasi attributes agar relasi Store bisa masuk
                    include: [
                        {
                            model: db.ProductMedia,
                            as: 'media',
                            where: { is_primary: true },
                            required: false,
                            attributes: ['media_url']
                        },
                        {
                            // ⚡ AMBIL DATA TOKO DI SINI
                            model: db.Store,
                            as: 'store',
                            attributes: ['id', 'name'] 
                        }
                    ]
                }
            ],
            order: [['created_at', 'DESC']]
        });
    }

    /**
     * Menambahkan produk ke keranjang
     * Jika produk sudah ada, kuantitas akan dijumlahkan
     */
    static async addToCart(userId, productId, quantity) {
        // 1. Validasi eksistensi produk
        const product = await db.Product.findByPk(productId);
        if (!product) {
            const error = new Error('Produk tidak ditemukan di katalog.');
            error.statusCode = 404;
            throw error;
        }

        // 2. Validasi stok awal
        if (product.stock < quantity) {
            const error = new Error(`Stok tidak mencukupi. Tersedia: ${product.stock}`);
            error.statusCode = 400;
            throw error;
        }

        // 3. Cek apakah produk sudah ada di keranjang user tersebut
        const existingItem = await db.Cart.findOne({
            where: { user_id: userId, product_id: productId }
        });

        if (existingItem) {
            // Jika ada, update kuantitasnya
            const newQuantity = existingItem.quantity + quantity;

            // Validasi stok terhadap total kuantitas baru
            if (product.stock < newQuantity) {
                const error = new Error(`Gagal menambah kuantitas. Total di keranjang (${newQuantity}) melebihi stok tersedia.`);
                error.statusCode = 400;
                throw error;
            }

            existingItem.quantity = newQuantity;
            return await existingItem.save();
        }

        // 4. Jika belum ada, buat baris baru
        return await db.Cart.create({
            user_id: userId,
            product_id: productId,
            quantity: quantity
        });
    }

    /**
     * Memperbarui kuantitas item tertentu di keranjang
     */
    static async updateQty(userId, cartItemId, quantity) {
        const cartItem = await db.Cart.findOne({
            where: { id: cartItemId, user_id: userId }
        });

        if (!cartItem) {
            const error = new Error('Item keranjang tidak ditemukan.');
            error.statusCode = 404;
            throw error;
        }

        // Validasi stok produk terkait
        const product = await db.Product.findByPk(cartItem.product_id);
        if (product.stock < quantity) {
            const error = new Error(`Stok tidak mencukupi untuk memperbarui kuantitas. Tersedia: ${product.stock}`);
            error.statusCode = 400;
            throw error;
        }

        cartItem.quantity = quantity;
        await cartItem.save();
        return cartItem;
    }

    /**
     * Menghapus satu item spesifik dari keranjang
     */
    static async removeItem(userId, cartItemId) {
        const cartItem = await db.Cart.findOne({
            where: { id: cartItemId, user_id: userId }
        });

        if (!cartItem) {
            const error = new Error('Item keranjang tidak ditemukan atau bukan milik Anda.');
            error.statusCode = 404;
            throw error;
        }

        await cartItem.destroy();
        return { message: 'Item berhasil dihapus dari keranjang.' };
    }

    /**
     * Mengosongkan seluruh isi keranjang user
     * Berguna setelah proses checkout berhasil
     */
    static async clearCart(userId) {
        return await db.Cart.destroy({
            where: { user_id: userId }
        });
    }
}

export default CartService;