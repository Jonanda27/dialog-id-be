'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('stores', 'origin_address_id', {
            type: Sequelize.UUID,
            allowNull: true, // Nullable di awal agar tidak merusak data stores yang sudah ada (backward compatibility)
            references: {
                model: 'addresses',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL' // Jika alamat asal dihapus, set null untuk mencegah data toko terhapus
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('stores', 'origin_address_id');
    }
};