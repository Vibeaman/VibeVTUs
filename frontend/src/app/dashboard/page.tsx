'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wallet, Smartphone, CreditCard, ArrowUpRight, ArrowDownRight, Bell } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { walletApi } from '@/lib/api';
import { Alert } from '@/components/UI';
import DashboardLayout from '@/components/DashboardLayout';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  created_at: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    const [balanceRes, historyRes] = await Promise.all([
      walletApi.getBalance(user.id),
      walletApi.getHistory(user.id),
    ]);

    if (balanceRes.success) {
      setBalance(balanceRes.data?.balance || 0);
    }
    if (historyRes.success) {
      setRecentTx((historyRes.data || []).slice(0, 5));
    }

    setLoading(false);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'funding':
      case 'refund':
      case 'referral_bonus':
        return <ArrowDownRight className="w-4 h-4 text-green-600" />;
      case 'purchase':
      case 'airtime_purchase':
      case 'data_purchase':
        return <ArrowUpRight className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800',
      'failed-refunded': 'bg-amber-100 text-amber-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back!</h1>
            <p className="text-gray-600">{user?.email}</p>
          </div>
        </div>

        {/* Balance Card */}
        <div className="card bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm">Wallet Balance</p>
              {loading ? (
                <div className="h-10 w-32 bg-emerald-400 animate-pulse rounded mt-1" />
              ) : (
                <p className="text-4xl font-bold mt-1">{formatAmount(balance || 0)}</p>
              )}
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
              <Wallet className="w-7 h-7" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Link href="/fund" className="flex-1 bg-white/20 hover:bg-white/30 text-white text-center py-2 px-4 rounded-lg font-medium transition-colors">
              Fund Wallet
            </Link>
            <Link href="/buy-data" className="flex-1 bg-white text-emerald-600 hover:bg-emerald-50 text-center py-2 px-4 rounded-lg font-medium transition-colors">
              Buy Data
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/buy-data" className="card hover:border-emerald-500 transition-colors">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <Smartphone className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Buy Data</h3>
            <p className="text-sm text-gray-500">All networks</p>
          </Link>

          <Link href="/buy-airtime" className="card hover:border-emerald-500 transition-colors">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <CreditCard className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Buy Airtime</h3>
            <p className="text-sm text-gray-500">Top up easily</p>
          </Link>

          <Link href="/fund" className="card hover:border-emerald-500 transition-colors">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <Wallet className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Fund</h3>
            <p className="text-sm text-gray-500">Add money</p>
          </Link>

          <Link href="/history" className="card hover:border-emerald-500 transition-colors">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
              <Bell className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="font-semibold text-gray-900">History</h3>
            <p className="text-sm text-gray-500">View all</p>
          </Link>
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
            <Link href="/history" className="text-emerald-600 hover:underline text-sm font-medium">
              View all
            </Link>
          </div>

          {recentTx.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No transactions yet</p>
              <Link href="/buy-data" className="text-emerald-600 hover:underline text-sm mt-2 inline-block">
                Make your first purchase
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTx.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(tx.type)}
                    <div>
                      <p className="font-medium text-gray-900">{tx.description || tx.type}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(tx.created_at).toLocaleDateString('en-NG')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${tx.type.includes('funding') || tx.type.includes('refund') || tx.type.includes('bonus') ? 'text-green-600' : 'text-gray-900'}`}>
                      {tx.type.includes('funding') || tx.type.includes('refund') || tx.type.includes('bonus') ? '+' : '-'}{formatAmount(tx.amount)}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(tx.status)}`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Referral Info */}
        {user?.referralCode && (
          <div className="card bg-emerald-50 border-emerald-200">
            <h3 className="font-semibold text-gray-900 mb-2">Share & Earn</h3>
            <p className="text-sm text-gray-600 mb-3">Invite friends and earn ₦100 for each signup!</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={user.referralCode}
                readOnly
                className="input flex-1 bg-white"
              />
              <button
                onClick={() => navigator.clipboard.writeText(user.referralCode || '')}
                className="btn-primary px-4"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
