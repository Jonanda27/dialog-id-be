'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('reviews', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            buyer_id: {
                type: Sequelize.UUID,
                allowNull: false,
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
            product_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: { model: 'products', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            order_item_id: {
                type: Sequelize.UUID,
                allowNull: false,
                unique: true, // 1 Item pesanan hanya bisa diulas 1 kali
                references: { model: 'order_items', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            rating: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 5,
            },
            comment: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            seller_reply: {
                type: Sequelize.TEXT, // Penjual bisa membalas ulasan
                allowNull: true,
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

        // Menambahkan constraint agar rating selalu antara 1 sampai 5
        await queryInterface.addConstraint('reviews', {
            fields: ['rating'],
            type: 'check',
            where: {
                rating: {
                    [Sequelize.Op.between]: [1, 5]
                }
            },
            name: 'check_rating_range'
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('reviews');
    }
};