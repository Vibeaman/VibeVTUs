import { Request, Response } from 'express';
import { signup, login, getUserProfile } from '../services/auth.service.js';

/**
 * POST /api/auth/signup
 * Register a new user
 */
export async function handleSignup(req: Request, res: Response) {
  try {
    const { email, phone, password, referralCode } = req.body;

    // Validate required fields
    if (!email || !phone || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email, phone, and password are required',
      });
    }

    const result = await signup({
      email,
      phone,
      password,
      referralCode,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        errorCode: result.errorCode,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        userId: result.user?.id,
        email: result.user?.email,
        referralCode: result.user?.user_metadata?.referral_code,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * POST /api/auth/login
 * Login with email and password
 */
export async function handleLogin(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const result = await login({ email, password });

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: result.error,
        errorCode: result.errorCode,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        userId: result.user?.id,
        email: result.user?.email,
        session: result.session,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/auth/profile
 * Get current user's profile (requires auth)
 */
export async function handleGetProfile(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    const result = await getUserProfile(userId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      data: result.profile,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * GET /api/auth/me
 * Get current user info (requires auth)
 */
export async function handleGetMe(req: Request, res: Response) {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        userId: user.id,
        email: user.email,
        phone: user.phone,
        referralCode: user.referral_code,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
