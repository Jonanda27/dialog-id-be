'use strict';
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

module.exports = {
    async up(queryInterface, Sequelize) {
        const salt = await bcrypt.genSalt(10);
        const commonPassword = await bcrypt.hash('password123', salt);

        // Generate ID secara manual agar bisa kita hubungkan antar tabel
        const adminId = uuidv4();
        const sellerId = uuidv4();
        const buyerId = uuidv4();
        const sellerAddressId = uuidv4(); // ID Alamat yang akan jadi origin_address_id

        // 1. SEED DATA USERS
        const users = [
            {
                id: adminId,
                email: 'admin@gmail.com',
                password: commonPassword,
                full_name: 'Super Admin Analog',
                role: 'admin',
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: sellerId,
                email: 'seller@gmail.com',
                password: commonPassword,
                full_name: 'Budi Record Store',
                role: 'seller',
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: buyerId,
                email: 'buyer@gmail.com',
                password: commonPassword,
                full_name: 'Andi Kolektor',
                role: 'buyer',
                created_at: new Date(),
                updated_at: new Date()
            }
        ];

        await queryInterface.bulkInsert('users', users);

        // 2. SEED DATA ALAMAT UNTUK SELLER (Sebagai Lokasi Pickup/Origin)
        // Biteship wajib tahu koordinat/Area ID dari mana barang dikirim
        await queryInterface.bulkInsert('addresses', [{
            id: sellerAddressId,
            user_id: sellerId,
            label: 'Gudang Utama Bandung',
            recipient_name: 'Budi (Gudang B)',
            phone_number: '081234567890',
            address_detail: 'Jl. Ahmad Yani No. 10, Pasir Kaliki',
            province: 'Jawa Barat',
            city: 'Bandung',
            district: 'Sumur Bandung',
            postal_code: '40112',
            biteship_area_id: 'IDNP9IDNC22IDND2071IDZ40112', // Area ID Sumur Bandung
            is_primary: true,
            createdAt: new Date(),
            updatedAt: new Date()
        }]);

        // 3. SEED DATA STORE (Dihubungkan ke Seller & Alamatnya)
        await queryInterface.bulkInsert('stores', [{
            id: uuidv4(),
            user_id: sellerId,
            name: 'Budi Vinyl & Cassette',
            description: 'Toko rilisan fisik terlengkap di Bandung.',
            origin_address_id: sellerAddressId, // KUNCI: Hubungkan ke alamat di atas
            status: 'approved',
            balance: 0,
            created_at: new Date(),
            updated_at: new Date()
        }]);
    },

    async down(queryInterface, Sequelize) {
        // Hapus data secara berurutan agar tidak melanggar Foreign Key (FK)
        await queryInterface.bulkDelete('stores', null, {});
        await queryInterface.bulkDelete('addresses', null, {});
        await queryInterface.bulkDelete('users', null, {});
    }
};