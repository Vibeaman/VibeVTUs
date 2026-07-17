import { Router } from 'express';
import {
  handlePurchaseAirtime,
  handlePurchaseData,
  handleGetNetworks,
  handleGetDataPlans,
} from '../controllers/vtu.controller.js';

const router = Router();

// POST /api/vtu/airtime - Purchase airtime
router.post('/airtime', handlePurchaseAirtime);

// POST /api/vtu/data - Purchase data bundle
router.post('/data', handlePurchaseData);

// GET /api/vtu/networks - Get available networks
router.get('/networks', handleGetNetworks);

// GET /api/vtu/data-plans/:network - Get data plans for a network
router.get('/data-plans/:network', handleGetDataPlans);

export default router;
