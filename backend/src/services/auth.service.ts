/**
 * Authentication Service
 * Handles user signup, login, and authentication with Supabase Auth
 */

import { supabaseAdmin } from '../config/supabase.js';
import { createClient, User } from '@supabase/supabase-js';

export interface SignupParams {
  email: string;
  phone: string;
  password: string;
  referralCode?: string;
}

export interface LoginParams {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  session?: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at: number;
  };
  error?: string;
  errorCode?: string;
}

/**
 * Generate a unique referral code for a user
 */
function generateReferralCode(userId: string): string {
  const prefix = 'VIBE';
  const shortId = userId.split('-')[0].toUpperCase();
  return `${prefix}${shortId}`;
}

/**
 * Validate phone number (Nigerian format)
 */
export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\s/g, '');
  // Accept formats: 080xxxx, +23480xxxx, 23480xxxx
  const phoneRegex = /^(\+?234|0)[789][01]\d{8}$/;
  return phoneRegex.test(cleaned);
}

/**
 * Normalize phone number to +234 format
 */
export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.startsWith('0')) {
    return '+234' + cleaned.slice(1);
  }
  if (cleaned.startsWith('234')) {
    return '+' + cleaned;
  }
  return cleaned;
}

/**
 * Sign up a new user
 * - Creates auth user with email + phone metadata
 * - Creates wallet with zero balance
 * - Records referral if provided
 */
export async function signup(params: SignupParams): Promise<AuthResult> {
  const { email, phone, password, referralCode } = params;

  // Validate phone
  if (!validatePhone(phone)) {
    return {
      success: false,
      error: 'Invalid Nigerian phone number',
      errorCode: 'INVALID_PHONE',
    };
  }

  // Validate email
  if (!email || !email.includes('@')) {
    return {
      success: false,
      error: 'Invalid email address',
      errorCode: 'INVALID_EMAIL',
    };
  }

  // Validate password (min 6 chars)
  if (!password || password.length < 6) {
    return {
      success: false,
      error: 'Password must be at least 6 characters',
      errorCode: 'INVALID_PASSWORD',
    };
  }

  try {
    // Create auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      phone: normalizePhone(phone),
      password: password,
      email_confirm: true, // Auto-confirm for simplicity (change in production)
      user_metadata: {
        phone: normalizePhone(phone),
        referral_code_used: referralCode || null,
      },
    });

    if (authError) {
      console.error('[Auth] Signup error:', authError);
      return {
        success: false,
        error: authError.message,
        errorCode: 'AUTH_ERROR',
      };
    }

    if (!authUser?.user) {
      return {
        success: false,
        error: 'Failed to create user',
        errorCode: 'UNKNOWN_ERROR',
      };
    }

    const userId = authUser.user.id;

    // Generate referral code for new user
    const newUserReferralCode = generateReferralCode(userId);

    // Update user metadata with their referral code
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        phone: normalizePhone(phone),
        referral_code: newUserReferralCode,
        referral_code_used: referralCode || null,
      },
    });

    // Record referral if provided
    if (referralCode) {
      await recordReferral(userId, referralCode, email);
    }

    // Create wallet for user (handled by database trigger, but ensure it exists)
    await ensureWalletExists(userId);

    console.log(`[Auth] User signed up: ${userId}, referral code: ${newUserReferralCode}`);

    return {
      success: true,
      user: authUser.user,
    };
  } catch (error: any) {
    console.error('[Auth] Signup exception:', error);
    return {
      success: false,
      error: error.message || 'An error occurred during signup',
      errorCode: 'EXCEPTION',
    };
  }
}

/**
 * Login with email and password
 */
export async function login(params: LoginParams): Promise<AuthResult> {
  const { email, password } = params;

  // Create a client for authentication (not admin, to properly verify password)
  const authClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  try {
    const { data, error } = await authClient.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.error('[Auth] Login error:', error);
      return {
        success: false,
        error: error.message,
        errorCode: 'INVALID_CREDENTIALS',
      };
    }

    if (!data.user || !data.session) {
      return {
        success: false,
        error: 'Login failed',
        errorCode: 'UNKNOWN_ERROR',
      };
    }

    return {
      success: true,
      user: data.user,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at || Math.floor(Date.now() / 1000) + data.session.expires_in,
      },
    };
  } catch (error: any) {
    console.error('[Auth] Login exception:', error);
    return {
      success: false,
      error: error.message || 'An error occurred during login',
      errorCode: 'EXCEPTION',
    };
  }
}

/**
 * Get user by access token
 */
export async function getUser(accessToken: string): Promise<{
  success: boolean;
  user?: User;
  error?: string;
}> {
  const authClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  const { data, error } = await authClient.auth.getUser(accessToken);

  if (error || !data.user) {
    return {
      success: false,
      error: error?.message || 'Invalid token',
    };
  }

  return {
    success: true,
    user: data.user,
  };
}

/**
 * Record a referral
 */
async function recordReferral(newUserId: string, referralCode: string, newUserEmail: string): Promise<void> {
  // Find the user who owns this referral code
  const { data: referrer } = await supabaseAdmin
    .from('profiles')
    .select('user_id')
    .eq('referral_code', referralCode)
    .single();

  if (!referrer) {
    console.log(`[Auth] Referral code ${referralCode} not found`);
    return;
  }

  // Record the referral
  await supabaseAdmin.from('referrals').insert({
    referrer_id: referrer.user_id,
    referred_id: newUserId,
    referral_code: referralCode,
    referred_email: newUserEmail,
    status: 'pending', // Will become 'completed' after first purchase
  });

  console.log(`[Auth] Referral recorded: ${referrer.user_id} referred ${newUserId}`);
}

/**
 * Ensure wallet exists for user
 */
async function ensureWalletExists(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('wallets')
    .upsert({ user_id: userId, balance: 0 }, { onConflict: 'user_id' });

  if (error) {
    console.error('[Auth] Failed to create wallet:', error);
  }
}

/**
 * Get user's profile with referral info
 */
export async function getUserProfile(userId: string): Promise<{
  success: boolean;
  profile?: {
    referral_code: string;
    referred_count: number;
    total_earned: number;
  };
  error?: string;
}> {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('referral_code')
    .eq('user_id', userId)
    .single();

  if (error || !profile) {
    return {
      success: false,
      error: 'Profile not found',
    };
  }

  // Get referral stats
  const { count: referredCount } = await supabaseAdmin
    .from('referrals')
    .select('*', { count: 'exact', head: true })
    .eq('referrer_id', userId);

  return {
    success: true,
    profile: {
      referral_code: profile.referral_code,
      referred_count: referredCount || 0,
      total_earned: 0, // Calculate from completed referrals
    },
  };
}
