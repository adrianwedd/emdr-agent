import { Request, Response } from 'express';
import { userService } from '../services';
import { logger } from '../utils/logger';

export class UserController {
  /**
   * Get current user profile
   */
  public static async getProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
      }

      const profile = await userService.getUserProfile(req.user.id);
      if (!profile) {
        return res.status(404).json({
          error: 'Profile not found',
          message: 'User profile does not exist'
        });
      }

      return res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      logger.error('Get profile failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve user profile'
      });
    }
  }

  /**
   * Update user profile
   */
  public static async updateProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
      }

      const profileData = req.body;
      const updatedProfile = await userService.updateUserProfile(req.user.id, profileData);

      return res.json({
        success: true,
        data: updatedProfile,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      logger.error('Update profile failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to update profile'
      });
    }
  }

  /**
   * Get user statistics and progress
   */
  public static async getStats(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
      }

      const stats = await userService.getUserStats(req.user.id);

      return res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Get user stats failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to retrieve user statistics'
      });
    }
  }

  /**
   * Update safety profile
   */
  public static async updateSafetyProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
      }

      const safetyData = req.body;
      const updatedProfile = await userService.updateSafetyProfile(req.user.id, safetyData);

      return res.json({
        success: true,
        data: updatedProfile,
        message: 'Safety profile updated successfully'
      });
    } catch (error) {
      logger.error('Update safety profile failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to update safety profile'
      });
    }
  }

  /**
   * Delete user account and all associated data
   */
  public static async deleteAccount(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
      }

      const { password } = req.body;
      if (!password) {
        return res.status(400).json({
          error: 'Password required',
          message: 'Password confirmation is required to delete account'
        });
      }

      await userService.deleteAccount(req.user.id, password);

      return res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      logger.error('Delete account failed:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to delete account'
      });
    }
  }
}