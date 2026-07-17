'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { LoadingSpinner } from '@/components/UI';
import DashboardLayout from '@/components/DashboardLayout';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'promo';
  message: string;
  read: boolean;
  created_at: string;
}

// Demo notifications
const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'success',
    message: 'Your data purchase of 1GB to 08031234567 was successful!',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: '2',
    type: 'info',
    message: 'Your wallet has been funded with ₦5,000',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: '3',
    type: 'promo',
    message: 'Refer a friend and earn ₦100 for each successful signup!',
    read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: '4',
    type: 'warning',
    message: 'Your account balance is low. Fund your wallet to continue purchasing.',
    read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load notifications (demo for now)
    setTimeout(() => {
      setNotifications(DEMO_NOTIFICATIONS);
      setLoading(false);
    }, 500);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getBgColor = (type: string, read: boolean) => {
    if (read) return 'bg-gray-50';
    switch (type) {
      case 'success':
        return 'bg-green-50';
      case 'warning':
        return 'bg-amber-50';
      case 'error':
        return 'bg-red-50';
      case 'promo':
        return 'bg-purple-50';
      default:
        return 'bg-blue-50';
    }
  };

  const formatTime = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-emerald-500 text-white text-sm px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-emerald-600 hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>

        <div className="card">
          {loading ? (
            <div className="py-12">
              <LoadingSpinner />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`py-4 flex items-start gap-3 ${!notification.read ? 'font-medium' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getBgColor(notification.type, notification.read)}`}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900">{notification.message}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs text-emerald-600 hover:underline"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
