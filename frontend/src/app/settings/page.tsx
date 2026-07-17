'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, User, Bell, Shield, Copy, LogOut, Smartphone } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { Alert } from '@/components/UI';
import DashboardLayout from '@/components/DashboardLayout';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [copied, setCopied] = useState(false);

  const handleCopyReferral = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Profile Section */}
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  readOnly
                  className="input bg-gray-50"
                />
              </div>

              <div>
                <label className="label">Phone Number</label>
                <input
                  type="tel"
                  value={user?.phone || 'Not set'}
                  readOnly
                  className="input bg-gray-50"
                />
              </div>

              <div>
                <label className="label">Referral Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={user?.referralCode || ''}
                    readOnly
                    className="input bg-gray-50 flex-1 font-mono"
                  />
                  <button
                    onClick={handleCopyReferral}
                    className="btn-secondary px-4 flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Share this code to earn ₦100 for each referral
                </p>
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900">Push Notifications</p>
                  <p className="text-sm text-gray-500">Receive alerts for transactions</p>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5 text-emerald-500 rounded" />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-500">Get updates via email</p>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5 text-emerald-500 rounded" />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="font-medium text-gray-900">Promotional Emails</p>
                  <p className="text-sm text-gray-500">Receive offers and deals</p>
                </div>
                <input type="checkbox" className="w-5 h-5 text-emerald-500 rounded" />
              </label>
            </div>
          </div>

          {/* Security Section */}
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Security</h2>
            </div>

            <div className="space-y-4">
              <button className="w-full text-left py-3 px-4 rounded-lg border border-gray-200 hover:border-emerald-500 transition-colors">
                <p className="font-medium text-gray-900">Change Password</p>
                <p className="text-sm text-gray-500">Update your account password</p>
              </button>

              <button className="w-full text-left py-3 px-4 rounded-lg border border-gray-200 hover:border-emerald-500 transition-colors">
                <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                <p className="text-sm text-gray-500">Add extra security to your account</p>
              </button>
            </div>
          </div>

          {/* App Info */}
          <div className="card">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-gray-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">About</h2>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <p>App Version: 1.0.0</p>
              <p>Backend: vibevtus-production.up.railway.app</p>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Log Out
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
