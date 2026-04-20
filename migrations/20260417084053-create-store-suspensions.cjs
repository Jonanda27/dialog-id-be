'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('store_suspensions', {
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
        onDelete: 'CASCADE',
      },
      suspended_until: {
        type: Sequelize.DATE,
        allowNull: true, // Null bisa berarti permanen, tergantung logika Anda
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true, // Untuk menandai apakah suspensi ini yang sedang berlaku
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
    await queryInterface.dropTable('store_suspensions');
  }
};