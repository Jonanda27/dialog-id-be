'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Tambahkan kolom Relasi Sub Kategori
    await queryInterface.addColumn('products', 'sub_category_id', {
      type: Sequelize.UUID,
      allowNull: true, // Diset true sementara agar tidak error jika ada data existing di database Anda
      references: {
        model: 'sub_categories',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // 2. Tambahkan kolom Metadata JSONB (Game Changer kita!)
    await queryInterface.addColumn('products', 'metadata', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {}
    });

    // 3. Hapus kolom 'format' yang statis dan sudah usang
    // Pastikan database Anda tidak memiliki constrain yang mengunci kolom ini
    await queryInterface.removeColumn('products', 'format');
  },

  async down(queryInterface, Sequelize) {
    // === ROLLBACK SCRIPT ===
    // Mengembalikan kondisi tabel seperti semula jika migrasi di-undo

    await queryInterface.addColumn('products', 'format', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.removeColumn('products', 'metadata');
    await queryInterface.removeColumn('products', 'sub_category_id');
  }
};