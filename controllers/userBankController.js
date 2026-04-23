import * as userBankService from '../services/userBankService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';

export const addBank = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const bank = await userBankService.createUserBank(userId, req.body);
    
    return successResponse(res, 201, 'Rekening bank berhasil ditambahkan', bank);
});

export const getMyBanks = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const banks = await userBankService.getUserBanks(userId);
    
    return successResponse(res, 200, 'Daftar rekening berhasil dimuat', banks);
});

export const removeBank = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    
    await userBankService.deleteUserBank(userId, id);
    
    return successResponse(res, 200, 'Rekening bank berhasil dihapus');
});