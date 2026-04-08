'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        // HAPUS baris autoIncrement: true
        primaryKey: true,
        type: Sequelize.UUID, // Pastikan tipe ini UUID 
        defaultValue: Sequelize.UUIDV4, // Tambahkan ini sebagai pengganti autoIncrement 
      },
      name: {
        type: Sequelize.STRING // 
      },
      email: {
        type: Sequelize.STRING // 
      },
      password: {
        type: Sequelize.STRING // 
      },
      role: {
        type: Sequelize.ENUM('admin', 'penjual', 'pembeli'), // [cite: 47]
        allowNull: false,
        defaultValue: 'pembeli', // [cite: 47]
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE // [cite: 36]
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE // [cite: 36]
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Users'); // [cite: 37]
  }
};