'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('orders', 'auction_id', {
            type: Sequelize.UUID,
            allowNull: true,
            references: {
                model: 'auctions',
                key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
            comment: 'Referential ID jika Order digenerate dari modul lelang',
        });

        // Index untuk mempermudah SLA Worker mencari pesanan yang berasal dari lelang
        await queryInterface.addIndex('orders', ['auction_id']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeIndex('orders', ['auction_id']);
        await queryInterface.removeColumn('orders', 'auction_id');
    }
};