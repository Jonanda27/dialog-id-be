'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Ambil salah satu ID Toko (Store) yang ada di database
        const stores = await queryInterface.sequelize.query(
            `SELECT id FROM stores LIMIT 1;`
        );
        const storeId = stores[0][0]?.id;

        if (!storeId) {
            console.log("⚠️ Toko belum ada! Lewati seeder produk.");
            return;
        }

        // 2. Ambil ID Sub-Kategori yang baru saja kita buat di seeder kategori
        const vinylSubCat = await queryInterface.sequelize.query(
            `SELECT id FROM sub_categories WHERE slug = 'vinyl-record' LIMIT 1;`
        );
        const vinylId = vinylSubCat[0][0]?.id;

        const gearSubCat = await queryInterface.sequelize.query(
            `SELECT id FROM sub_categories WHERE slug = 'audio-gear-analog' LIMIT 1;`
        );
        const gearId = gearSubCat[0][0]?.id;

        // 3. Masukkan data dummy HANYA dengan kolom yang benar-benar ada di tabel products
        // (id, store_id, sub_category_id, name, price, stock, metadata, created_at, updated_at)
        const products = [
            {
                id: uuidv4(),
                store_id: storeId,
                sub_category_id: vinylId,
                name: 'The Dark Side of the Moon',
                price: 850000,
                stock: 2,
                // Semua atribut lain yang tidak ada kolomnya (termasuk deskripsi), MASUKKAN KE METADATA
                metadata: JSON.stringify({
                    description: 'Plat original rilisan pertama. Sangat langka.',
                    status: 'active',
                    artist: 'Pink Floyd',
                    release_year: 1973,
                    record_label: 'Harvest',
                    media_grading: 'NM',
                    sleeve_grading: 'VG+',
                    matrix_number: 'SHVL 804'
                }),
                created_at: new Date(),
                updated_at: new Date()
            },
            {
                id: uuidv4(),
                store_id: storeId,
                sub_category_id: gearId,
                name: 'Technics SL-1200MK2 Turntable',
                price: 12500000,
                stock: 1,
                // METADATA AUDIO GEAR DITEMPATKAN DI SINI
                metadata: JSON.stringify({
                    description: 'Turntable legendaris, cocok untuk DJ atau audiophile.',
                    status: 'active',
                    brand: 'Technics',
                    physical_condition: 'Mulus 90%',
                    functional_status: 'Normal Total',
                    voltage: '110V (Butuh Stepdown)',
                    completeness: 'Unit Only (Tanpa Dust Cover)'
                }),
                created_at: new Date(),
                updated_at: new Date()
            }
        ];

        await queryInterface.bulkInsert('products', products);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('products', null, {});
    }
};