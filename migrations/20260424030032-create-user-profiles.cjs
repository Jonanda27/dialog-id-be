'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('user_profiles', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                unique: true, // Relasi 1-ke-1
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            username: {
                type: Sequelize.STRING,
                allowNull: true,
                unique: true,
            },
            phone_number: {
                type: Sequelize.STRING(20),
                allowNull: true,
            },
            gender: {
                type: Sequelize.ENUM('Laki-laki', 'Perempuan'),
                allowNull: true,
            },
            birth_date: {
                type: Sequelize.DATEONLY,
                allowNull: true,
            },
            profile_picture_url: {
                type: Sequelize.STRING,
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
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('user_profiles');
        // Hapus tipe enum jika menggunakan PostgreSQL
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_user_profiles_gender";');
    }
};