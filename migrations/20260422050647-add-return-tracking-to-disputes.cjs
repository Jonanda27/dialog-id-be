'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Menambahkan kolom return_tracking_number ke tabel disputes.
     * Kolom ini digunakan buyer untuk memasukkan resi pengembalian barang. [cite: 634, 636]
     */
    await queryInterface.addColumn('disputes', 'return_tracking_number', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'reason' // Opsional: meletakkan posisi kolom setelah 'reason'
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Menghapus kolom return_tracking_number jika migrasi di-rollback.
     */
    await queryInterface.removeColumn('disputes', 'return_tracking_number');
  }
};