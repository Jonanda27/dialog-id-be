import db from '../models/index.js';

export const getProfileByUserId = async (userId) => {
    return await db.UserProfile.findOne({ where: { user_id: userId } });
};

export const updateOrCreateProfile = async (userId, updateData, file = null) => {
    const transaction = await db.sequelize.transaction();
    try {
        let profile = await db.UserProfile.findOne({ where: { user_id: userId }, transaction });

        const data = { ...updateData };
        if (file) {
            data.profile_picture_url = file.path; // URL dari Cloudinary 
        }

        if (profile) {
            await profile.update(data, { transaction });
        } else {
            profile = await db.UserProfile.create({ user_id: userId, ...data }, { transaction });
        }

        await transaction.commit();
        return profile;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};