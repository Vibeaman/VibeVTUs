export interface User {
  id: string;
  email: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  updated_at: string;
  created_at: string;
}

export type TransactionType = 'funding' | 'purchase' | 'withdrawal' | 'refund' | 'commission';
export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  reference: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type Network = 'mtn' | 'airtel' | 'glo' | '9mobile';
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface DataOrder {
  id: string;
  transaction_id: string | null;
  user_id: string;
  network: Network;
  phone_number: string;
  data_plan: string;
  status: OrderStatus;
  provider_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface AirtimeOrder {
  id: string;
  transaction_id: string | null;
  user_id: string;
  network: Network;
  phone_number: string;
  amount: number;
  status: OrderStatus;
  provider_reference: string | null;
  created_at: string;
  updated_at: string;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'promo';

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: NotificationType;
  read: boolean;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  bonus_paid: boolean;
  bonus_amount: number;
  created_at: string;
}
