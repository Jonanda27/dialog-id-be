'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Membuka transaksi agar perubahan skema bersifat atomik (sukses semua atau gagal semua)
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Menambahkan opsi nilai baru ke dalam ENUM secara langsung di PostgreSQL
      // Catatan Arsitektural: Kita menggunakan Raw Query karena PostgreSQL tidak bisa
      // begitu saja dimodifikasi ENUM-nya melalui queryInterface.changeColumn standar.
      await queryInterface.sequelize.query(`ALTER TYPE "enum_disputes_status" ADD VALUE IF NOT EXISTS 'arrived_at_seller';`, { transaction });
      await queryInterface.sequelize.query(`ALTER TYPE "enum_disputes_status" ADD VALUE IF NOT EXISTS 'escalated';`, { transaction });
      await queryInterface.sequelize.query(`ALTER TYPE "enum_disputes_status" ADD VALUE IF NOT EXISTS 'refund_failed';`, { transaction });

      // 2. Memasang Pilar Waktu Absolut (SLA Timestamps)
      await queryInterface.addColumn('disputes', 'accepted_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Waktu penjual menyetujui komplain/pengembalian barang'
      }, { transaction });

      await queryInterface.addColumn('disputes', 'resi_submitted_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Waktu pembeli mensubmit resi retur'
      }, { transaction });

      await queryInterface.addColumn('disputes', 'arrived_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Waktu kurir/API Logistik menyatakan paket sampai di tangan penjual'
      }, { transaction });

      await queryInterface.addColumn('disputes', 'mediation_start_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Waktu dimulainya mediasi oleh Admin'
      }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Menghapus pilar waktu saat rollback
      await queryInterface.removeColumn('disputes', 'accepted_at', { transaction });
      await queryInterface.removeColumn('disputes', 'resi_submitted_at', { transaction });
      await queryInterface.removeColumn('disputes', 'arrived_at', { transaction });
      await queryInterface.removeColumn('disputes', 'mediation_start_at', { transaction });

      // Catatan: Di PostgreSQL, menghapus spesifik *value* dari tipe ENUM tidak didukung 
      // secara native tanpa menghapus (DROP) dan membuat ulang keseluruhan tipe datanya.
      // Oleh karena itu, kita membiarkan nilai ENUM yang baru tetap ada saat rollback.

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};