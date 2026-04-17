'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('orders', 'billing_id', {
            type: Sequelize.UUID,
            allowNull: true, // Awalnya true agar data lama tidak error, nanti bisa diubah ke false
            references: {
                model: 'billings',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL', // Jika billing dihapus, order tidak hilang tapi billing_id jadi null
            after: 'id' // Letakkan kolom setelah kolom 'id' (opsional, hanya didukung MySQL)
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('orders', 'billing_id');
    }
};