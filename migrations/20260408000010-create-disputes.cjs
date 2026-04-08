'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('disputes', {
            id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
            order_id: {
                type: Sequelize.UUID, allowNull: false, unique: true,
                references: { model: 'orders', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            buyer_id: { type: Sequelize.UUID, allowNull: false },
            store_id: { type: Sequelize.UUID, allowNull: false },
            reason: { type: Sequelize.STRING, allowNull: false },
            status: {
                type: Sequelize.ENUM('open', 'mediation', 'resolved'),
                allowNull: false, defaultValue: 'open'
            },
            admin_decision_notes: { type: Sequelize.TEXT, allowNull: true },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('disputes');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_disputes_status";');
    }
};