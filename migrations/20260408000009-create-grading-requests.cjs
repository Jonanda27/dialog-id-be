'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('grading_requests', {
            id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
            buyer_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'users', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            product_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'products', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            status: {
                type: Sequelize.ENUM('requested', 'fulfilled', 'cancelled'),
                allowNull: false,
                defaultValue: 'requested'
            },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('grading_requests');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_grading_requests_status";');
    }
};