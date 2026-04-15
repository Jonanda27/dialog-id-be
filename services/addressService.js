import db from '../models/index.js';
import { errorHandler } from '../middlewares/errorHandler.js';

const { Address, sequelize } = db;

export const addAddress = async (userId, data) => {
    const transaction = await sequelize.transaction();
    try {
        if (data.is_primary) {
            await Address.update({ is_primary: false }, { where: { user_id: userId }, transaction });
        }

        const newAddress = await Address.create({ ...data, user_id: userId }, { transaction });

        await transaction.commit();
        return newAddress;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

export const getMyAddresses = async (userId) => {
    return await Address.findAll({
        where: { user_id: userId },
        order: [['is_primary', 'DESC'], ['createdAt', 'DESC']]
    });
};

export const updateAddress = async (addressId, userId, data) => {
    const transaction = await sequelize.transaction();
    try {
        const address = await Address.findOne({ where: { id: addressId, user_id: userId } });
        if (!address) throw new AppError('Alamat tidak ditemukan atau bukan milik Anda', 404);

        if (data.is_primary && !address.is_primary) {
            await Address.update({ is_primary: false }, { where: { user_id: userId }, transaction });
        }

        await address.update(data, { transaction });

        await transaction.commit();
        return address;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

export const deleteAddress = async (addressId, userId) => {
    const address = await Address.findOne({ where: { id: addressId, user_id: userId } });
    if (!address) throw new AppError('Alamat tidak ditemukan', 404);

    if (address.is_primary) {
        throw new errorHandler ('Tidak dapat menghapus alamat utama. Jadikan alamat lain sebagai alamat utama terlebih dahulu.', 400);
    }

    await address.destroy(); // Soft delete akan aktif karena opsi paranoid: true di Model
    return true;
};