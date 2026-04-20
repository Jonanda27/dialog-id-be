'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            // 0. Bersihkan data lelang lama. 
            // Wajib dilakukan karena record lama yang terikat product_id 
            // tidak akan lolos validasi constraint NOT NULL pada kolom-kolom baru di bawah.
            await queryInterface.bulkDelete('auctions', null, { transaction });

            // 1. Tambahkan kolom relasi ke Toko (Store)
            await queryInterface.addColumn('auctions', 'store_id', {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'stores',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            }, { transaction });

            // 2. Tambahkan kolom identitas dan detail barang
            await queryInterface.addColumn('auctions', 'item_name', {
                type: Sequelize.STRING,
                allowNull: false,
            }, { transaction });

            await queryInterface.addColumn('auctions', 'description', {
                type: Sequelize.TEXT,
                allowNull: true,
            }, { transaction });

            await queryInterface.addColumn('auctions', 'condition', {
                type: Sequelize.ENUM('NEW', 'USED'),
                allowNull: false,
                defaultValue: 'USED',
            }, { transaction });

            // 3. Tambahkan dimensi fisik & logistik untuk kalkulasi ongkos kirim nanti
            await queryInterface.addColumn('auctions', 'weight', {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Berat dalam gram',
            }, { transaction });

            await queryInterface.addColumn('auctions', 'length', {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Panjang dalam cm',
            }, { transaction });

            await queryInterface.addColumn('auctions', 'width', {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Lebar dalam cm',
            }, { transaction });

            await queryInterface.addColumn('auctions', 'height', {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Tinggi dalam cm',
            }, { transaction });

            // 4. Hapus kolom product_id (Decoupling Core)
            await queryInterface.removeColumn('auctions', 'product_id', { transaction });

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    async down(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            // 1. Kembalikan kolom product_id (allowNull diset true agar rollback tidak crash)
            await queryInterface.addColumn('auctions', 'product_id', {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'products',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            }, { transaction });

            // 2. Drop semua kolom yang baru ditambahkan
            const columnsToRemove = [
                'store_id', 'item_name', 'description', 'condition',
                'weight', 'length', 'width', 'height'
            ];

            for (const column of columnsToRemove) {
                await queryInterface.removeColumn('auctions', column, { transaction });
            }

            // 3. Eksekusi raw query untuk membersihkan sisa tipe ENUM di PostgreSQL
            await queryInterface.sequelize.query(
                'DROP TYPE IF EXISTS "enum_auctions_condition";',
                { transaction }
            );

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
};