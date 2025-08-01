import { Request, Response } from 'express';
import { authService } from '../services';
import { logger } from '../utils/logger';
import { prismaService } from '../services';

export class AuthController {
  /**
   * Register new user
   * POST /api/auth/register
   */
  static async register(req: Request, res: Response) {
    try {
      const { email, password, firstName, lastName } = req.body;

      logger.info(`Registration attempt for email: ${email}`);

      const result = await authService.register({
        email,
        password,
        firstName,
        lastName
      });

      logger.info(`User registered successfully: ${result.user.email} (${result.user.id})`);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: result.user,
          tokens: result.tokens
        }
      });
    } catch (error) {
      logger.error('Registration failed:', error);
      
      const message = error instanceof Error ? error.message : 'Registration failed';
      const statusCode = message.includes('already exists') ? 409 : 400;

      res.status(statusCode).json({
        success: false,
        error: 'Registration failed',
        message
      });
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      logger.info(`Login attempt for email: ${email}`);

      const result = await authService.login({ email, password });

      logger.info(`User logged in successfully: ${result.user.email} (${result.user.id})`);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          tokens: result.tokens
        }
      });
    } catch (error) {
      logger.error('Login failed:', error);
      
      const message = error instanceof Error ? error.message : 'Login failed';
      const statusCode = message.includes('Invalid email or password') ? 401 : 400;

      res.status(statusCode).json({
        success: false,
        error: 'Login failed',
        message
      });
    }
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      logger.debug('Token refresh attempt');

      const tokens = await authService.refreshToken(refreshToken);

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: { tokens }
      });
    } catch (error) {
      logger.error('Token refresh failed:', error);
      
      res.status(401).json({
        success: false,
        error: 'Token refresh failed',
        message: 'Invalid or expired refresh token'
      });
    }
  }

  /**
   * Get current user
   * GET /api/auth/me
   */
  static async getCurrentUser(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'User not authenticated'
        });
      }

      res.json({
        success: true,
        message: 'User retrieved successfully',
        data: {
          user: req.user
        }
      });
    } catch (error) {
      logger.error('Get current user failed:', error);
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve user information'
      });
    }
  }

  /**
   * Logout user
   * POST /api/auth/logout
   */
  static async logout(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'User not authenticated'
        });
      }

      await authService.logout(req.user.id);

      logger.info(`User logged out: ${req.user.id}`);

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Logout failed:', error);
      
      res.status(500).json({
        success: false,
        error: 'Logout failed',
        message: 'Failed to logout user'
      });
    }
  }

  /**
   * Change password
   * PUT /api/auth/change-password
   */
  static async changePassword(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'User not authenticated'
        });
      }

      const { currentPassword, newPassword } = req.body;

      await authService.changePassword(req.user.id, currentPassword, newPassword);

      logger.info(`Password changed for user: ${req.user.id}`);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Password change failed:', error);
      
      const message = error instanceof Error ? error.message : 'Password change failed';
      const statusCode = message.includes('incorrect') ? 400 : 500;

      res.status(statusCode).json({
        success: false,
        error: 'Password change failed',
        message
      });
    }
  }

  /**
   * Request password reset
   * POST /api/auth/forgot-password
   */
  static async requestPasswordReset(req: Request, res: Response) {
    try {
      const { email } = req.body;

      await authService.requestPasswordReset(email);

      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    } catch (error) {
      logger.error('Password reset request failed:', error);
      
      // Always return success to prevent email enumeration
      res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }
  }

  /**
   * Verify email address
   * POST /api/auth/verify-email
   */
  static async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.body;

      // TODO: Implement email verification
      // For now, just return success
      res.json({
        success: true,
        message: 'Email verification not yet implemented'
      });
    } catch (error) {
      logger.error('Email verification failed:', error);
      
      res.status(400).json({
        success: false,
        error: 'Email verification failed',
        message: 'Invalid or expired verification token'
      });
    }
  }

  /**
   * Get authentication status and health
   * GET /api/auth/status
   */
  static async getAuthStatus(req: Request, res: Response) {
    try {
      const isAuthenticated = !!req.user;
      
      // Get some basic stats (without exposing sensitive data)
      const stats = await prismaService.getClient().$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM users WHERE is_active = true
      `;
      
      const activeUsers = Number(stats[0]?.count || 0);

      res.json({
        success: true,
        data: {
          authenticated: isAuthenticated,
          user: isAuthenticated ? {
            id: req.user!.id,
            email: req.user!.email,
            emailVerified: req.user!.emailVerified,
            isActive: req.user!.isActive
          } : null,
          systemStats: {
            activeUsers,
            timestamp: new Date().toISOString()
          }
        }
      });
    } catch (error) {
      logger.error('Auth status check failed:', error);
      
      res.status(500).json({
        success: false,
        error: 'Status check failed',
        message: 'Unable to check authentication status'
      });
    }
  }
}