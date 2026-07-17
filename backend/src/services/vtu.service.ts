/**
 * VTU Service - Airtime & Data Purchase Logic
 * 
 * CRITICAL: This service handles real money transactions.
 * All operations are atomic - wallet changes and transaction records happen together.
 * 
 * Flow:
 * 1. Check wallet balance - reject if insufficient
 * 2. Debit wallet atomically (creates pending transaction)
 * 3. Call VTPass API to deliver airtime/data
 * 4. If success: mark transaction as completed
 * 5. If failure: refund wallet atomically, mark as failed-refunded
 */

import { supabaseAdmin } from '../config/supabase.js';
import { purchaseAirtime, purchaseData, type Network } from './vtpass.service.js';
import { v4 as uuidv4 } from 'uuid';

type VtuType = 'airtime' | 'data';

interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  errorCode?: string;
  refunded?: boolean;
}

/**
 * Generate a unique reference for VTU transactions
 */
function generateVtuReference(type: VtuType): string {
  const prefix = type === 'airtime' ? 'ATM' : 'DAT';
  const timestamp = Date.now();
  const random = uuidv4().split('-')[0];
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Get user's wallet balance
 */
async function getWalletBalance(userId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('wallets')
    .select('balance')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return 0;
  }

  return data.balance;
}

/**
 * Update transaction status
 */
async function updateTransactionStatus(
  reference: string,
  status: 'completed' | 'failed' | 'failed-refunded',
  metadata?: Record<string, any>
): Promise<void> {
  await supabaseAdmin
    .from('transactions')
    .update({
      status,
      metadata: metadata ? { ...metadata } : undefined,
    })
    .eq('reference', reference);
}

/**
 * Refund wallet - credit back the amount (atomic operation)
 */
async function refundWallet(
  userId: string,
  amount: number,
  originalReference: string
): Promise<boolean> {
  const refundReference = `RFD_${Date.now()}_${uuidv4().split('-')[0]}`;

  try {
    // Use the atomic credit function to refund
    const { error } = await supabaseAdmin.rpc('atomic_credit_wallet', {
      p_user_id: userId,
      p_amount: amount,
      p_reference: refundReference,
      p_type: 'refund',
      p_description: `Refund for failed ${originalReference}`,
    });

    if (error) {
      console.error('[VTU] Refund failed:', error);
      return false;
    }

    console.log(`[VTU] Refund successful: ${refundReference} -> ${originalReference}`);
    return true;
  } catch (err) {
    console.error('[VTU] Refund error:', err);
    return false;
  }
}

/**
 * Purchase Airtime
 * 
 * @returns PurchaseResult with success/error status
 */
export async function purchaseAirtimeService(
  userId: string,
  network: Network,
  phoneNumber: string,
  amount: number
): Promise<PurchaseResult> {
  const reference = generateVtuReference('airtime');
  const description = `Airtime purchase: ${network.toUpperCase()} ${phoneNumber} ₦${amount}`;

  console.log(`[VTU] Airtime purchase initiated: ${reference}`, {
    userId,
    network,
    phoneNumber,
    amount,
  });

  // Step 1: Check balance
  const balance = await getWalletBalance(userId);
  if (balance < amount) {
    console.log(`[VTU] Insufficient balance: ${balance} < ${amount}`);
    return {
      success: false,
      error: `Insufficient balance. You have ₦${balance.toFixed(2)} but need ₦${amount.toFixed(2)}`,
      errorCode: 'INSUFFICIENT_BALANCE',
    };
  }

  // Step 2: Debit wallet atomically
  console.log(`[VTU] Debiting wallet: ${reference}`);
  const debitResult = await supabaseAdmin.rpc('atomic_debit_wallet', {
    p_user_id: userId,
    p_amount: amount,
    p_reference: reference,
    p_type: 'airtime_purchase',
    p_description: description,
  });

  if (debitResult.error) {
    console.error(`[VTU] Wallet debit failed: ${debitResult.error.message}`);
    return {
      success: false,
      error: 'Failed to debit wallet. Please try again.',
      errorCode: 'DEBIT_FAILED',
    };
  }

  console.log(`[VTU] Wallet debited successfully: ${reference}`);

  // Step 3: Call VTPass API
  console.log(`[VTU] Calling VTPass API: ${reference}`);
  const purchaseResult = await purchaseAirtime({
    network,
    phoneNumber,
    amount,
    reference,
  });

  // Step 4: Handle result
  if (purchaseResult.success) {
    // Success - mark transaction as completed
    console.log(`[VTU] Purchase successful: ${reference}`);
    await updateTransactionStatus(reference, 'completed', {
      vtpass_request_id: purchaseResult.requestId,
      completed_at: new Date().toISOString(),
    });

    return {
      success: true,
      transactionId: reference,
    };
  }

  // Failure - refund wallet
  console.error(`[VTU] Purchase failed: ${reference}`, {
    error: purchaseResult.error,
    errorCode: purchaseResult.errorCode,
  });

  const refundSuccess = await refundWallet(userId, amount, reference);

  if (refundSuccess) {
    await updateTransactionStatus(reference, 'failed-refunded', {
      vtpass_error: purchaseResult.error,
      vtpass_error_code: purchaseResult.errorCode,
      refunded_at: new Date().toISOString(),
    });

    return {
      success: false,
      error: `Purchase failed. ₦${amount} has been refunded to your wallet.`,
      errorCode: purchaseResult.errorCode,
      refunded: true,
    };
  }

  // Refund failed - flag for manual review
  await updateTransactionStatus(reference, 'failed', {
    vtpass_error: purchaseResult.error,
    vtpass_error_code: purchaseResult.errorCode,
    refund_failed: true,
    needs_manual_review: true,
  });

  return {
    success: false,
    error: 'Purchase failed. Please contact support - your wallet will be refunded.',
    errorCode: purchaseResult.errorCode,
    refunded: false,
  };
}

/**
 * Purchase Data Bundle
 */
export async function purchaseDataService(
  userId: string,
  network: Network,
  phoneNumber: string,
  dataPlan: string,
  amount: number
): Promise<PurchaseResult> {
  const reference = generateVtuReference('data');
  const description = `Data purchase: ${network.toUpperCase()} ${phoneNumber} (${dataPlan}) ₦${amount}`;

  console.log(`[VTU] Data purchase initiated: ${reference}`, {
    userId,
    network,
    phoneNumber,
    dataPlan,
    amount,
  });

  // Step 1: Check balance
  const balance = await getWalletBalance(userId);
  if (balance < amount) {
    console.log(`[VTU] Insufficient balance: ${balance} < ${amount}`);
    return {
      success: false,
      error: `Insufficient balance. You have ₦${balance.toFixed(2)} but need ₦${amount.toFixed(2)}`,
      errorCode: 'INSUFFICIENT_BALANCE',
    };
  }

  // Step 2: Debit wallet atomically
  console.log(`[VTU] Debiting wallet: ${reference}`);
  const debitResult = await supabaseAdmin.rpc('atomic_debit_wallet', {
    p_user_id: userId,
    p_amount: amount,
    p_reference: reference,
    p_type: 'data_purchase',
    p_description: description,
  });

  if (debitResult.error) {
    console.error(`[VTU] Wallet debit failed: ${debitResult.error.message}`);
    return {
      success: false,
      error: 'Failed to debit wallet. Please try again.',
      errorCode: 'DEBIT_FAILED',
    };
  }

  console.log(`[VTU] Wallet debited successfully: ${reference}`);

  // Step 3: Call VTPass API
  console.log(`[VTU] Calling VTPass API: ${reference}`);
  const purchaseResult = await purchaseData({
    network,
    phoneNumber,
    dataPlan,
    reference,
  });

  // Step 4: Handle result
  if (purchaseResult.success) {
    console.log(`[VTU] Purchase successful: ${reference}`);
    await updateTransactionStatus(reference, 'completed', {
      vtpass_request_id: purchaseResult.requestId,
      data_plan: dataPlan,
      completed_at: new Date().toISOString(),
    });

    return {
      success: true,
      transactionId: reference,
    };
  }

  // Failure - refund wallet
  console.error(`[VTU] Purchase failed: ${reference}`, {
    error: purchaseResult.error,
    errorCode: purchaseResult.errorCode,
  });

  const refundSuccess = await refundWallet(userId, amount, reference);

  if (refundSuccess) {
    await updateTransactionStatus(reference, 'failed-refunded', {
      vtpass_error: purchaseResult.error,
      vtpass_error_code: purchaseResult.errorCode,
      refunded_at: new Date().toISOString(),
    });

    return {
      success: false,
      error: `Purchase failed. ₦${amount} has been refunded to your wallet.`,
      errorCode: purchaseResult.errorCode,
      refunded: true,
    };
  }

  // Refund failed - flag for manual review
  await updateTransactionStatus(reference, 'failed', {
    vtpass_error: purchaseResult.error,
    vtpass_error_code: purchaseResult.errorCode,
    refund_failed: true,
    needs_manual_review: true,
  });

  return {
    success: false,
    error: 'Purchase failed. Please contact support - your wallet will be refunded.',
    errorCode: purchaseResult.errorCode,
    refunded: false,
  };
}

/**
 * Get available networks
 */
export function getAvailableNetworks(): { id: Network; name: string }[] {
  return [
    { id: 'mtn', name: 'MTN' },
    { id: 'airtel', name: 'Airtel' },
    { id: 'glo', name: 'Glo' },
    { id: '9mobile', name: '9mobile' },
  ];
}
