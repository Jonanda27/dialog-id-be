// migrations/20260420000000-create-chats.cjs
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('chats', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      sender_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      receiver_id: {
        type: Sequelize.UUID,
        allowNull: true, // Diubah ke true karena saat awal chat ke store, receiver bisa null (broadcast ke admin)
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      store_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'stores', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      // DIUBAH: allowNull menjadi true agar bisa kirim gambar saja tanpa teks
      message: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      // TAMBAHAN: Kolom untuk tipe pesan
      message_type: {
        type: Sequelize.ENUM('text', 'image', 'video'),
        defaultValue: 'text',
        allowNull: false,
      },
      // TAMBAHAN: Kolom untuk menyimpan URL dari Cloudinary
      file_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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
    await queryInterface.dropTable('chats');
    // Hapus tipe ENUM jika perlu (tergantung dialek DB)
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_chats_message_type";');
    }
  }
};