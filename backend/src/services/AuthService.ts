import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prismaService } from './PrismaService';
import { logger } from '../utils/logger';
import { User } from '@prisma/client';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export class AuthService {
  private static instance: AuthService;
  private prisma = prismaService.getClient();
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private tokenExpiry: string;
  private refreshTokenExpiry: string;

  private constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-production';
    this.tokenExpiry = process.env.JWT_EXPIRES_IN || '24h';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    if (this.jwtSecret === 'default-secret-change-in-production') {
      logger.warn('Using default JWT secret - change this in production!');
    }
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Register a new user
   */
  public async register(data: RegisterData): Promise<{ user: Omit<User, 'hashedPassword'>; tokens: AuthTokens }> {
    try {
      logger.debug(`Registering new user: ${data.email}`);

      // Validate email format
      if (!this.isValidEmail(data.email)) {
        throw new Error('Invalid email format');
      }

      // Validate password strength
      if (!this.isValidPassword(data.password)) {
        throw new Error('Password must be at least 8 characters long and contain letters and numbers');
      }

      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: data.email.toLowerCase() }
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(data.password);

      // Create user with basic safety profile
      const user = await this.prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          isActive: true,
          emailVerified: false, // TODO: Implement email verification
          safetyProfile: {
            create: {
              riskLevel: 'LOW',
              contraindications: [],
              emergencyContacts: undefined,
              professionalSupport: undefined,
              crisisProtocols: undefined
            }
          }
        },
        include: {
          safetyProfile: true
        }
      });

      // Generate tokens
      const tokens = await this.generateTokens(user.id, user.email);

      // Remove sensitive data
      const { hashedPassword: _, ...userWithoutPassword } = user;

      logger.info(`User registered successfully: ${user.email} (${user.id})`);

      return {
        user: userWithoutPassword,
        tokens
      };
    } catch (error) {
      logger.error('User registration failed:', error);
      throw prismaService.handlePrismaError(error);
    }
  }

  /**
   * Login user
   */
  public async login(credentials: LoginCredentials): Promise<{ user: Omit<User, 'hashedPassword'>; tokens: AuthTokens }> {
    try {
      logger.debug(`Login attempt for user: ${credentials.email}`);

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { email: credentials.email.toLowerCase() },
        include: {
          safetyProfile: true
        }
      });

      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is deactivated. Please contact support.');
      }

      // Verify password
      if (!user.hashedPassword) {
        throw new Error('Invalid email or password');
      }
      const isValidPassword = await this.verifyPassword(credentials.password, user.hashedPassword);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Generate tokens
      const tokens = await this.generateTokens(user.id, user.email);

      // Update last login (optional - implement if needed)
      // await this.prisma.user.update({
      //   where: { id: user.id },
      //   data: { lastLoginAt: new Date() }
      // });

      // Remove sensitive data
      const { hashedPassword: _, ...userWithoutPassword } = user;

      logger.info(`User logged in successfully: ${user.email} (${user.id})`);

      return {
        user: userWithoutPassword,
        tokens
      };
    } catch (error) {
      logger.error('User login failed:', error);
      throw prismaService.handlePrismaError(error);
    }
  }

  /**
   * Refresh access token
   */
  public async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const payload = this.verifyToken(refreshToken, 'refresh') as TokenPayload;

      // Check if user still exists and is active
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId }
      });

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user.id, user.email);

      logger.debug(`Tokens refreshed for user: ${user.email}`);

      return tokens;
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Verify access token and return user
   */
  public async verifyAccessToken(token: string): Promise<Omit<User, 'hashedPassword'> & { safetyProfile?: any }> {
    try {
      const payload = this.verifyToken(token, 'access') as TokenPayload;

      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          safetyProfile: true
        }
      });

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      const { hashedPassword: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      logger.debug('Token verification failed:', error);
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Logout user (optional - for token blacklisting)
   */
  public async logout(userId: string): Promise<void> {
    try {
      // In a more complex implementation, you might:
      // 1. Add token to blacklist
      // 2. Clear refresh tokens from database
      // 3. Update user's last logout time

      logger.info(`User logged out: ${userId}`);
    } catch (error) {
      logger.error('Logout failed:', error);
      throw error;
    }
  }

  /**
   * Change user password
   */
  public async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      if (!user.hashedPassword) {
        throw new Error('Current password is incorrect');
      }
      const isValidPassword = await this.verifyPassword(currentPassword, user.hashedPassword);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      if (!this.isValidPassword(newPassword)) {
        throw new Error('New password must be at least 8 characters long and contain letters and numbers');
      }

      // Hash new password
      const hashedPassword = await this.hashPassword(newPassword);

      // Update password
      await this.prisma.user.update({
        where: { id: userId },
        data: { hashedPassword }
      });

      logger.info(`Password changed for user: ${userId}`);
    } catch (error) {
      logger.error('Password change failed:', error);
      throw prismaService.handlePrismaError(error);
    }
  }

  /**
   * Request password reset (placeholder - implement with email service)
   */
  public async requestPasswordReset(email: string): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        // Don't reveal if email exists
        logger.info(`Password reset requested for non-existent email: ${email}`);
        return;
      }

      // TODO: Implement password reset token generation and email sending
      // For now, just log
      logger.info(`Password reset requested for user: ${email}`);
    } catch (error) {
      logger.error('Password reset request failed:', error);
      // Don't throw - don't reveal system errors
    }
  }

  /**
   * Generate JWT tokens
   */
  private async generateTokens(userId: string, email: string): Promise<AuthTokens> {
    const accessTokenPayload: TokenPayload = {
      userId,
      email,
      type: 'access'
    };

    const refreshTokenPayload: TokenPayload = {
      userId,
      email,
      type: 'refresh'
    };

    const accessToken = jwt.sign(accessTokenPayload, this.jwtSecret, {
      expiresIn: this.tokenExpiry
    });

    const refreshToken = jwt.sign(refreshTokenPayload, this.jwtRefreshSecret, {
      expiresIn: this.refreshTokenExpiry
    });

    // Calculate expiry time in seconds
    const decoded = jwt.decode(accessToken) as any;
    const expiresIn = decoded.exp - decoded.iat;

    return {
      accessToken,
      refreshToken,
      expiresIn
    };
  }

  /**
   * Verify JWT token
   */
  private verifyToken(token: string, type: 'access' | 'refresh'): TokenPayload {
    const secret = type === 'access' ? this.jwtSecret : this.jwtRefreshSecret;
    
    try {
      const payload = jwt.verify(token, secret) as TokenPayload;
      
      if (payload.type !== type) {
        throw new Error(`Invalid token type: expected ${type}, got ${payload.type}`);
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      throw error;
    }
  }

  /**
   * Hash password
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password
   */
  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  private isValidPassword(password: string): boolean {
    // At least 8 characters, contains letters and numbers
    const minLength = password.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    return minLength && hasLetter && hasNumber;
  }
}

export const authService = AuthService.getInstance();