import Link from 'next/link';
import { Smartphone, Zap, Shield, Clock, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">V</span>
            </div>
            <span className="font-bold text-xl text-gray-900">VibeVTU</span>
          </div>
          <div className="flex gap-4">
            <Link href="/login" className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium">
              Login
            </Link>
            <Link href="/register" className="btn-primary">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 bg-gradient-to-br from-emerald-50 to-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Buy Data & Airtime<br />
            <span className="text-emerald-600">Instantly & Securely</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            The fastest way to purchase mobile data and airtime for all Nigerian networks.
            MTN, Airtel, Glo, and 9mobile — all in one place.
          </p>
          <Link href="/register" className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4">
            Start Now <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose VibeVTU?
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Instant Delivery</h3>
              <p className="text-gray-600 text-sm">Your data and airtime are delivered within seconds</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Secure Payments</h3>
              <p className="text-gray-600 text-sm">All transactions are protected with Paystack</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">All Networks</h3>
              <p className="text-gray-600 text-sm">MTN, Airtel, Glo, and 9mobile supported</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">24/7 Available</h3>
              <p className="text-gray-600 text-sm">Purchase anytime, anywhere</p>
            </div>
          </div>
        </div>
      </section>

      {/* Networks */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Supported Networks
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['MTN', 'Airtel', 'Glo', '9mobile'].map((network) => (
              <div key={network} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <span className="font-bold text-gray-900">{network}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-emerald-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-emerald-100 mb-8">
            Create your free account and start buying data and airtime today.
          </p>
          <Link href="/register" className="bg-white text-emerald-600 font-semibold py-3 px-8 rounded-lg inline-flex items-center gap-2 hover:bg-emerald-50 transition-colors">
            Create Account <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>© 2024 VibeVTU. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
