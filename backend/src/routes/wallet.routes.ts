import { Router } from 'express';
import {
  handleCreditWallet,
  handleDebitWallet,
  handleGetBalance,
  handleGetHistory,
} from '../controllers/wallet.controller.js';
import { authenticate, validateUserAccess } from '../middleware/auth.middleware.js';

const router = Router();

// All wallet routes require authentication
router.use(authenticate);

// POST /api/wallet/credit - Credit wallet (user's own account)
router.post('/credit', validateUserAccess, handleCreditWallet);

// POST /api/wallet/debit - Debit wallet (user's own account)
router.post('/debit', validateUserAccess, handleDebitWallet);

// GET /api/wallet/balance/:userId - Get wallet balance
router.get('/balance/:userId', validateUserAccess, handleGetBalance);

// GET /api/wallet/history/:userId - Get transaction history
router.get('/history/:userId', validateUserAccess, handleGetHistory);

export default router;
