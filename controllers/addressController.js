import * as addressService from '../services/addressService.js';
import { addressSchema } from '../validations/addressValidation.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/apiResponse.js';

export const createAddress = asyncHandler(async (req, res) => {
    const validatedData = addressSchema.parse(req.body);
    const address = await addressService.addAddress(req.user.id, validatedData);
    return sendResponse(res, 201, 'Alamat berhasil ditambahkan', address);
});

export const getAddresses = asyncHandler(async (req, res) => {
    const addresses = await addressService.getMyAddresses(req.user.id);
    return sendResponse(res, 200, 'Berhasil memuat alamat', addresses);
});

export const updateAddress = asyncHandler(async (req, res) => {
    const validatedData = addressSchema.parse(req.body);
    const address = await addressService.updateAddress(req.params.id, req.user.id, validatedData);
    return sendResponse(res, 200, 'Alamat berhasil diperbarui', address);
});

export const deleteAddress = asyncHandler(async (req, res) => {
    await addressService.deleteAddress(req.params.id, req.user.id);
    return sendResponse(res, 200, 'Alamat berhasil dihapus', null);
});