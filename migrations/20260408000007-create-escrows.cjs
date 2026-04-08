'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('escrows', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            order_id: {
                type: Sequelize.UUID,
                allowNull: false,
                unique: true, // One-to-One
                references: { model: 'orders', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            amount_held: {
                type: Sequelize.DECIMAL(12, 2),
                allowNull: false,
            },
            status: {
                type: Sequelize.ENUM('held', 'released', 'refunded', 'frozen'),
                allowNull: false,
                defaultValue: 'held',
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
        await queryInterface.dropTable('escrows');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_escrows_status";');
    }
};