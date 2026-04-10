'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Menambahkan indeks GIN pada kolom metadata di tabel products.
    // Ini memastikan pencarian atribut dinamis (seperti grading, voltage, size)
    // tereksekusi secepat kilat tanpa membebani CPU database.
    await queryInterface.addIndex('products', ['metadata'], {
      using: 'gin',
      name: 'products_metadata_gin_idx'
    });
  },

  async down(queryInterface, Sequelize) {
    // Rollback: Menghapus indeks jika migrasi di-undo
    await queryInterface.removeIndex('products', 'products_metadata_gin_idx');
  }
};