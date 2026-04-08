'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('dispute_media', {
            id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
            dispute_id: {
                type: Sequelize.UUID, allowNull: false,
                references: { model: 'disputes', key: 'id' },
                onUpdate: 'CASCADE', onDelete: 'CASCADE'
            },
            uploader_id: { type: Sequelize.UUID, allowNull: false }, // Bisa ID Buyer atau ID Seller
            media_url: { type: Sequelize.STRING, allowNull: false },
            created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('dispute_media');
    }
};