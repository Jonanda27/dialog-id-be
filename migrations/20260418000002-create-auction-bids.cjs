'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('auction_bids', {
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
                onDelete: 'CASCADE', // Jika lelang dihapus, histori bid juga terhapus
            },
            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            bid_amount: {
                type: Sequelize.DECIMAL(15, 2),
                allowNull: false,
            },
            status: {
                type: Sequelize.ENUM('VALID', 'INVALID', 'WINNER', 'RUNNER_UP'),
                allowNull: false,
                defaultValue: 'VALID',
            },
            ip_address: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.fn('now'),
            },
            // Sengaja tidak ada updated_at karena ini bersifat append-only log sesuai desain arsitektur
        });

        // Menambahkan Index untuk mempercepat pencarian histori berdasarkan lelang (Sorting dari harga tertinggi)
        await queryInterface.addIndex('auction_bids', ['auction_id', 'bid_amount']);
        await queryInterface.addIndex('auction_bids', ['user_id']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('auction_bids');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_auction_bids_status";');
    }
};