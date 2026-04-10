'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Daftar kolom jadul yang harus disapu bersih karena sudah digantikan oleh JSONB 'metadata'
        const columnsToRemove = [
            'artist',
            'release_year',
            'label',
            'matrix_number',
            'grading',
            'condition_notes'
        ];

        for (const column of columnsToRemove) {
            try {
                await queryInterface.removeColumn('products', column);
            } catch (error) {
                console.log(`[INFO] Kolom ${column} mungkin sudah tidak ada, lewati...`);
            }
        }
    },

    async down(queryInterface, Sequelize) {
        // Jika di-rollback, kolom-kolom ini dikembalikan (opsional, diset allow null agar aman)
        await queryInterface.addColumn('products', 'artist', { type: Sequelize.STRING, allowNull: true });
        await queryInterface.addColumn('products', 'release_year', { type: Sequelize.INTEGER, allowNull: true });
        await queryInterface.addColumn('products', 'label', { type: Sequelize.STRING, allowNull: true });
        await queryInterface.addColumn('products', 'matrix_number', { type: Sequelize.STRING, allowNull: true });
        await queryInterface.addColumn('products', 'grading', { type: Sequelize.STRING, allowNull: true });
        await queryInterface.addColumn('products', 'condition_notes', { type: Sequelize.TEXT, allowNull: true });
    }
};