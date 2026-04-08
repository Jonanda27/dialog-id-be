'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('orders', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            buyer_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'users', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT', // Cegah hapus user jika ada transaksi
            },
            store_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'stores', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT',
            },
            subtotal: {
                type: Sequelize.DECIMAL(12, 2),
                allowNull: false,
            },
            shipping_fee: {
                type: Sequelize.DECIMAL(12, 2),
                allowNull: false,
            },
            grading_fee: {
                type: Sequelize.DECIMAL(12, 2),
                allowNull: false,
                defaultValue: 0.00, // Akan terisi dari Bundling Logic jika ada
            },
            grand_total: {
                type: Sequelize.DECIMAL(12, 2),
                allowNull: false,
            },
            status: {
                type: Sequelize.ENUM(
                    'pending_payment', 'paid', 'processing',
                    'shipped', 'delivered', 'completed',
                    'cancelled', 'disputed'
                ),
                allowNull: false,
                defaultValue: 'pending_payment',
            },
            shipping_address: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            tracking_number: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            payment_method: {
                type: Sequelize.STRING,
                allowNull: true, // Akan diisi saat webhook Midtrans/PG masuk
            },
            payment_reference: {
                type: Sequelize.STRING,
                allowNull: true, // ID unik dari PG
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
        await queryInterface.dropTable('orders');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_status";');
    }
};