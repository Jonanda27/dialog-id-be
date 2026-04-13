'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('stores', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                unique: true,
                references: {
                    model: 'users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            // Tambahan untuk Gambar
            logo_url: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            banner_url: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            // Tambahan untuk Operasional
            working_days: {
                type: Sequelize.STRING, // Contoh: "Senin - Sabtu"
                allowNull: true,
            },
            working_hours: {
                type: Sequelize.STRING, // Contoh: "09.00 - 17.00"
                allowNull: true,
            },
            // Tambahan untuk Media Sosial (Disimpan sebagai JSON)
            // Struktur: { "instagram": "...", "facebook": "...", "youtube": "...", "website": "..." }
            social_links: {
                type: Sequelize.JSON,
                allowNull: true,
            },
            ktp_url: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            status: {
                type: Sequelize.ENUM('pending', 'approved', 'rejected', 'suspended'),
                defaultValue: 'pending',
                allowNull: false,
            },
            balance: {
                type: Sequelize.DECIMAL(15, 2),
                defaultValue: 0.00,
                allowNull: false,
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
        await queryInterface.dropTable('stores');
        // Hapus tipe enum jika menggunakan PostgreSQL
        await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_stores_status";');
    }
};