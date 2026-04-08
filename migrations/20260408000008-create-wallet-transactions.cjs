'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('wallet_transactions', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            store_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'stores', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT',
            },
            type: {
                type: Sequelize.ENUM('CREDIT', 'DEBIT'),
                allowNull: false,
            },
            amount: {
                type: Sequelize.DECIMAL(15, 2), // Kapasitas lebih besar dari order
                allowNull: false,
            },
            source: {
                type: Sequelize.STRING, // e.g., 'order_release', 'withdrawal', 'grading_fee'
                allowNull: false,
            },
            reference_id: {
                type: Sequelize.UUID, // ID dari Order atau Withdrawal request
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
        await queryInterface.dropTable('wallet_transactions');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_wallet_transactions_type";');
    }
};