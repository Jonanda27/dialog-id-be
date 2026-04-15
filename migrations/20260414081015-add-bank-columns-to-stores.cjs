'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Menambahkan kolom bank ke tabel stores
    await queryInterface.addColumn('stores', 'bank_name', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'balance' // Opsional: meletakkan posisi kolom setelah balance (hanya untuk MySQL)
    });

    await queryInterface.addColumn('stores', 'bank_account_number', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'bank_name'
    });

    await queryInterface.addColumn('stores', 'bank_account_name', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'bank_account_number'
    });
  },

  async down(queryInterface, Sequelize) {
    // Menghapus kolom jika migration di-rollback
    await queryInterface.removeColumn('stores', 'bank_name');
    await queryInterface.removeColumn('stores', 'bank_account_number');
    await queryInterface.removeColumn('stores', 'bank_account_name');
  }
};