'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('order_items', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            order_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'orders', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            product_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'products', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT', // Produk tidak boleh dihapus jika sudah pernah dibeli
            },
            qty: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 1,
            },
            price_at_purchase: {
                type: Sequelize.DECIMAL(12, 2),
                allowNull: false,
            },
            grading_at_purchase: {
                type: Sequelize.STRING, // Pakai STRING agar historical aman meskipun ENUM berubah
                allowNull: false,
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
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('order_items');
    }
};