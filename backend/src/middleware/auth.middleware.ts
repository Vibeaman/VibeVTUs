/**
 * Authentication Middleware
 * Protects routes and ensures users can only access their own data
 */

import { Request, Response, NextFunction } from 'express';
import { getUser } from '../services/auth.service.js';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        phone?: string;
        referral_code?: string;
      };
    }
  }
}

/**
 * Authenticate user via Bearer token
 * Extracts user from JWT and attaches to request
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header',
        errorCode: 'UNAUTHORIZED',
      });
      return;
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'No token provided',
        errorCode: 'UNAUTHORIZED',
      });
      return;
    }

    const result = await getUser(token);

    if (!result.success || !result.user) {
      res.status(401).json({
        success: false,
        error: result.error || 'Invalid token',
        errorCode: 'INVALID_TOKEN',
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: result.user.id,
      email: result.user.email,
      phone: result.user.user_metadata?.phone,
      referral_code: result.user.user_metadata?.referral_code,
    };

    next();
  } catch (error) {
    console.error('[Auth Middleware] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
      errorCode: 'AUTH_ERROR',
    });
  }
}

/**
 * Validate that the authenticated user matches the requested userId
 * Used for endpoints like /api/wallet/:userId
 */
export function validateUserAccess(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestedUserId = req.params.userId;

  if (!requestedUserId) {
    res.status(400).json({
      success: false,
      error: 'User ID is required',
      errorCode: 'MISSING_USER_ID',
    });
    return;
  }

  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Not authenticated',
      errorCode: 'UNAUTHORIZED',
    });
    return;
  }

  // Check if the authenticated user matches the requested userId
  if (req.user.id !== requestedUserId) {
    res.status(403).json({
      success: false,
      error: 'You can only access your own data',
      errorCode: 'FORBIDDEN',
    });
    return;
  }

  next();
}

/**
 * Validate that the request body userId matches the authenticated user
 * Used for POST/PUT endpoints that include userId in body
 */
export function validateUserBodyAccess(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const bodyUserId = req.body.userId;

  if (!bodyUserId) {
    res.status(400).json({
      success: false,
      error: 'User ID is required in request body',
      errorCode: 'MISSING_USER_ID',
    });
    return;
  }

  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Not authenticated',
      errorCode: 'UNAUTHORIZED',
    });
    return;
  }

  // Check if the authenticated user matches the body userId
  if (req.user.id !== bodyUserId) {
    res.status(403).json({
      success: false,
      error: 'You can only perform actions on your own account',
      errorCode: 'FORBIDDEN',
    });
    return;
  }

  next();
}

/**
 * Optional authentication - doesn't fail if no token provided
 * Useful for endpoints that work differently for authenticated vs anonymous users
 */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth provided, continue without user
      next();
      return;
    }

    const token = authHeader.slice(7);
    const result = await getUser(token);

    if (result.success && result.user) {
      req.user = {
        id: result.user.id,
        email: result.user.email,
        phone: result.user.user_metadata?.phone,
        referral_code: result.user.user_metadata?.referral_code,
      };
    }

    next();
  } catch (error) {
    // Continue without user on error
    next();
  }
}
