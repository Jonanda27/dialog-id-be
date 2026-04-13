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
    result // Output sudah bersih dari service layer (tanpa hash password)
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
    result // Menyuplai User (termasuk status toko jika seller) + Token
  );
});

/**
 * @desc    Get current logged in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  // Integritas data dijaga: ID diekstrak dari header JWT, bukan dari body request
  const userId = req.user.id;

  const result = await authService.getUserProfile(userId);

  return successResponse(
    res,
    200,
    'User profile retrieved successfully',
    result
  );
});

/**
 * @desc    Logout user & membersihkan sesi
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = asyncHandler(async (req, res) => {
  await authService.logoutUser();

  return successResponse(
    res,
    200,
    'Logout berhasil'
  );
});