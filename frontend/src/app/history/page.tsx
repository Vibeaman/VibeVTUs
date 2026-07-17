'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Filter, Download, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { walletApi } from '@/lib/api';
import { LoadingSpinner, Alert } from '@/components/UI';
import DashboardLayout from '@/components/DashboardLayout';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  reference: string;
  metadata: any;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  funding: 'Wallet Funding',
  purchase: 'Purchase',
  airtime_purchase: 'Airtime Purchase',
  data_purchase: 'Data Purchase',
  withdrawal: 'Withdrawal',
  refund: 'Refund',
  referral_bonus: 'Referral Bonus',
  commission: 'Commission',
  'failed-refunded': 'Refunded',
};

export default function HistoryPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user]);

  const loadTransactions = async () => {
    if (!user) return;
    setLoading(true);

    const res = await walletApi.getHistory(user.id);
    if (res.success) {
      setTransactions(res.data || []);
    }

    setLoading(false);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-NG', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeIcon = (type: string) => {
    const isCredit = ['funding', 'refund', 'referral_bonus', 'commission'].includes(type);
    return isCredit ? (
      <ArrowDownRight className="w-5 h-5 text-green-600" />
    ) : (
      <ArrowUpRight className="w-5 h-5 text-red-600" />
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800',
      'failed-refunded': 'bg-amber-100 text-amber-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredTx = transactions.filter((tx) => {
    if (filter === 'all') return true;
    if (filter === 'credit') return ['funding', 'refund', 'referral_bonus', 'commission'].includes(tx.type);
    if (filter === 'debit') return ['purchase', 'airtime_purchase', 'data_purchase', 'withdrawal'].includes(tx.type);
    return true;
  });

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
          </div>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('credit')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'credit' ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Credits
            </button>
            <button
              onClick={() => setFilter('debit')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'debit' ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Debits
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="card">
          {loading ? (
            <div className="py-12">
              <LoadingSpinner />
            </div>
          ) : filteredTx.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No transactions found</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredTx.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="py-4 cursor-pointer hover:bg-gray-50 transition-colors -mx-6 px-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        {getTypeIcon(tx.type)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {TYPE_LABELS[tx.type] || tx.type}
                        </p>
                        <p className="text-sm text-gray-500">{formatDate(tx.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        ['funding', 'refund', 'referral_bonus', 'commission'].includes(tx.type)
                          ? 'text-green-600'
                          : 'text-gray-900'
                      }`}>
                        {['funding', 'refund', 'referral_bonus', 'commission'].includes(tx.type) ? '+' : '-'}{formatAmount(tx.amount)}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(tx.status)}`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Transaction Details</h2>
              <button onClick={() => setSelectedTx(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Type</span>
                <span className="font-medium">{TYPE_LABELS[selectedTx.type] || selectedTx.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount</span>
                <span className="font-bold">{formatAmount(selectedTx.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`px-2 py-0.5 rounded-full text-sm ${getStatusBadge(selectedTx.status)}`}>
                  {selectedTx.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Reference</span>
                <span className="font-mono text-sm">{selectedTx.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="text-sm">{formatDate(selectedTx.created_at)}</span>
              </div>
              {selectedTx.description && (
                <div>
                  <span className="text-gray-500">Description</span>
                  <p className="mt-1 text-gray-900">{selectedTx.description}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-4">
              <button
                onClick={() => {
                  const text = `${TYPE_LABELS[selectedTx.type]} - ${formatAmount(selectedTx.amount)} - ${formatDate(selectedTx.created_at)} - Ref: ${selectedTx.reference}`;
                  navigator.clipboard.writeText(text);
                }}
                className="btn-secondary flex-1 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Copy Details
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
