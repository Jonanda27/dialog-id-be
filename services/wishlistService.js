import db from '../models/index.js';

export const addToWishlist = async (userId, productId) => {
    // 1. Validasi eksistensi produk [cite: 1453, 1566]
    const product = await db.Product.findByPk(productId);
    if (!product) {
        const error = new Error('Produk tidak ditemukan.');
        error.statusCode = 404; // [cite: 1454, 1567]
        throw error;
    }

    // 2. Cek apakah sudah ada di wishlist (mencegah duplikat) [cite: 1568]
    const existing = await db.Wishlist.findOne({
        where: { user_id: userId, product_id: productId }
    });

    if (existing) {
        // Jika sudah ada, kita tetap ambil data lengkapnya untuk dikembalikan
        return await db.Wishlist.findByPk(existing.id, {
            include: [
                {
                    model: db.Product,
                    as: 'product',
                    attributes: ['id', 'name', 'price', 'stock', 'metadata'],
                    include: [
                        {
                            model: db.ProductMedia,
                            as: 'media',
                            where: { is_primary: true },
                            required: false,
                            attributes: ['media_url']
                        },
                        {
                            model: db.Store,
                            as: 'store',
                            attributes: ['id', 'name']
                        }
                    ]
                }
            ]
        });
    }

    // 3. Simpan ke database [cite: 1569]
    const newItem = await db.Wishlist.create({
        user_id: userId,
        product_id: productId
    });

    // 4. KRUSIAL: Ambil ulang data yang baru dibuat beserta JOIN tabel terkait [cite: 1770, 1818]
    // Hal ini dilakukan agar response API mengandung objek 'product' dan array 'media'
    return await db.Wishlist.findByPk(newItem.id, {
        include: [
            {
                model: db.Product,
                as: 'product',
                attributes: ['id', 'name', 'price', 'stock', 'metadata'], // [cite: 1571]
                include: [
                    {
                        model: db.ProductMedia,
                        as: 'media',
                        where: { is_primary: true }, // [cite: 1782]
                        required: false, // [cite: 1783]
                        attributes: ['media_url']
                    },
                    {
                        model: db.Store,
                        as: 'store',
                        attributes: ['id', 'name'] // [cite: 1783]
                    }
                ]
            }
        ]
    });
};

export const removeFromWishlist = async (userId, productId) => {
    const wishlist = await db.Wishlist.findOne({
        where: { user_id: userId, product_id: productId }
    });

    if (!wishlist) {
        const error = new Error('Item tidak ditemukan di wishlist Anda.');
        error.statusCode = 404;
        throw error;
    }

    await wishlist.destroy();
    return true;
};

export const getMyWishlist = async (userId) => {
    return await db.Wishlist.findAll({
        where: { user_id: userId },
        include: [
            {
                model: db.Product,
                as: 'product',
                attributes: ['id', 'name', 'price', 'stock', 'metadata'], // [cite: 202]
                include: [
                    {
                        model: db.ProductMedia,
                        as: 'media',
                        where: { is_primary: true }, // [cite: 1782]
                        required: false,
                        attributes: ['media_url']
                    },
                    {
                        model: db.Store,
                        as: 'store',
                        attributes: ['id', 'name'] // [cite: 1750]
                    }
                ]
            }
        ],
        order: [['created_at', 'DESC']] // [cite: 1452]
    });
};