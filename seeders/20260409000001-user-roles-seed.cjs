'use strict';
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

module.exports = {
    async up(queryInterface, Sequelize) {
        const salt = await bcrypt.genSalt(10);

        // Password default untuk semua akun testing agar mudah diingat
        const commonPassword = await bcrypt.hash('password123', salt);

        const users = [
            {
                id: uuidv4(),
                email: 'admin@gmail.com',
                password: commonPassword,
                full_name: 'Super Admin Analog',
                role: 'admin',
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: uuidv4(),
                email: 'seller@gmail.com',
                password: commonPassword,
                full_name: 'Budi Record Store',
                role: 'seller',
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: uuidv4(),
                email: 'buyer@gmail.com',
                password: commonPassword,
                full_name: 'Andi Kolektor',
                role: 'buyer',
                created_at: new Date(),
                updated_at: new Date()
            }
        ];

        // Simpan data user
        await queryInterface.bulkInsert('users', users);

        // Tambahkan data Toko untuk akun seller agar fungsionalitas seller berjalan
        const seller = users.find(u => u.role === 'seller');
        await queryInterface.bulkInsert('stores', [{
            id: uuidv4(),
            user_id: seller.id,
            name: 'Budi Vinyl & Cassette',
            description: 'Toko rilisan fisik terlengkap di Bandung.',
            status: 'approved', // Langsung approved agar bisa jualan
            balance: 0,
            created_at: new Date(),
            updated_at: new Date()
        }]);
    },

    async down(queryInterface, Sequelize) {
        // Menghapus data berdasarkan email saat undo seeder
        await queryInterface.bulkDelete('users', {
            email: ['admin@gmail.com', 'seller@gmail.com', 'buyer@gmail.com']
        }, {});
    }
};