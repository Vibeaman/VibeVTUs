import { supabaseAdmin } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';

interface WalletResult {
  success: boolean;
  data?: { balance: number; user_id: string };
  error?: string;
}

interface BalanceResult {
  success: boolean;
  balance?: number;
  error?: string;
}

interface HistoryResult {
  success: boolean;
  data?: any[];
  error?: string;
}

/**
 * Credit a user's wallet atomically
 * Creates a transaction record and updates balance in a single transaction
 */
export async function creditWallet(
  userId: string,
  amount: number,
  reference: string
): Promise<WalletResult> {
  if (amount <= 0) {
    return { success: false, error: 'Amount must be positive' };
  }

  try {
    // Use a database transaction for atomicity
    const { data: result, error: rpcError } = await supabaseAdmin.rpc('atomic_credit_wallet', {
      p_user_id: userId,
      p_amount: amount,
      p_reference: reference,
      p_type: 'funding',
      p_description: 'Wallet funding',
    });

    if (rpcError) {
      // Check if reference already exists (duplicate transaction)
      if (rpcError.message.includes('duplicate key') || rpcError.code === '23505') {
        return { success: false, error: 'Transaction reference already exists' };
      }
      return { success: false, error: rpcError.message };
    }

    if (!result) {
      return { success: false, error: 'Failed to credit wallet' };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Error crediting wallet:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Debit a user's wallet atomically
 * Validates balance before debiting and rejects if insufficient
 * All operations happen in a single transaction - all or nothing
 */
export async function debitWallet(
  userId: string,
  amount: number,
  reference: string,
  description: string = 'Purchase'
): Promise<WalletResult> {
  if (amount <= 0) {
    return { success: false, error: 'Amount must be positive' };
  }

  try {
    // Use a database function for atomic debit with balance check
    const { data: result, error: rpcError } = await supabaseAdmin.rpc('atomic_debit_wallet', {
      p_user_id: userId,
      p_amount: amount,
      p_reference: reference,
      p_type: 'purchase',
      p_description: description,
    });

    if (rpcError) {
      // Check if reference already exists
      if (rpcError.message.includes('duplicate key') || rpcError.code === '23505') {
        return { success: false, error: 'Transaction reference already exists' };
      }
      // Insufficient balance
      if (rpcError.message.includes('Insufficient balance') || rpcError.message.includes('would go negative')) {
        return { success: false, error: 'Insufficient balance' };
      }
      return { success: false, error: rpcError.message };
    }

    if (!result) {
      return { success: false, error: 'Failed to debit wallet' };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Error debiting wallet:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Get current wallet balance for a user
 */
export async function getWalletBalance(userId: string): Promise<BalanceResult> {
  try {
    const { data, error } = await supabaseAdmin
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Wallet not found' };
      }
      return { success: false, error: error.message };
    }

    return { success: true, balance: data.balance };
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Get transaction history for a user
 */
export async function getTransactionHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<HistoryResult> {
  try {
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error getting transaction history:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Create a wallet for a user (used during user creation)
 */
export async function createWallet(userId: string): Promise<WalletResult> {
  try {
    const { data, error } = await supabaseAdmin
      .from('wallets')
      .insert({ user_id: userId, balance: 0, currency: 'NGN' })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error creating wallet:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Generate a unique transaction reference
 */
export function generateReference(prefix: string = 'TXN'): string {
  const timestamp = Date.now();
  const random = uuidv4().split('-')[0];
  return `${prefix}_${timestamp}_${random}`;
}
