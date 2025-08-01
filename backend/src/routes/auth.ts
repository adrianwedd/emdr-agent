import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { 
  validate, 
  validationSchemas, 
  sanitize,
  authenticate,
  optionalAuth
} from '../middleware';
import { 
  authRateLimit, 
  loginRateLimit, 
  registrationRateLimit, 
  passwordResetRateLimit 
} from '../middleware';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register',
  registrationRateLimit,
  sanitize,
  validate(validationSchemas.register),
  AuthController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login',
  loginRateLimit,
  sanitize,
  validate(validationSchemas.login),
  AuthController.login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh',
  authRateLimit,
  sanitize,
  validate(validationSchemas.refreshToken),
  AuthController.refreshToken
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me',
  authenticate,
  AuthController.getCurrentUser
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout',
  authenticate,
  AuthController.logout
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put('/change-password',
  authenticate,
  authRateLimit,
  sanitize,
  validate(validationSchemas.changePassword),
  AuthController.changePassword
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password',
  passwordResetRateLimit,
  sanitize,
  validate({
    body: validationSchemas.login.body.pick({ email: true })
  }),
  AuthController.requestPasswordReset
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post('/verify-email',
  authRateLimit,
  sanitize,
  validate({
    body: validationSchemas.refreshToken.body.pick({ refreshToken: true }).extend({
      token: validationSchemas.refreshToken.body.shape.refreshToken
    }).omit({ refreshToken: true })
  }),
  AuthController.verifyEmail
);

/**
 * @route   GET /api/auth/status
 * @desc    Get authentication status and basic system info
 * @access  Public (with optional auth)
 */
router.get('/status',
  optionalAuth,
  AuthController.getAuthStatus
);

export default router;