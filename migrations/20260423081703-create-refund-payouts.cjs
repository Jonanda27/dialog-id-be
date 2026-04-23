'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('refund_payouts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      dispute_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'disputes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      order_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      buyer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed'),
        defaultValue: 'pending',
        allowNull: false
      },
      payout_method: {
        type: Sequelize.STRING, // e.g., 'BANK_TRANSFER', 'E_WALLET'
        allowNull: false
      },
      external_payout_id: {
        type: Sequelize.STRING, // ID dari Xendit/Midtrans
        allowNull: true,
        unique: true
      },
      retry_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      error_log: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Indeks untuk mempercepat polling Worker
    await queryInterface.addIndex('refund_payouts', ['status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('refund_payouts');
    // Menghapus tipe enum postgres jika ada
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_refund_payouts_status";');
  }
};