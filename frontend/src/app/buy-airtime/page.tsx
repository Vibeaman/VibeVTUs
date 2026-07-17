'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { vtuApi, walletApi } from '@/lib/api';
import { Alert } from '@/components/UI';
import DashboardLayout from '@/components/DashboardLayout';

const NETWORKS = [
  { id: 'mtn', name: 'MTN' },
  { id: 'airtel', name: 'Airtel' },
  { id: 'glo', name: 'Glo' },
  { id: 'etisalat', name: '9mobile' },
];

const AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

type PurchaseState = 'idle' | 'processing' | 'success' | 'failed';

export default function BuyAirtimePage() {
  const { user, refreshUser } = useAuth();

  const [network, setNetwork] = useState('mtn');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState<number>(500);
  const [customAmount, setCustomAmount] = useState('');
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [purchaseState, setPurchaseState] = useState<PurchaseState>('idle');
  const [error, setError] = useState('');
  const [refunded, setRefunded] = useState(false);
  const [transactionId, setTransactionId] = useState('');

  useEffect(() => {
    if (user) {
      loadBalance();
    }
  }, [user]);

  const loadBalance = async () => {
    if (!user) return;
    const res = await walletApi.getBalance(user.id);
    if (res.success) {
      setBalance(res.data?.balance || 0);
    }
  };

  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\s/g, '');
    return /^(\+?234|0)[789][01]\d{8}$/.test(cleaned);
  };

  const finalAmount = customAmount ? parseInt(customAmount) : amount;

  const handlePurchase = async () => {
    if (!user) return;

    if (!validatePhone(phoneNumber)) {
      setError('Please enter a valid Nigerian phone number');
      return;
    }

    if (finalAmount < 50) {
      setError('Minimum amount is ₦50');
      return;
    }

    if (balance < finalAmount) {
      setError(`Insufficient balance. You need ₦${finalAmount.toLocaleString()} but have ₦${balance.toLocaleString()}`);
      return;
    }

    setLoading(true);
    setError('');
    setPurchaseState('processing');

    const result = await vtuApi.buyAirtime(user.id, network, phoneNumber, finalAmount);

    setLoading(false);

    if (result.success) {
      setTransactionId(result.data?.transactionId || 'TXN-' + Date.now());
      setPurchaseState('success');
      refreshUser();
    } else {
      setPurchaseState('failed');
      setRefunded(result.refunded || false);
      setError(result.error || 'Purchase failed');
    }
  };

  // Success State
  if (purchaseState === 'success') {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto">
          <div className="card text-center py-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Airtime Purchase Successful!</h2>
            <p className="text-gray-600 mb-4">
              ₦{finalAmount.toLocaleString()} airtime sent to
            </p>
            <p className="text-xl font-bold text-gray-900 mb-2">{phoneNumber}</p>
            <p className="text-sm text-gray-500 mb-6">Network: {network.toUpperCase()}</p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Transaction ID</span>
                <span className="font-mono text-xs">{transactionId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount</span>
                <span className="font-medium">₦{finalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <Link href="/dashboard" className="btn-primary flex-1">
                Back to Dashboard
              </Link>
              <button onClick={() => setPurchaseState('idle')} className="btn-secondary flex-1">
                Buy More
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Failed State
  if (purchaseState === 'failed') {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto">
          <div className="card text-center py-12">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Purchase Failed</h2>
            <p className="text-gray-600 mb-4">
              Airtime to {phoneNumber}
            </p>

            {refunded && (
              <Alert type="warning" title="Funds Refunded" className="mb-6 text-left">
                Your payment of ₦{finalAmount.toLocaleString()} has been refunded to your wallet.
              </Alert>
            )}

            {!refunded && (
              <Alert type="error" title="Funds Deducted" className="mb-6 text-left">
                Your funds were deducted but the purchase failed. Contact support for assistance.
              </Alert>
            )}

            <div className="flex gap-4">
              <Link href="/dashboard" className="btn-primary flex-1">
                Back to Dashboard
              </Link>
              <button onClick={() => { setPurchaseState('idle'); setError(''); }} className="btn-secondary flex-1">
                Try Again
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Processing State
  if (purchaseState === 'processing') {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto">
          <div className="card text-center py-12">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Purchase...</h2>
            <p className="text-gray-600">Please wait while we process your airtime purchase.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Normal Form State
  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Buy Airtime</h1>
            <p className="text-sm text-gray-500">Balance: ₦{balance.toLocaleString()}</p>
          </div>
        </div>

        <div className="card space-y-6">
          {error && <Alert type="error" className="mb-4">{error}</Alert>}

          {/* Network Selection */}
          <div>
            <label className="label">Select Network</label>
            <div className="grid grid-cols-4 gap-3">
              {NETWORKS.map((net) => (
                <button
                  key={net.id}
                  onClick={() => setNetwork(net.id)}
                  className={`py-3 px-2 rounded-lg border text-center font-medium transition-colors ${
                    network === net.id
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-300 hover:border-emerald-500'
                  }`}
                >
                  {net.name}
                </button>
              ))}
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="label">Phone Number</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="input"
              placeholder="08031234567"
            />
          </div>

          {/* Amount Selection */}
          <div>
            <label className="label">Select Amount</label>
            <div className="grid grid-cols-3 gap-3">
              {AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => { setAmount(amt); setCustomAmount(''); }}
                  className={`py-3 rounded-lg border font-medium transition-colors ${
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

          {/* Custom Amount */}
          <div>
            <label className="label">Or Enter Custom Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Enter amount"
                className="input pl-8"
                min="50"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Minimum: ₦50</p>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Network</span>
              <span className="font-medium">{network.toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Phone</span>
              <span className="font-medium">{phoneNumber || '-'}</span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between">
              <span className="text-gray-600">Total</span>
              <span className="font-bold text-lg">₦{finalAmount.toLocaleString()}</span>
            </div>
          </div>

          <button
            onClick={handlePurchase}
            disabled={!phoneNumber || loading || finalAmount < 50}
            className="btn-primary w-full"
          >
            {loading ? 'Processing...' : `Buy Airtime - ₦${finalAmount.toLocaleString()}`}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
