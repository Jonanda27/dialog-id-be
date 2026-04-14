'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('addresses', {
            id: {
                allowNull: false,
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4
            },
            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE' // Jika user dihapus, seluruh alamatnya ikut terhapus
            },
            label: {
                type: Sequelize.STRING(50),
                allowNull: false,
            },
            recipient_name: {
                type: Sequelize.STRING(100),
                allowNull: false,
            },
            phone_number: {
                type: Sequelize.STRING(20),
                allowNull: false,
            },
            address_detail: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            province: {
                type: Sequelize.STRING(100),
                allowNull: false,
            },
            city: {
                type: Sequelize.STRING(100),
                allowNull: false,
            },
            district: {
                type: Sequelize.STRING(100),
                allowNull: false,
            },
            postal_code: {
                type: Sequelize.STRING(10),
                allowNull: false,
            },
            biteship_area_id: {
                type: Sequelize.STRING(50),
                allowNull: false,
            },
            latitude: {
                type: Sequelize.FLOAT,
                allowNull: true,
            },
            longitude: {
                type: Sequelize.FLOAT,
                allowNull: true,
            },
            is_primary: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            deletedAt: {
                type: Sequelize.DATE,
                allowNull: true
            }
        });

        // Menambahkan Indexing pada biteship_area_id untuk optimasi query kalkulasi ongkir
        await queryInterface.addIndex('addresses', ['biteship_area_id'], {
            name: 'idx_addresses_biteship_area_id'
        });

        // Index opsional untuk mempercepat pencarian alamat milik user tertentu
        await queryInterface.addIndex('addresses', ['user_id']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('addresses');
    }
};