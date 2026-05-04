import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import * as profileService from '../services/userProfileService.js';
import { updateProfileSchema } from '../validations/userProfileValidation.js';

export const getMyProfile = asyncHandler(async (req, res) => {
    const profile = await profileService.getProfileByUserId(req.user.id);
    return successResponse(res, 200, 'Berhasil memuat profil', profile);
});

export const updateProfile = asyncHandler(async (req, res) => {
    // 1. Validasi data (Partial karena update)
    const validatedData = updateProfileSchema.parse(req.body);
    
    // 2. Eksekusi update/create
    const profile = await profileService.updateOrCreateProfile(
        req.user.id, 
        validatedData, 
        req.file // Dari Multer/Cloudinary
    );

    return successResponse(res, 200, 'Profil berhasil diperbarui', profile);
});