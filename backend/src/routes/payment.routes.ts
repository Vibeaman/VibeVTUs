import { Router } from 'express';
import {
  handleInitializePayment,
  handlePaystackWebhook,
} from '../controllers/payment.controller.js';

const router = Router();

// POST /api/payment/initialize - Initialize Paystack payment for wallet funding
router.post('/initialize', handleInitializePayment);

// POST /api/payment/webhook - Paystack webhook endpoint
router.post('/webhook', handlePaystackWebhook);

export default router;
