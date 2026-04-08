'use strict';
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

module.exports = {
    async up(queryInterface, Sequelize) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('SuperSecretAdmin2026!', salt);

        await queryInterface.bulkInsert('users', [{
            id: uuidv4(),
            email: 'admin@analog.id',
            password: hashedPassword,
            full_name: 'Super Admin Analog',
            role: 'admin',
            created_at: new Date(),
            updated_at: new Date()
        }]);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('users', { email: 'admin@analog.id' }, {});
    }
};