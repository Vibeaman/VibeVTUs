/**
 * VTPass Service
 * Handles all communication with VTPass API for airtime and data purchases
 * 
 * API Documentation: https://vtpass.com/developers
 * 
 * Sandbox Test Phone Numbers for Airtime:
 * - 08011111111 → Success
 * - 201000000000 → Pending
 * - 400000000000 → No Response
 * - 300000000000 → Timeout
 * - Any other number → Failed
 */


import { config } from '../config/index.js';

export type Network = 'mtn' | 'airtel' | 'glo' | '9mobile';
export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface VTPassResponse {
  code: string;
  response_description: string;
  requestId?: string;
  content?: {
    transactions?: {
      status: string;
      product_name: string;
      phone: string;
      amount: string;
    };
    variations?: any[];
  };
}

interface PurchaseResult {
  success: boolean;
  requestId?: string;
  error?: string;
  errorCode?: string;
  rawResponse?: any;
  transactionStatus?: string;
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
 * Make authenticated request to VTPass API
 */
async function vtpassRequest(
  endpoint: string,
  payload: Record<string, any>
): Promise<VTPassResponse> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  const requestId = payload.request_id || `VTP_${Date.now()}`;

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
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log(`[VTPass] ${requestId} - Response:`, JSON.stringify(data, null, 2));

    return data as VTPassResponse;
  } catch (error: any) {
    console.error(`[VTPass] ${requestId} - Network Error:`, error.message);
    return {
      code: '96',
      response_description: 'NETWORK_ERROR: ' + error.message,
    };
  }
}

/**
 * Purchase Airtime via VTPass
 * 
 * Response codes:
 * - 000 = Success (delivered)
 * - 099 = Pending/Processing
 * - Other = Failed
 */
export async function purchaseAirtime(params: AirtimePurchaseParams): Promise<PurchaseResult> {
  const { network, phoneNumber, amount, reference } = params;

  // Map our network names to VTPass codes
  const networkCodes: Record<Network, string> = {
    mtn: 'mtn',
    airtel: 'airtel',
    glo: 'glo',
    '9mobile': 'etisalat',
  };

  const response = await vtpassRequest('/pay', {
    request_id: reference,
    serviceID: networkCodes[network],
    amount: amount,
    phone: phoneNumber,
  });

  // Check response code
  if (response.code === '000') {
    return {
      success: true,
      requestId: reference,
      transactionStatus: response.content?.transactions?.status || 'delivered',
      rawResponse: response,
    };
  }

  // Pending status
  if (response.code === '099') {
    return {
      success: false,
      error: 'Transaction is pending. Please check status later.',
      errorCode: 'PENDING',
      requestId: reference,
      rawResponse: response,
    };
  }

  return {
    success: false,
    error: response.response_description || 'Airtime purchase failed',
    errorCode: response.code,
    rawResponse: response,
  };
}

/**
 * Purchase Data Bundle via VTPass
 */
export async function purchaseData(params: DataPurchaseParams): Promise<PurchaseResult> {
  const { network, phoneNumber, dataPlan, reference } = params;

  const networkCodes: Record<Network, string> = {
    mtn: 'mtn',
    airtel: 'airtel',
    glo: 'glo',
    '9mobile': 'etisalat',
  };

  const response = await vtpassRequest('/pay', {
    request_id: reference,
    serviceID: networkCodes[network],
    billersCode: phoneNumber,
    variation_code: dataPlan,
    phone: phoneNumber,
  });

  if (response.code === '000') {
    return {
      success: true,
      requestId: reference,
      transactionStatus: response.content?.transactions?.status || 'delivered',
      rawResponse: response,
    };
  }

  if (response.code === '099') {
    return {
      success: false,
      error: 'Transaction is pending. Please check status later.',
      errorCode: 'PENDING',
      requestId: reference,
      rawResponse: response,
    };
  }

  return {
    success: false,
    error: response.response_description || 'Data purchase failed',
    errorCode: response.code,
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

  if (response.code === '000') {
    const txStatus = response.content?.transactions?.status;
    return {
      success: true,
      status: txStatus === 'delivered' ? 'completed' : 'pending',
      data: response.content?.transactions,
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
    mtn: 'mtn',
    airtel: 'airtel',
    glo: 'glo',
    '9mobile': 'etisalat',
  };

  const response = await vtpassRequest('/service-variations', {
    serviceID: networkCodes[network],
  });

  if (response.code === '000') {
    return response.content?.variations || [];
  }

  return [];
}
