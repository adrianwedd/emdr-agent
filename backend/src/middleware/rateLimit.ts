import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';

/**
 * Create rate limiter with custom options
 */
const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}) => {
  // For development, return a no-op middleware
  if (process.env.NODE_ENV === 'development') {
    return (req: Request, res: Response, next: any) => next();
  }
  
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: 'Rate limit exceeded',
      message: options.message,
      retryAfter: Math.ceil(options.windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || ((req: Request) => {
      // Use user ID if authenticated, fallback to 'anonymous' for development
      return req.user?.id || 'anonymous';
    }),
    skip: options.skip,
    handler: (req: Request, res: Response) => {
      logger.warn(`Rate limit exceeded for ${req.user?.id || req.ip} on ${req.path}`);
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: options.message,
        retryAfter: Math.ceil(options.windowMs / 1000)
      });
    }
  });
};

// General API rate limiting (per user/IP)
export const generalRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes
  message: 'Too many requests from this user/IP, please try again later.'
});

// Authentication rate limiting (stricter for security)
export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 authentication attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later.',
  keyGenerator: (req: Request) => req.ip || 'unknown' || 'unknown' // Always use IP for auth
});

// Login rate limiting (very strict)
export const loginRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes per IP
  message: 'Too many login attempts from this IP, please try again later.',
  keyGenerator: (req: Request) => req.ip || 'unknown'
});

// Password reset rate limiting
export const passwordResetRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 password reset attempts per hour per IP
  message: 'Too many password reset attempts, please try again later.',
  keyGenerator: (req: Request) => req.ip || 'unknown'
});

// Registration rate limiting
export const registrationRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 registrations per hour per IP
  message: 'Too many registration attempts from this IP, please try again later.',
  keyGenerator: (req: Request) => req.ip || 'unknown'
});

// Session creation rate limiting (prevent abuse)
export const sessionCreationRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 sessions per hour per user
  message: 'Too many sessions created, please take a break and try again later.'
});

// Safety check rate limiting (prevent spam)
export const safetyCheckRateLimit = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 safety checks per 5 minutes per user
  message: 'Too many safety checks requested, please wait a moment.'
});

// Agent message rate limiting (prevent spam)
export const agentMessageRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute per user
  message: 'Too many messages sent to agent, please slow down.'
});

// Emergency endpoint rate limiting (allow frequent use but prevent abuse)
export const emergencyRateLimit = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 emergency requests per 5 minutes per user
  message: 'Emergency endpoint rate limited - if this is a real emergency, call 911.',
  skip: (req: Request) => {
    // Skip rate limiting in development
    return process.env.NODE_ENV === 'development';
  }
});

// File upload rate limiting
export const uploadRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour per user
  message: 'Too many file uploads, please try again later.'
});

// Data export rate limiting (expensive operations)
export const exportRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 exports per hour per user
  message: 'Too many data export requests, please try again later.'
});

// Account deletion rate limiting (prevent accidental deletions)
export const accountDeletionRateLimit = createRateLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 1, // 1 deletion attempt per day per IP
  message: 'Account deletion is limited to once per day per IP address.',
  keyGenerator: (req: Request) => req.ip || 'unknown'
});

// Flexible rate limiter for custom use cases
export const createCustomRateLimit = (options: {
  windowMinutes: number;
  maxRequests: number;
  message?: string;
  useUserIdKey?: boolean;
}) => {
  return createRateLimiter({
    windowMs: options.windowMinutes * 60 * 1000,
    max: options.maxRequests,
    message: options.message || `Too many requests, limit is ${options.maxRequests} per ${options.windowMinutes} minutes.`,
    keyGenerator: options.useUserIdKey 
      ? (req: Request) => req.user?.id || req.ip || 'unknown'
      : (req: Request) => req.ip || 'unknown'
  });
};

// Rate limiting based on user's safety profile
export const adaptiveRateLimit = (req: Request, res: Response, next: any) => {
  try {
    // Higher rate limits for users with lower risk profiles
    const user = req.user;
    let maxRequests = 100; // Default
    
    if (user?.safetyProfile) {
      switch (user.safetyProfile.riskLevel) {
        case 'LOW':
          maxRequests = 200;
          break;
        case 'MEDIUM':
          maxRequests = 150;
          break;
        case 'HIGH':
          maxRequests = 100;
          break;
        case 'CRITICAL':
          maxRequests = 50;
          break;
      }
    }

    const adaptiveLimiter = createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: maxRequests,
      message: `Request limit reached for your safety profile level. Limit: ${maxRequests} per hour.`
    });

    adaptiveLimiter(req, res, next);
  } catch (error) {
    logger.error('Adaptive rate limiting error:', error);
    // Fall back to general rate limiting
    generalRateLimit(req, res, next);
  }
};

// Middleware to log rate limit hits for monitoring
export const logRateLimitHits = (req: Request, res: Response, next: any) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (res.statusCode === 429) {
      logger.warn('Rate limit hit:', {
        userId: req.user?.id,
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent')
      });
    }
    return originalSend.call(this, data);
  };
  
  next();
};