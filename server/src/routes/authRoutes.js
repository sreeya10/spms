import express from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { logActivity } from '../middleware/audit.js';

const router = express.Router();

router.post('/register', logActivity('USER_REGISTER', 'User'), register);
router.post('/login', logActivity('USER_LOGIN', 'User'), login);
router.post('/forgot-password', logActivity('FORGOT_PASSWORD_REQUEST', 'User'), forgotPassword);
router.post('/reset-password', logActivity('RESET_PASSWORD_SUBMIT', 'User'), resetPassword);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, logActivity('PROFILE_UPDATE', 'User'), updateProfile);
router.put('/change-password', authenticate, logActivity('CHANGE_PASSWORD', 'User'), changePassword);

export default router;
