'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Tambahkan kolom grading_fee pada tabel OrderItems
      await queryInterface.addColumn(
        'order_items',
        'grading_fee',
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Biaya tambahan untuk layanan verifikasi premium (Grading Add-on)'
        },
        { transaction }
      );

      // 2. Modifikasi tipe ENUM pada kolom status di tabel GradingRequests
      // PostgreSQL requires adding ENUM values one by one to existing types
      const newEnumValues = [
        'PENDING',
        'IN_PROGRESS',
        'COMPLETED',
        'REJECTED',
        'AWAITING_SELLER_MEDIA',
        'MEDIA_READY',
        'EXPIRED',
        'SYSTEM_CANCELLED'
      ];

      // Add new enum values to the existing enum type (can't use new values as default in same transaction)
      for (const value of newEnumValues) {
        try {
          await queryInterface.sequelize.query(
            `ALTER TYPE "enum_grading_requests_status" ADD VALUE IF NOT EXISTS '${value}';`,
            { transaction }
          );
        } catch (error) {
          // Some PostgreSQL versions don't support IF NOT EXISTS, so allow duplicate errors
          if (!error.message.includes('already exists')) {
            throw error;
          }
        }
      }
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Rollback: Hapus kolom grading_fee
      await queryInterface.removeColumn('order_items', 'grading_fee', { transaction });

      // 2. Rollback: Kembalikan default value ke PENDING
      // Note: PostgreSQL doesn't allow removing enum values, so we just revert the default
      await queryInterface.sequelize.query(
        `ALTER TABLE "grading_requests" ALTER COLUMN "status" SET DEFAULT 'requested';`,
        { transaction }
      );
    });
  }
};