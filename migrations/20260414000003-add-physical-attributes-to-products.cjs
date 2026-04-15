'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.addColumn('products', 'product_weight', {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Berat produk dalam satuan Gram'
            }, { transaction });

            await queryInterface.addColumn('products', 'product_length', {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Panjang dimensi dalam satuan Cm'
            }, { transaction });

            await queryInterface.addColumn('products', 'product_width', {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Lebar dimensi dalam satuan Cm'
            }, { transaction });

            await queryInterface.addColumn('products', 'product_height', {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Tinggi dimensi dalam satuan Cm'
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
            await queryInterface.removeColumn('products', 'product_weight', { transaction });
            await queryInterface.removeColumn('products', 'product_length', { transaction });
            await queryInterface.removeColumn('products', 'product_width', { transaction });
            await queryInterface.removeColumn('products', 'product_height', { transaction });
            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
};