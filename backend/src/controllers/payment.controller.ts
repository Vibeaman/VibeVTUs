import { Request, Response } from 'express';
import {
  initializeTransaction,
  verifyWebhookSignature,
  nairaToKobo,
  type PaystackWebhookEvent,
} from '../services/paystack.service.js';
import { creditWallet } from '../services/wallet.service.js';
import { supabaseAdmin } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/payment/initialize
 * Initialize a Paystack transaction for wallet funding
 * 
 * Body: { userId, email, amount }
 * Returns: { authorizationUrl, reference }
 */
export async function handleInitializePayment(req: Request, res: Response) {
  try {
    const { userId, email, amount } = req.body;

    // Validate required fields
    if (!userId || !email || !amount) {
      return res.status(400).json({
        success: false,
        error: 'userId, email, and amount are required',
      });
    }

    // Validate amount (must be positive)
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be a positive number',
      });
    }

    // Check minimum amount (₦100)
    if (parsedAmount < 100) {
      return res.status(400).json({
        success: false,
        error: 'Minimum funding amount is ₦100',
      });
    }

    // Verify user exists
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Generate unique reference for this transaction
    const reference = `VTU_${Date.now()}_${uuidv4().split('-')[0]}`;

    // Convert amount to kobo (Paystack's smallest unit)
    const amountInKobo = nairaToKobo(parsedAmount);

    // Initialize Paystack transaction
    const result = await initializeTransaction(email, amountInKobo, userId, reference);

    if (!result.status) {
      console.error('Paystack initialization failed:', result.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to initialize payment',
      });
    }

    // Store pending transaction in database
    await supabaseAdmin.from('transactions').insert({
      user_id: userId,
      type: 'funding',
      amount: parsedAmount,
      status: 'pending',
      reference: reference,
      description: 'Wallet funding initiated',
      metadata: {
        paystack_reference: result.data.reference,
        paystack_authorization_url: result.data.authorization_url,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        authorizationUrl: result.data.authorization_url,
        reference: reference,
        amount: parsedAmount,
      },
    });
  } catch (error) {
    console.error('Error in handleInitializePayment:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * POST /api/payment/webhook
 * Paystack webhook endpoint - handles payment confirmation
 * 
 * IMPORTANT: This endpoint receives payment confirmations from Paystack
 * Wallet is ONLY credited here, never from the frontend
 */
export async function handlePaystackWebhook(req: Request, res: Response) {
  try {
    // Get signature from header
    const signature = req.headers['x-paystack-signature'] as string;

    if (!signature) {
      console.error('Missing Paystack signature');
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Get raw body (must be configured in Express to preserve raw body)
    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      console.error('Raw body not available for webhook verification');
      return res.status(400).json({ error: 'Invalid request' });
    }

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody.toString('utf8'), signature)) {
      console.error('Invalid Paystack signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = req.body as PaystackWebhookEvent;
    const eventType = event.event;
    const eventData = event.data;

    console.log(`Received Paystack webhook: ${eventType} for reference ${eventData.reference}`);

    // Handle successful charge
    if (eventType === 'charge.success') {
      await handleSuccessfulCharge(eventData);
    }

    // Handle failed charge
    if (eventType === 'charge.failed') {
      await handleFailedCharge(eventData);
    }

    // Always respond with 200 to acknowledge receipt
    // Paystack retries failed webhooks
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Return 500 so Paystack will retry
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

/**
 * Handle successful payment - credit the wallet
 */
async function handleSuccessfulCharge(eventData: PaystackWebhookEvent['data']) {
  const { reference, amount, metadata } = eventData;

  console.log(`Processing successful payment: ${reference}, amount: ${amount}`);

  // Get the pending transaction
  const { data: transaction, error: txError } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('reference', reference)
    .single();

  if (txError || !transaction) {
    console.error(`Transaction not found for reference: ${reference}`);
    return;
  }

  // Skip if already completed
  if (transaction.status === 'completed') {
    console.log(`Transaction ${reference} already processed, skipping`);
    return;
  }

  // Credit the wallet atomically
  const amountInNaira = amount / 100; // Convert from kobo
  const creditResult = await creditWallet(
    metadata.userId,
    amountInNaira,
    reference
  );

  if (creditResult.success) {
    // Update transaction status to completed
    await supabaseAdmin
      .from('transactions')
      .update({
        status: 'completed',
        metadata: {
          ...transaction.metadata,
          paystack_paid_at: eventData.paidAt || new Date().toISOString(),
          credited: true,
        },
      })
      .eq('reference', reference);

    // Create notification for user
    await supabaseAdmin.from('notifications').insert({
      user_id: metadata.userId,
      message: `Wallet funded successfully! ₦${amountInNaira.toLocaleString()} has been credited to your wallet.`,
      type: 'success',
    });

    console.log(`Wallet credited for user ${metadata.userId}: ₦${amountInNaira}`);
  } else {
    console.error(`Failed to credit wallet: ${creditResult.error}`);
    // Transaction remains in pending state for manual review
  }
}

/**
 * Handle failed payment - mark transaction as failed
 */
async function handleFailedCharge(eventData: PaystackWebhookEvent['data']) {
  const { reference, metadata } = eventData;

  console.log(`Processing failed payment: ${reference}`);

  // Get the pending transaction
  const { data: transaction, error: txError } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('reference', reference)
    .single();

  if (txError || !transaction) {
    console.error(`Transaction not found for reference: ${reference}`);
    return;
  }

  // Skip if already processed
  if (transaction.status !== 'pending') {
    return;
  }

  // Update transaction status to failed
  await supabaseAdmin
    .from('transactions')
    .update({
      status: 'failed',
      metadata: {
        ...transaction.metadata,
        failed_at: new Date().toISOString(),
        failure_reason: 'Payment was declined or abandoned',
      },
    })
    .eq('reference', reference);

  // Notify user
  await supabaseAdmin.from('notifications').insert({
    user_id: metadata.userId,
    message: 'Wallet funding failed. Please try again or contact support.',
    type: 'error',
  });

  console.log(`Payment ${reference} marked as failed`);
}
