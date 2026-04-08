import express from 'express';
import { register, login } from '../controllers/authController.js';
import { validateRequest, registerSchema, loginSchema } from '../validations/authValidation.js';

const router = express.Router();

// Route: POST /api/auth/register
// Middleware 1: Validasi Zod -> Middleware 2: Controller logic
router.post('/register', validateRequest(registerSchema), register);

// Route: POST /api/auth/login
router.post('/login', validateRequest(loginSchema), login);

export default router;