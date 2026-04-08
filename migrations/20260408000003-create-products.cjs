'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('products', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            store_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'stores',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE', // Jika toko dihapus, semua produknya ikut terhapus
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            artist: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            release_year: {
                type: Sequelize.INTEGER,
                allowNull: true,
            },
            label: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            matrix_number: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            format: {
                type: Sequelize.ENUM('Vinyl', 'Cassette', 'CD', 'Gear'),
                allowNull: false,
            },
            grading: {
                type: Sequelize.ENUM('Mint', 'NM', 'VG+', 'VG', 'Good', 'Fair'),
                allowNull: false,
            },
            condition_notes: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            price: {
                type: Sequelize.DECIMAL(12, 2),
                allowNull: false,
            },
            stock: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 1,
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
        await queryInterface.dropTable('products');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_products_format";');
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_products_grading";');
    }
};