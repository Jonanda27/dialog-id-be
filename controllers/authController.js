import { asyncHandler } from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import * as authService from '../services/authService.js';

/**
 * @desc    Register user baru (Buyer/Seller)
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body);

  return successResponse(
    res,
    201, // 201 Created
    'Registrasi berhasil',
    result
  );
});

/**
 * @desc    Login user & mendapatkan JWT
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body);

  return successResponse(
    res,
    200, // 200 OK
    'Login berhasil',
    result
  );
});

/**
 * @desc    Get current logged in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  // ID didapatkan dari middleware authenticate yang menyisipkan req.user
  const userId = req.user.id;

  const result = await authService.getUserProfile(userId);

  return successResponse(
    res,
    200,
    'User profile retrieved successfully',
    result
  );
});