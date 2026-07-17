import { Router } from 'express';
import {
  handleCreditWallet,
  handleDebitWallet,
  handleGetBalance,
  handleGetHistory,
} from '../controllers/wallet.controller.js';

const router = Router();

// POST /api/wallet/credit - Credit wallet
router.post('/credit', handleCreditWallet);

// POST /api/wallet/debit - Debit wallet
router.post('/debit', handleDebitWallet);

// GET /api/wallet/balance/:userId - Get wallet balance
router.get('/balance/:userId', handleGetBalance);

// GET /api/wallet/history/:userId - Get transaction history
router.get('/history/:userId', handleGetHistory);

export default router;
