'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('auctions', {
            id: {
                allowNull: false,
                primaryKey: true,
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
            },
            product_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'products',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            winner_id: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            start_time: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            end_time: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            increment: {
                type: Sequelize.DECIMAL(15, 2),
                allowNull: false,
            },
            current_price: {
                type: Sequelize.DECIMAL(15, 2),
                allowNull: false,
                defaultValue: 0,
            },
            status: {
                type: Sequelize.ENUM(
                    'DRAFT',
                    'SCHEDULED',
                    'ACTIVE',
                    'FREEZE',
                    'EVALUATION',
                    'COMPLETED',
                    'HANDOVER_TO_RUNNER_UP',
                    'FAILED'
                ),
                allowNull: false,
                defaultValue: 'DRAFT',
            },
            created_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.fn('now'),
            },
            updated_at: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.fn('now'),
            },
        });

        // Menambahkan Index untuk mempercepat query Worker yang mencari status lelang tertentu
        await queryInterface.addIndex('auctions', ['status', 'end_time']);
        await queryInterface.addIndex('auctions', ['product_id']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('auctions');
        // Drop ENUM type manually in Postgres
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_auctions_status";');
    }
};