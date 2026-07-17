import { Router } from 'express';
import {
  handlePurchaseAirtime,
  handlePurchaseData,
  handleGetNetworks,
  handleGetDataPlans,
} from '../controllers/vtu.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes (no auth needed for viewing networks/plans)
router.get('/networks', handleGetNetworks);
router.get('/data-plans/:network', handleGetDataPlans);

// Protected routes (auth required for purchases)
router.post('/airtime', authenticate, handlePurchaseAirtime);
router.post('/data', authenticate, handlePurchaseData);

export default router;
