'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('products', 'is_locked', {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Mengunci produk dari checkout reguler jika lelang aktif',
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('products', 'is_locked');
    }
};