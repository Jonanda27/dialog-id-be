import db from '../models/index.js';

export const createUserBank = async (userId, data) => {
    return await db.UserBankAccount.create({
        user_id: userId,
        bank_name: data.bank_name,
        bank_account_number: data.bank_account_number,
        bank_account_name: data.bank_account_name
    });
};

export const getUserBanks = async (userId) => {
    return await db.UserBankAccount.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']]
    });
};

export const deleteUserBank = async (userId, bankId) => {
    const bank = await db.UserBankAccount.findOne({
        where: { id: bankId, user_id: userId }
    });

    if (!bank) {
        const error = new Error('Rekening bank tidak ditemukan');
        error.statusCode = 404;
        throw error;
    }

    await bank.destroy();
    return bank;
};