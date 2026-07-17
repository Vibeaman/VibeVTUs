'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { Alert } from '@/components/UI';
import { LoadingSpinner } from '@/components/UI';

function RegisterForm() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get referral code from URL if present
  const ref = searchParams.get('ref');
  if (ref && !referralCode) setReferralCode(ref);

  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\s/g, '');
    return /^(\+?234|0)[789][01]\d{8}$/.test(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!validatePhone(phone)) {
      setError('Please enter a valid Nigerian phone number (e.g., 08031234567)');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await signup(email, phone, password, referralCode || undefined);
    setLoading(false);

    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">V</span>
            </div>
            <span className="font-bold text-2xl text-gray-900">VibeVTU</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="text-gray-600 mt-2">Start buying data and airtime today</p>
        </div>

        <div className="card">
          {error && <Alert type="error" className="mb-4">{error}</Alert>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="label">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
                placeholder="08031234567"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Nigerian phone number (e.g., 08031234567)</p>
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="At least 6 characters"
                required
              />
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="Confirm your password"
                required
              />
            </div>

            <div>
              <label className="label">Referral Code (Optional)</label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="input"
                placeholder="VIBEXXXX"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>}>
      <RegisterForm />
    </Suspense>
  );
}
