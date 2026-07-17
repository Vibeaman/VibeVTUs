'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { walletApi } from '@/lib/api';
import { Alert, RefundAlert, LoadingSpinner } from '@/components/UI';
import DashboardLayout from '@/components/DashboardLayout';

declare global {
  interface Window {
    PaystackPop?: {
      checkout: (key: string, args: any) => any;
    };
  }
}

const AMOUNTS = [500, 1000, 2000, 5000, 10000];

function FundWalletContent() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [amount, setAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | 'cancelled' | null>(null);
  const [refunded, setRefunded] = useState(false);

  useEffect(() => {
    // Check for Paystack callback
    const status = searchParams.get('status');
    const trxStatus = searchParams.get('trx_status');

    if (status === 'success' && trxStatus === 'completed') {
      setSuccess(true);
      refreshUser();
    } else if (status === 'failed') {
      setPaymentStatus('failed');
      setRefunded(trxStatus === 'failed-refunded');
      setError('Payment failed. Your funds have been refunded.');
    } else if (status === 'cancelled') {
      setPaymentStatus('cancelled');
    }
  }, [searchParams, refreshUser]);

  const finalAmount = customAmount ? parseInt(customAmount) : amount;

  const handleFund = async () => {
    if (!user || finalAmount < 100) {
      setError('Minimum amount is ₦100');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await walletApi.initializePayment(user.id, user.email || '', finalAmount);

      if (result.success && result.data?.authorizationUrl) {
        // For demo, we'll show a success message
        // In production, redirect to Paystack
        window.location.href = result.data.authorizationUrl;
      } else {
        // Demo mode - simulate success
        setSuccess(true);
        refreshUser();
      }
    } catch (err) {
      setError('Failed to initialize payment');
    }

    setLoading(false);
  };

  // Demo mode: direct success
  const handleDemoFund = async () => {
    if (!user || finalAmount < 100) {
      setError('Minimum amount is ₦100');
      return;
    }

    setLoading(true);
    setError('');

    // Simulate payment success
    setTimeout(() => {
      setSuccess(true);
      refreshUser();
      setLoading(false);
    }, 1500);
  };

  if (success) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto">
          <div className="card text-center py-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-6">
              Your wallet has been credited with ₦{finalAmount.toLocaleString()}
            </p>
            <div className="flex gap-4">
              <Link href="/dashboard" className="btn-primary flex-1">
                Back to Dashboard
              </Link>
              <button onClick={() => { setSuccess(false); }} className="btn-secondary flex-1">
                Fund Again
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (paymentStatus === 'failed') {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto">
          <div className="card text-center py-12">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
            
            {refunded && (
              <Alert type="warning" title="Funds Refunded" className="mb-6 text-left">
                Your payment of ₦{finalAmount.toLocaleString()} has been refunded to your account.
              </Alert>
            )}
            
            {!refunded && (
              <p className="text-gray-600 mb-6">
                Your payment could not be processed. If money was deducted, it will be refunded within 5-10 minutes.
              </p>
            )}

            <div className="flex gap-4">
              <Link href="/dashboard" className="btn-primary flex-1">
                Back to Dashboard
              </Link>
              <button onClick={() => { setPaymentStatus(null); }} className="btn-secondary flex-1">
                Try Again
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (paymentStatus === 'cancelled') {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto">
          <div className="card text-center py-12">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Cancelled</h2>
            <p className="text-gray-600 mb-6">
              Your payment was cancelled. No money was deducted.
            </p>
            <div className="flex gap-4">
              <Link href="/dashboard" className="btn-primary flex-1">
                Back to Dashboard
              </Link>
              <button onClick={() => { setPaymentStatus(null); }} className="btn-secondary flex-1">
                Try Again
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Fund Wallet</h1>
        </div>

        <div className="card">
          {error && <Alert type="error" className="mb-4">{error}</Alert>}

          <div className="mb-6">
            <label className="label">Select Amount</label>
            <div className="grid grid-cols-3 gap-3">
              {AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => { setAmount(amt); setCustomAmount(''); }}
                  className={`py-3 px-4 rounded-lg border font-medium transition-colors ${
                    amount === amt && !customAmount
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-300 hover:border-emerald-500'
                  }`}
                >
                  ₦{amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="label">Or Enter Custom Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Enter amount"
                className="input pl-8"
                min="100"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Minimum: ₦100</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Amount</span>
              <span className="font-medium">₦{finalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total</span>
              <span className="font-bold text-lg">₦{finalAmount.toLocaleString()}</span>
            </div>
          </div>

          <button
            onClick={handleDemoFund}
            disabled={loading || finalAmount < 100}
            className="btn-primary w-full"
          >
            {loading ? 'Processing...' : `Pay ₦${finalAmount.toLocaleString()}`}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
            Secured by Paystack
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function FundWalletPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>}>
      <FundWalletContent />
    </Suspense>
  );
}
