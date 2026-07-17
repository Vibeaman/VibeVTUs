import { Request, Response } from 'express';
import {
  creditWallet,
  debitWallet,
  getWalletBalance,
  getTransactionHistory,
  generateReference,
} from '../services/wallet.service.js';

/**
 * POST /api/wallet/credit
 * Credit a user's wallet (e.g., after successful Paystack payment)
 */
export async function handleCreditWallet(req: Request, res: Response) {
  try {
    const { userId, amount, reference } = req.body;

    // Validate required fields
    if (!userId || !amount) {
      return res.status(400).json({ error: 'userId and amount are required' });
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    // Generate reference if not provided
    const txReference = reference || generateReference('CRD');

    const result = await creditWallet(userId, parsedAmount, txReference);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(200).json({
      success: true,
      message: 'Wallet credited successfully',
      data: {
        newBalance: result.data?.balance,
        reference: txReference,
      },
    });
  } catch (error) {
    console.error('Error in handleCreditWallet:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/wallet/debit
 * Debit a user's wallet (e.g., for purchases)
 */
export async function handleDebitWallet(req: Request, res: Response) {
  try {
    const { userId, amount, reference, description } = req.body;

    // Validate required fields
    if (!userId || !amount) {
      return res.status(400).json({ error: 'userId and amount are required' });
    }

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    // Generate reference if not provided
    const txReference = reference || generateReference('DRB');

    const result = await debitWallet(userId, parsedAmount, txReference, description);

    if (!result.success) {
      // Return 400 for insufficient balance, 500 for other errors
      const isInsufficientBalance = result.error === 'Insufficient balance';
      return res.status(isInsufficientBalance ? 400 : 500).json({
        error: result.error,
        insufficientBalance: isInsufficientBalance,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Wallet debited successfully',
      data: {
        newBalance: result.data?.balance,
        reference: txReference,
      },
    });
  } catch (error) {
    console.error('Error in handleDebitWallet:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/wallet/balance/:userId
 * Get current wallet balance for a user
 */
export async function handleGetBalance(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await getWalletBalance(userId);

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    return res.status(200).json({
      success: true,
      data: {
        balance: result.balance,
        currency: 'NGN',
      },
    });
  } catch (error) {
    console.error('Error in handleGetBalance:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * GET /api/wallet/history/:userId
 * Get transaction history for a user
 */
export async function handleGetHistory(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await getTransactionHistory(userId, limit, offset);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        limit,
        offset,
        count: result.data?.length || 0,
      },
    });
  } catch (error) {
    console.error('Error in handleGetHistory:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
