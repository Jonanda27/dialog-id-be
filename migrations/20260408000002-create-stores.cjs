'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('stores', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                unique: true, // One-to-One relationship
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE', // Jika user dihapus, toko otomatis terhapus
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            ktp_url: {
                type: Sequelize.STRING,
                allowNull: true, // Bisa null saat awal daftar, wajib diisi saat upload KYC
            },
            status: {
                type: Sequelize.ENUM('pending', 'approved', 'rejected', 'suspended'),
                defaultValue: 'pending',
                allowNull: false,
            },
            balance: {
                type: Sequelize.DECIMAL(15, 2),
                defaultValue: 0.00,
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
        await queryInterface.dropTable('stores');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_stores_status";');
    }
};