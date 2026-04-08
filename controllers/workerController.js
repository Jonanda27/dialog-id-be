import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import * as automationService from '../services/automationService.js';

export const triggerAutoCancel = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await automationService.autoCancelOrder(id);

    return successResponse(res, 200, 'Auto-cancel berhasil dieksekusi oleh Worker', result);
});