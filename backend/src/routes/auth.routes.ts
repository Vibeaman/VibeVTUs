import { Router } from 'express';
import {
  handleSignup,
  handleLogin,
  handleGetProfile,
  handleGetMe,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.post('/signup', handleSignup);
router.post('/login', handleLogin);

// Protected routes (require authentication)
router.get('/me', authenticate, handleGetMe);
router.get('/profile', authenticate, handleGetProfile);

export default router;
