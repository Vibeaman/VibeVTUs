// API Client for VibeVTU Backend

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://vibevtus-production.up.railway.app/api';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  refunded?: boolean;
}

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const data = await response.json();
  return { ...data, success: response.ok };
}

// Auth API
export const authApi = {
  async signup(email: string, phone: string, password: string, referralCode?: string) {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, phone, password, referralCode }),
    });
    return handleResponse<{ userId: string; email: string; referralCode: string }>(res);
  },

  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse<{ userId: string; email: string; session: any }>(res);
    
    if (data.success && data.data?.session) {
      localStorage.setItem('access_token', data.data.session.access_token);
      localStorage.setItem('refresh_token', data.data.session.refresh_token);
      localStorage.setItem('user', JSON.stringify({ id: data.data.userId, email: data.data.email }));
    }
    
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getAuthHeaders() });
    return handleResponse<{ userId: string; email: string; phone: string; referralCode: string }>(res);
  },

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },
};

// Wallet API
export const walletApi = {
  async getBalance(userId: string) {
    const res = await fetch(`${API_BASE}/wallet/balance/${userId}`, { headers: getAuthHeaders() });
    return handleResponse<{ balance: number }>(res);
  },

  async getHistory(userId: string) {
    const res = await fetch(`${API_BASE}/wallet/history/${userId}`, { headers: getAuthHeaders() });
    return handleResponse<any[]>(res);
  },

  async initializePayment(userId: string, email: string, amount: number) {
    const res = await fetch(`${API_BASE}/payment/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email, amount }),
    });
    return handleResponse<{ authorizationUrl: string; reference: string }>(res);
  },
};

// VTU API
export const vtuApi = {
  async getNetworks() {
    const res = await fetch(`${API_BASE}/vtu/networks`);
    return handleResponse<{ id: string; name: string }[]>(res);
  },

  async getDataPlans(network: string) {
    const res = await fetch(`${API_BASE}/vtu/data-plans/${network}`);
    return handleResponse<any[]>(res);
  },

  async buyAirtime(userId: string, network: string, phoneNumber: string, amount: number) {
    const res = await fetch(`${API_BASE}/vtu/airtime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, network, phoneNumber, amount }),
    });
    return handleResponse<{ transactionId: string }>(res);
  },

  async buyData(userId: string, network: string, phoneNumber: string, dataPlan: string, amount: number) {
    const res = await fetch(`${API_BASE}/vtu/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, network, phoneNumber, dataPlan, amount }),
    });
    return handleResponse<{ transactionId: string }>(res);
  },
};

// Check if user is authenticated
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('access_token');
}

export function getCurrentUser(): { id: string; email: string } | null {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}
