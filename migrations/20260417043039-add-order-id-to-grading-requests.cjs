'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('grading_requests', 'order_id', {
      type: Sequelize.UUID,
      allowNull: true, // Nullable karena saat request awal, order belum dibuat
      references: {
        model: 'orders',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('grading_requests', 'order_id');
  }
};