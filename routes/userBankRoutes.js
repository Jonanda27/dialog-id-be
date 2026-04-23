import express from 'express';
import * as userBankController from '../controllers/userBankController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// Semua route di sini memerlukan login
router.use(authenticate);

router.post('/', userBankController.addBank);
router.get('/', userBankController.getMyBanks);
router.delete('/:id', userBankController.removeBank);

export default router;