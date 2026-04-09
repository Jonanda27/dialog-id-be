'use strict';
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Setup ID secara manual agar bisa direlasikan
        const sellerId = uuidv4();
        const storeId = uuidv4();
        const productIds = [uuidv4(), uuidv4(), uuidv4(), uuidv4()];

        // 2. Hash Password untuk akun Seller Dummy
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('seller123', salt);

        // 3. Insert Akun Seller
        await queryInterface.bulkInsert('users', [{
            id: sellerId,
            email: 'seller.dummy@analog.id',
            password: hashedPassword,
            full_name: 'Toko Vintage Jakarta',
            role: 'seller',
            created_at: new Date(),
            updated_at: new Date()
        }]);

        // 4. Insert Toko (Langsung status: approved agar produknya bisa tampil)
        await queryInterface.bulkInsert('stores', [{
            id: storeId,
            user_id: sellerId,
            name: 'Vintage JKT Records',
            description: 'Penyedia rilisan fisik original sejak 2026.',
            status: 'approved',
            balance: 0.00,
            created_at: new Date(),
            updated_at: new Date()
        }]);

        // 5. Insert 4 Produk Dummy (Nuansa Analog)
        await queryInterface.bulkInsert('products', [
            {
                id: productIds[0],
                store_id: storeId,
                name: 'The Dark Side of the Moon',
                artist: 'Pink Floyd',
                release_year: 1973,
                format: 'Vinyl',
                grading: 'NM',
                price: 850000,
                stock: 2,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: productIds[1],
                store_id: storeId,
                name: 'Rumours',
                artist: 'Fleetwood Mac',
                release_year: 1977,
                format: 'Vinyl',
                grading: 'VG+',
                price: 650000,
                stock: 1,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: productIds[2],
                store_id: storeId,
                name: 'Badai Pasti Berlalu',
                artist: 'Chrisye',
                release_year: 1977,
                format: 'Cassette',
                grading: 'Mint',
                price: 350000,
                stock: 5,
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: productIds[3],
                store_id: storeId,
                name: 'Abbey Road',
                artist: 'The Beatles',
                release_year: 1969,
                format: 'Vinyl',
                grading: 'VG',
                price: 450000,
                stock: 1,
                created_at: new Date(),
                updated_at: new Date()
            }
        ]);

        // 6. Insert Media (Menggunakan fallback public/vynil.png yang ada di FE Anda)
        const mediaRecords = productIds.map(pId => ({
            id: uuidv4(),
            product_id: pId,
            media_url: '/vynil.png', // Menyesuaikan dengan path gambar dummy di Frontend
            is_primary: true,
            created_at: new Date(),
            updated_at: new Date()
        }));

        await queryInterface.bulkInsert('product_media', mediaRecords);
    },

    async down(queryInterface, Sequelize) {
        // Clean up data jika seeder di-undo
        await queryInterface.bulkDelete('users', { email: 'seller.dummy@analog.id' }, {});
    }
};