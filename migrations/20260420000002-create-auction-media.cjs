'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('auction_media', {
            id: {
                allowNull: false,
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
            },
            auction_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'auctions',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                comment: 'Relasi ke induk lelang',
            },
            media_url: {
                type: Sequelize.TEXT,
                allowNull: false,
                comment: 'URL penyimpanan gambar (S3/Cloudinary/Local)',
            },
            is_primary: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: 'Penanda foto utama untuk thumbnail katalog',
            },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
        });

        // Menambahkan index pada auction_id untuk optimasi query pencarian gambar
        await queryInterface.addIndex('auction_media', ['auction_id']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('auction_media');
    }
};