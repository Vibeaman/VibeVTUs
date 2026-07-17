'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { vtuApi, walletApi } from '@/lib/api';
import { Alert, RefundAlert } from '@/components/UI';
import DashboardLayout from '@/components/DashboardLayout';

const NETWORKS = [
  { id: 'mtn', name: 'MTN', color: 'yellow' },
  { id: 'airtel', name: 'Airtel', color: 'red' },
  { id: 'glo', name: 'Glo', color: 'green' },
  { id: 'etisalat', name: '9mobile', color: 'blue' },
];

const DATA_PLANS: Record<string, any[]> = {
  mtn: [
    { id: 'mtn_500mb', name: '500MB', amount: 150, duration: '30 days' },
    { id: 'mtn_1gb', name: '1GB', amount: 250, duration: '30 days' },
    { id: 'mtn_2gb', name: '2GB', amount: 500, duration: '30 days' },
    { id: 'mtn_3gb', name: '3GB', amount: 750, duration: '30 days' },
    { id: 'mtn_5gb', name: '5GB', amount: 1200, duration: '30 days' },
    { id: 'mtn_10gb', name: '10GB', amount: 2300, duration: '30 days' },
  ],
  airtel: [
    { id: 'airtel_500mb', name: '500MB', amount: 150, duration: '30 days' },
    { id: 'airtel_1gb', name: '1GB', amount: 250, duration: '30 days' },
    { id: 'airtel_2gb', name: '2GB', amount: 500, duration: '30 days' },
    { id: 'airtel_3gb', name: '3GB', amount: 750, duration: '30 days' },
    { id: 'airtel_5gb', name: '5GB', amount: 1200, duration: '30 days' },
  ],
  glo: [
    { id: 'glo_500mb', name: '500MB', amount: 150, duration: '30 days' },
    { id: 'glo_1gb', name: '1GB', amount: 250, duration: '30 days' },
    { id: 'glo_2gb', name: '2GB', amount: 500, duration: '30 days' },
    { id: 'glo_3gb', name: '3GB', amount: 750, duration: '30 days' },
  ],
  etisalat: [
    { id: 'etisalat_500mb', name: '500MB', amount: 150, duration: '30 days' },
    { id: 'etisalat_1gb', name: '1GB', amount: 250, duration: '30 days' },
    { id: 'etisalat_2gb', name: '2GB', amount: 500, duration: '30 days' },
    { id: 'etisalat_3gb', name: '3GB', amount: 750, duration: '30 days' },
  ],
};

type PurchaseState = 'idle' | 'processing' | 'success' | 'failed';

export default function BuyDataPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const [network, setNetwork] = useState('mtn');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
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

  const handlePurchase = async () => {
    if (!user || !selectedPlan) return;

    if (!validatePhone(phoneNumber)) {
      setError('Please enter a valid Nigerian phone number');
      return;
    }

    if (balance < selectedPlan.amount) {
      setError(`Insufficient balance. You need ₦${selectedPlan.amount.toLocaleString()} but have ₦${balance.toLocaleString()}`);
      return;
    }

    setLoading(true);
    setError('');
    setPurchaseState('processing');

    const result = await vtuApi.buyData(
      user.id,
      network,
      phoneNumber,
      selectedPlan.id,
      selectedPlan.amount
    );

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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Data Purchase Successful!</h2>
            <p className="text-gray-600 mb-4">
              {selectedPlan?.name} of data has been sent to
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
                <span className="font-medium">₦{selectedPlan?.amount.toLocaleString()}</span>
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
            <p className="text-gray-600 mb-6">
              {phoneNumber} - {selectedPlan?.name}
            </p>

            {refunded && (
              <Alert type="warning" title="Funds Refunded" className="mb-6 text-left">
                Your payment of ₦{selectedPlan?.amount.toLocaleString()} has been refunded to your wallet.
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
            <p className="text-gray-600">Please wait while we process your data purchase.</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Buy Data</h1>
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
                  onClick={() => { setNetwork(net.id); setSelectedPlan(null); }}
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

          {/* Data Plans */}
          <div>
            <label className="label">Select Data Plan</label>
            <div className="space-y-2">
              {DATA_PLANS[network]?.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className={`w-full p-4 rounded-lg border text-left flex justify-between items-center transition-colors ${
                    selectedPlan?.id === plan.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-300 hover:border-emerald-500'
                  }`}
                >
                  <div>
                    <p className="font-medium text-gray-900">{plan.name}</p>
                    <p className="text-sm text-gray-500">{plan.duration}</p>
                  </div>
                  <p className="font-bold text-gray-900">₦{plan.amount.toLocaleString()}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          {selectedPlan && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Network</span>
                <span className="font-medium">{network.toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Phone</span>
                <span className="font-medium">{phoneNumber || '-'}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Plan</span>
                <span className="font-medium">{selectedPlan.name}</span>
              </div>
              <hr className="my-2" />
              <div className="flex justify-between">
                <span className="text-gray-600">Total</span>
                <span className="font-bold text-lg">₦{selectedPlan.amount.toLocaleString()}</span>
              </div>
            </div>
          )}

          <button
            onClick={handlePurchase}
            disabled={!selectedPlan || !phoneNumber || loading}
            className="btn-primary w-full"
          >
            {loading ? 'Processing...' : selectedPlan ? `Buy Data - ₦${selectedPlan.amount.toLocaleString()}` : 'Select a plan'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
