'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('carts', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users', // Merujuk ke tabel users [cite: 332]
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            product_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'products', // Merujuk ke tabel products [cite: 355]
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            quantity: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 1,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            }
        });

        // Tambahkan index agar pencarian keranjang per user lebih cepat
        await queryInterface.addIndex('carts', ['user_id']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('carts');
    }
};