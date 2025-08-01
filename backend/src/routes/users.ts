import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { 
  validate, 
  validationSchemas, 
  sanitize,
  authenticate,
  requireActiveAccount,
  requireVerifiedEmail
} from '../middleware';
import { 
  generalRateLimit,
  accountDeletionRateLimit,
  uploadRateLimit
} from '../middleware';

const router = Router();

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile',
  generalRateLimit,
  authenticate,
  requireActiveAccount,
  UserController.getProfile
);

/**
 * @route   PUT /api/users/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile',
  generalRateLimit,
  authenticate,
  requireActiveAccount,
  sanitize,
  validate(validationSchemas.updateProfile),
  UserController.updateProfile
);

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics and progress
 * @access  Private
 */
router.get('/stats',
  generalRateLimit,
  authenticate,
  requireActiveAccount,
  UserController.getStats
);

/**
 * @route   PUT /api/users/safety-profile
 * @desc    Update user safety profile
 * @access  Private
 */
router.put('/safety-profile',
  generalRateLimit,
  authenticate,
  requireActiveAccount,
  requireVerifiedEmail,
  sanitize,
  validate(validationSchemas.safetyProfile),
  UserController.updateSafetyProfile
);

/**
 * @route   DELETE /api/users/account
 * @desc    Delete user account and all data
 * @access  Private
 */
router.delete('/account',
  accountDeletionRateLimit,
  authenticate,
  requireActiveAccount,
  requireVerifiedEmail,
  sanitize,
  validate(validationSchemas.deleteAccount),
  UserController.deleteAccount
);

export default router;