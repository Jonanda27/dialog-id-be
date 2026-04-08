import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import * as disputeService from '../services/disputeService.js';

export const resolveAdminDispute = asyncHandler(async (req, res) => {
    const disputeId = req.params.id;
    const { resolution_type, admin_notes, refund_amount } = req.body;

    const result = await disputeService.resolveDispute(disputeId, resolution_type, admin_notes, refund_amount);

    return successResponse(res, 200, 'Sengketa berhasil diselesaikan secara final.', result);
});