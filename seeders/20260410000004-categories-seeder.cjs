'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Generate UUIDs untuk 4 Kategori Induk agar bisa direlasikan ke Sub-Kategori
        const catAudioId = uuidv4();
        const catVisualId = uuidv4();
        const catPrintId = uuidv4();
        const catMerchId = uuidv4();

        // 1. DATA KATEGORI INDUK
        const categories = [
            { id: catAudioId, name: 'Produk Utama (Audio)', slug: 'produk-utama-audio', icon: '🎧', created_at: new Date(), updated_at: new Date() },
            { id: catVisualId, name: 'Audio-Visual Analog', slug: 'audio-visual-analog', icon: '📼', created_at: new Date(), updated_at: new Date() },
            { id: catPrintId, name: 'Printing & Media', slug: 'printing-media', icon: '📰', created_at: new Date(), updated_at: new Date() },
            { id: catMerchId, name: 'Merch & Memorabilia', slug: 'merch-memorabilia', icon: '👕', created_at: new Date(), updated_at: new Date() }
        ];

        await queryInterface.bulkInsert('categories', categories);

        // 2. DATA SUB-KATEGORI
        const subCategories = [
            // Kategori 1: Produk Utama (Audio)
            { id: uuidv4(), category_id: catAudioId, name: 'Vinyl Record (LP, EP)', slug: 'vinyl-record', created_at: new Date(), updated_at: new Date() },
            { id: uuidv4(), category_id: catAudioId, name: 'Kaset Pita', slug: 'kaset-pita', created_at: new Date(), updated_at: new Date() },
            { id: uuidv4(), category_id: catAudioId, name: 'Compact Disc (CD)', slug: 'compact-disc', created_at: new Date(), updated_at: new Date() },
            { id: uuidv4(), category_id: catAudioId, name: 'Reel-to-Reel', slug: 'reel-to-reel', created_at: new Date(), updated_at: new Date() },
            { id: uuidv4(), category_id: catAudioId, name: 'Audio Gear Analog', slug: 'audio-gear-analog', created_at: new Date(), updated_at: new Date() },

            // Kategori 2: Audio-Visual Analog
            { id: uuidv4(), category_id: catVisualId, name: 'LaserDisc', slug: 'laserdisc', created_at: new Date(), updated_at: new Date() },
            { id: uuidv4(), category_id: catVisualId, name: 'VCD & DVD', slug: 'vcd-dvd', created_at: new Date(), updated_at: new Date() },
            { id: uuidv4(), category_id: catVisualId, name: 'VHS & Betamax', slug: 'vhs-betamax', created_at: new Date(), updated_at: new Date() },
            { id: uuidv4(), category_id: catVisualId, name: 'Reel Video 8mm', slug: 'reel-video-8mm', created_at: new Date(), updated_at: new Date() },

            // Kategori 3: Printing & Media
            { id: uuidv4(), category_id: catPrintId, name: 'Poster Musik', slug: 'poster-musik', created_at: new Date(), updated_at: new Date() },
            { id: uuidv4(), category_id: catPrintId, name: 'Majalah Musik', slug: 'majalah-musik', created_at: new Date(), updated_at: new Date() },
            { id: uuidv4(), category_id: catPrintId, name: 'Buku Biografi Artis', slug: 'buku-biografi', created_at: new Date(), updated_at: new Date() },
            { id: uuidv4(), category_id: catPrintId, name: 'Zine Independent', slug: 'zine-independent', created_at: new Date(), updated_at: new Date() },

            // Kategori 4: Merch & Memorabilia
            { id: uuidv4(), category_id: catMerchId, name: 'T-Shirt & Apparel', slug: 'tshirt-apparel', created_at: new Date(), updated_at: new Date() },
            { id: uuidv4(), category_id: catMerchId, name: 'Merchandise Resmi', slug: 'merchandise-resmi', created_at: new Date(), updated_at: new Date() },
            { id: uuidv4(), category_id: catMerchId, name: 'Tiket Konser Vintage', slug: 'tiket-konser', created_at: new Date(), updated_at: new Date() },
            { id: uuidv4(), category_id: catMerchId, name: 'Autograph', slug: 'autograph', created_at: new Date(), updated_at: new Date() }
        ];

        await queryInterface.bulkInsert('sub_categories', subCategories);
    },

    async down(queryInterface, Sequelize) {
        // ROLLBACK: Hapus dari tabel anak (sub_categories) terlebih dahulu untuk menghindari error Foreign Key
        await queryInterface.bulkDelete('sub_categories', null, {});
        await queryInterface.bulkDelete('categories', null, {});
    }
};