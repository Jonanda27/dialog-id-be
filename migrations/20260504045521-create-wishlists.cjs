'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('wishlists', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            product_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'products',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            }
        });

        // Tambahkan unique constraint agar user tidak bisa memfavoritkan produk yang sama dua kali
        await queryInterface.addConstraint('wishlists', {
            fields: ['user_id', 'product_id'],
            type: 'unique',
            name: 'unique_user_product_wishlist'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('wishlists');
    }
};