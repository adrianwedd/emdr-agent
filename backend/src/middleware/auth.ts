import { Request, Response, NextFunction } from 'express';
import { authService } from '../services';
import { logger } from '../utils/logger';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        firstName?: string;
        lastName?: string;
        isActive: boolean;
        emailVerified: boolean;
        safetyProfile?: any;
      };
    }
  }
}

/**
 * Authentication middleware - verifies JWT token and sets req.user
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No authorization header provided'
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'Invalid authorization header',
        message: 'Format should be: Bearer <token>'
      });
    }

    const token = parts[1];
    const user = await authService.verifyAccessToken(token);
    
    req.user = user;
    next();
  } catch (error) {
    logger.debug('Authentication failed:', error);
    
    return res.status(401).json({
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Invalid token'
    });
  }
};

/**
 * Optional authentication middleware - sets req.user if token is valid, but doesn't require it
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const token = parts[1];
        try {
          const user = await authService.verifyAccessToken(token);
          req.user = user;
        } catch (error) {
          // Optional auth - don't fail if token is invalid
          logger.debug('Optional authentication failed:', error);
        }
      }
    }
    
    next();
  } catch (error) {
    // Optional auth - continue even if there's an error
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please login to access this resource'
      });
    }

    // For now, we don't have roles in the user model
    // This is a placeholder for future role-based access control
    // if (!roles.some(role => req.user.roles?.includes(role))) {
    //   return res.status(403).json({
    //     error: 'Insufficient permissions',
    //     message: 'You do not have permission to access this resource'
    //   });
    // }

    next();
  };
};

/**
 * Ensure user account is active
 */
export const requireActiveAccount = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please login to access this resource'
    });
  }

  if (!req.user.isActive) {
    return res.status(403).json({
      error: 'Account deactivated',
      message: 'Your account has been deactivated. Please contact support.'
    });
  }

  next();
};

/**
 * Ensure email is verified (for sensitive operations)
 */
export const requireVerifiedEmail = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please login to access this resource'
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      error: 'Email verification required',
      message: 'Please verify your email address to access this resource'
    });
  }

  next();
};

/**
 * Session ownership middleware - ensure user owns the session
 */
export const requireSessionOwnership = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please login to access this resource'
      });
    }

    const sessionId = req.params.id || req.params.sessionId;
    if (!sessionId) {
      return res.status(400).json({
        error: 'Missing session ID',
        message: 'Session ID is required'
      });
    }

    // Import sessionService here to avoid circular dependencies
    const { sessionService } = await import('../services');
    const session = await sessionService.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'The requested session does not exist'
      });
    }

    if (session.userId !== req.user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this session'
      });
    }

    // Add session to request for use in controller
    (req as any).session = session;
    next();
  } catch (error) {
    logger.error('Session ownership check failed:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify session ownership'
    });
  }
};