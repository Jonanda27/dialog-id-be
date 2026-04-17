'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('billings', {
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
                onDelete: 'RESTRICT',
            },
            total_amount: {
                type: Sequelize.DECIMAL(15, 2), // Menggunakan 15 agar aman untuk angka milyaran
                allowNull: false,
            },
            status: {
                type: Sequelize.ENUM('unpaid', 'paid', 'expired', 'cancelled'),
                allowNull: false,
                defaultValue: 'unpaid',
            },
            payment_method: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            payment_reference: {
                type: Sequelize.STRING, // ID dari Midtrans/PG
                allowNull: true,
            },
            snap_token: {
                type: Sequelize.STRING, // Khusus Midtrans Snap
                allowNull: true,
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
        await queryInterface.dropTable('billings');
        // Hapus tipe enum jika menggunakan PostgreSQL
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_billings_status";');
    }
};