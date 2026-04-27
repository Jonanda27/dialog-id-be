'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('disputes', 'return_courier', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Kode kurir pengembalian (contoh: jne, sicepat, jnt)'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('disputes', 'return_courier');
  }
};