/**
 * VTPass Service
 * Handles all communication with VTPass API for airtime and data purchases
 * 
 * API Base URL: https://sandbox.vtpass.com/api (use live URL for production)
 */

import crypto from 'crypto';
import { config } from '../config/index.js';

export type Network = 'mtn' | 'airtel' | 'glo' | '9mobile';
export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface VTPassResponse {
  response_description: string;
  response_code: string;
  requestId?: string;
  content?: any;
  transactions?: any;
}

interface PurchaseResult {
  success: boolean;
  requestId?: string;
  error?: string;
  errorCode?: string;
  rawResponse?: any;
}

interface AirtimePurchaseParams {
  network: Network;
  phoneNumber: string;
  amount: number;
  reference: string;
}

interface DataPurchaseParams {
  network: Network;
  phoneNumber: string;
  dataPlan: string;
  reference: string;
}

const VTPASS_SANDBOX_URL = 'https://sandbox.vtpass.com/api';
const VTPASS_LIVE_URL = 'https://vtpass.com/api';

function getBaseUrl(): string {
  return config.nodeEnv === 'production' ? VTPASS_LIVE_URL : VTPASS_SANDBOX_URL;
}

/**
 * Generate VTPass request ID
 */
function generateVTPassRequestId(): string {
  return `VTP_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Make authenticated request to VTPass API
 */
async function vtpassRequest(
  endpoint: string,
  payload: Record<string, any>
): Promise<VTPassResponse> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  const requestId = generateVTPassRequestId();

  const authParams = `${config.vtpass.email}:${config.vtpass.apiKey}`;
  const authToken = Buffer.from(authParams).toString('base64');

  console.log(`[VTPass] ${requestId} - ${config.nodeEnv} - ${endpoint}`, {
    payload,
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authToken}`,
        'public-key': config.vtpass.publicKey || '',
      },
      body: JSON.stringify({
        request_id: requestId,
        ...payload,
      }),
    });

    const data = await response.json();

    console.log(`[VTPass] ${requestId} - Response:`, data);

    return data as VTPassResponse;
  } catch (error: any) {
    console.error(`[VTPass] ${requestId} - Network Error:`, error.message);
    return {
      response_description: 'NETWORK_ERROR',
      response_code: '96',
    };
  }
}

/**
 * Purchase Airtime via VTPass
 */
export async function purchaseAirtime(params: AirtimePurchaseParams): Promise<PurchaseResult> {
  const { network, phoneNumber, amount, reference } = params;

  // Map our network names to VTPass codes
  const networkCodes: Record<Network, string> = {
    mtn: 'MTN',
    airtel: 'AIRTEL',
    glo: 'GLO',
    '9mobile': 'ETISALAT', // VTPass uses ETISALAT for 9mobile
  };

  const response = await vtpassRequest('/pay', {
    serviceID: networkCodes[network],
    amount: amount.toString(),
    phone: phoneNumber,
    request_id: reference,
  });

  // VTPass response codes:
  // 000 = Success
  // 099 = Pending/Processing
  // Others = Failed

  if (response.response_code === '000') {
    return {
      success: true,
      requestId: response.requestId,
      rawResponse: response,
    };
  }

  // Check if it's a processing/pending status
  if (response.response_code === '099') {
    // For sandbox, treat pending as success (simulated instant delivery)
    if (config.nodeEnv !== 'production') {
      return {
        success: true,
        requestId: response.requestId,
        rawResponse: response,
      };
    }
    return {
      success: false,
      error: 'Transaction is processing. Please check status later.',
      errorCode: response.response_code,
      rawResponse: response,
    };
  }

  return {
    success: false,
    error: response.response_description || 'Airtime purchase failed',
    errorCode: response.response_code,
    rawResponse: response,
  };
}

/**
 * Purchase Data Bundle via VTPass
 */
export async function purchaseData(params: DataPurchaseParams): Promise<PurchaseResult> {
  const { network, phoneNumber, dataPlan, reference } = params;

  // Map our network names to VTPass codes
  const networkCodes: Record<Network, string> = {
    mtn: 'MTN',
    airtel: 'AIRTEL',
    glo: 'GLO',
    '9mobile': 'ETISALAT',
  };

  const response = await vtpassRequest('/pay', {
    serviceID: networkCodes[network],
    billersCode: phoneNumber,
    variation_code: dataPlan,
    amount: '', // VTPass gets amount from variation_code
    phone: phoneNumber,
    request_id: reference,
  });

  if (response.response_code === '000') {
    return {
      success: true,
      requestId: response.requestId,
      rawResponse: response,
    };
  }

  if (response.response_code === '099') {
    if (config.nodeEnv !== 'production') {
      return {
        success: true,
        requestId: response.requestId,
        rawResponse: response,
      };
    }
    return {
      success: false,
      error: 'Transaction is processing. Please check status later.',
      errorCode: response.response_code,
      rawResponse: response,
    };
  }

  return {
    success: false,
    error: response.response_description || 'Data purchase failed',
    errorCode: response.response_code,
    rawResponse: response,
  };
}

/**
 * Check transaction status on VTPass
 */
export async function checkTransactionStatus(requestId: string): Promise<{
  success: boolean;
  status: TransactionStatus;
  data?: any;
}> {
  const response = await vtpassRequest('/requery', {
    request_id: requestId,
  });

  if (response.response_code === '000') {
    return {
      success: true,
      status: 'completed',
      data: response.transactions,
    };
  }

  return {
    success: false,
    status: 'pending',
  };
}

/**
 * Get available data plans for a network
 */
export async function getDataPlans(network: Network): Promise<any[]> {
  const networkCodes: Record<Network, string> = {
    mtn: 'MTN',
    airtel: 'AIRTEL',
    glo: 'GLO',
    '9mobile': 'ETISALAT',
  };

  const response = await vtpassRequest('/varations', {
    serviceID: networkCodes[network],
  });

  if (response.response_code === '000') {
    return response.content?.variations || [];
  }

  return [];
}
