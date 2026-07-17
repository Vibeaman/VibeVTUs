import { Request, Response } from 'express';
import {
  purchaseAirtimeService,
  purchaseDataService,
  getAvailableNetworks,
} from '../services/vtu.service.js';
import { getDataPlans } from '../services/vtpass.service.js';
import type { Network } from '../services/vtpass.service.js';

// Valid networks
const VALID_NETWORKS: Network[] = ['mtn', 'airtel', 'glo', '9mobile'];

/**
 * POST /api/vtu/airtime
 * Purchase airtime
 */
export async function handlePurchaseAirtime(req: Request, res: Response) {
  try {
    const { userId, network, phoneNumber, amount } = req.body;

    // Validate required fields
    if (!userId || !network || !phoneNumber || !amount) {
      return res.status(400).json({
        success: false,
        error: 'userId, network, phoneNumber, and amount are required',
      });
    }

    // Validate network
    if (!VALID_NETWORKS.includes(network)) {
      return res.status(400).json({
        success: false,
        error: `Invalid network. Valid options: ${VALID_NETWORKS.join(', ')}`,
      });
    }

    // Validate phone number format (basic Nigerian check)
    const phoneRegex = /^(\+?234|0)[789][01]\d{8}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Nigerian phone number format',
      });
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 50) {
      return res.status(400).json({
        success: false,
        error: 'Minimum airtime purchase is ₦50',
      });
    }

    if (parsedAmount > 50000) {
      return res.status(400).json({
        success: false,
        error: 'Maximum airtime purchase is ₦50,000',
      });
    }

    // Purchase airtime
    const result = await purchaseAirtimeService(
      userId,
      network,
      phoneNumber,
      parsedAmount
    );

    if (!result.success) {
      const statusCode = result.errorCode === 'INSUFFICIENT_BALANCE' ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        error: result.error,
        errorCode: result.errorCode,
        refunded: result.refunded,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Airtime purchased successfully',
      data: {
        transactionId: result.transactionId,
      },
    });
  } catch (error) {
    console.error('Error in handlePurchaseAirtime:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * POST /api/vtu/data
 * Purchase data bundle
 */
export async function handlePurchaseData(req: Request, res: Response) {
  try {
    const { userId, network, phoneNumber, dataPlan, amount } = req.body;

    // Validate required fields
    if (!userId || !network || !phoneNumber || !dataPlan) {
      return res.status(400).json({
        success: false,
        error: 'userId, network, phoneNumber, and dataPlan are required',
      });
    }

    // Validate network
    if (!VALID_NETWORKS.includes(network)) {
      return res.status(400).json({
        success: false,
        error: `Invalid network. Valid options: ${VALID_NETWORKS.join(', ')}`,
      });
    }

    // Validate phone number
    const phoneRegex = /^(\+?234|0)[789][01]\d{8}$/;
    if (!phoneRegex.test(phoneNumber.replace(/\s/g, ''))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Nigerian phone number format',
      });
    }

    // Validate data plan
    if (!dataPlan || dataPlan.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Data plan is required',
      });
    }

    // Amount should be validated by the service (varies by plan)
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount',
      });
    }

    // Purchase data
    const result = await purchaseDataService(
      userId,
      network,
      phoneNumber,
      dataPlan,
      parsedAmount
    );

    if (!result.success) {
      const statusCode = result.errorCode === 'INSUFFICIENT_BALANCE' ? 400 : 500;
      return res.status(statusCode).json({
        success: false,
        error: result.error,
        errorCode: result.errorCode,
        refunded: result.refunded,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Data bundle purchased successfully',
      data: {
        transactionId: result.transactionId,
      },
    });
  } catch (error) {
    console.error('Error in handlePurchaseData:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/vtu/networks
 * Get available networks
 */
export async function handleGetNetworks(_req: Request, res: Response) {
  try {
    const networks = getAvailableNetworks();
    return res.status(200).json({
      success: true,
      data: networks,
    });
  } catch (error) {
    console.error('Error in handleGetNetworks:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/vtu/data-plans/:network
 * Get available data plans for a network
 */
export async function handleGetDataPlans(req: Request, res: Response) {
  try {
    const { network } = req.params;

    if (!VALID_NETWORKS.includes(network as Network)) {
      return res.status(400).json({
        success: false,
        error: `Invalid network. Valid options: ${VALID_NETWORKS.join(', ')}`,
      });
    }

    const plans = await getDataPlans(network as Network);

    return res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error) {
    console.error('Error in handleGetDataPlans:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
