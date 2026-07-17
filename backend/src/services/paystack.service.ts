import crypto from 'crypto';
import { config } from '../config/index.js';

interface PaystackMetadata {
  userId: string;
  type: 'wallet_funding';
}

interface InitializeTransactionResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    reference: string;
    access_code: string;
    reference_code: string;
  };
}

interface VerifyTransactionResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    amount: number;
    currency: string;
    status: 'success' | 'failed' | 'abandoned' | 'pending';
    reference: string;
    metadata: PaystackMetadata;
    customer: {
      email: string;
    };
  };
}

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

/**
 * Initialize a Paystack transaction for wallet funding
 */
export async function initializeTransaction(
  email: string,
  amount: number, // in kobo (smallest currency unit)
  userId: string,
  reference?: string
): Promise<InitializeTransactionResponse> {
  const txReference = reference || generatePaystackReference();

  const payload = {
    email,
    amount,
    reference: txReference,
    callback_url: config.paystack.callbackUrl,
    metadata: {
      userId,
      type: 'wallet_funding',
    },
  };

  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.paystack.secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  return data as InitializeTransactionResponse;
}

/**
 * Verify a Paystack transaction by reference
 */
export async function verifyTransaction(reference: string): Promise<VerifyTransactionResponse> {
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${config.paystack.secretKey}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  return data as VerifyTransactionResponse;
}

/**
 * Verify Paystack webhook signature
 * Paystack sends 'x-paystack-signature' header with HMAC-SHA256 signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const hash = crypto
    .createHmac('sha512', config.paystack.secretKey)
    .update(payload, 'utf8')
    .digest('hex');

  return hash === signature;
}

/**
 * Parse raw body for webhook verification
 * Returns null if signature is invalid
 */
export function verifyWebhookRequest(
  rawBody: Buffer,
  signature: string
): { valid: boolean; payload?: PaystackWebhookEvent } {
  if (!verifyWebhookSignature(rawBody.toString('utf8'), signature)) {
    return { valid: false };
  }

  try {
    const payload = JSON.parse(rawBody.toString('utf8')) as PaystackWebhookEvent;
    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

export interface PaystackWebhookEvent {
  event: 'charge.success' | 'charge.failed' | 'transfer.failed' | string;
  data: {
    id: number;
    amount: number;
    currency: string;
    status: string;
    reference: string;
    metadata: PaystackMetadata;
    customer: {
      email: string;
    };
    paidAt?: string;
  };
}

/**
 * Generate a unique Paystack reference
 */
function generatePaystackReference(): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `VTU_${timestamp}_${random}`;
}

/**
 * Convert amount from naira to kobo (Paystack uses kobo)
 */
export function nairaToKobo(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Convert amount from kobo to naira
 */
export function koboToNaira(amount: number): number {
  return amount / 100;
}
