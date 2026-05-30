/**
 * AuthService Unit Tests
 *
 * Tests cover registration, login, token refresh, token verification,
 * password change, and logout flows. PrismaService and logger are mocked;
 * bcryptjs runs un-mocked so password hashing is tested realistically.
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before imports
// ---------------------------------------------------------------------------

const mockPrismaClient = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  safetyProfile: {
    create: jest.fn(),
  },
};

jest.mock('../PrismaService', () => ({
  prismaService: {
    getClient: () => mockPrismaClient,
    handlePrismaError: (err: unknown) => (err instanceof Error ? err : new Error(String(err))),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { AuthService, RegisterData } from '../AuthService';
import jwt from 'jsonwebtoken';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset the singleton between tests so each test gets a fresh instance. */
function resetSingleton(): void {
  // The singleton is stored on the class as a private static field.
  // We access it via bracket notation to bypass TypeScript's private check.
  (AuthService as any).instance = undefined;
}

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-uuid-1',
    email: 'test@example.com',
    hashedPassword: '$2a$12$hashedvalue', // placeholder — overridden when needed
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    safetyProfile: {
      id: 'sp-1',
      userId: 'user-uuid-1',
      riskLevel: 'LOW',
      contraindications: [],
      emergencyContacts: null,
      professionalSupport: null,
      crisisProtocols: null,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    resetSingleton();

    // Set deterministic JWT secrets for tests
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';

    authService = AuthService.getInstance();
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    delete process.env.JWT_EXPIRES_IN;
    delete process.env.JWT_REFRESH_EXPIRES_IN;
  });

  // -----------------------------------------------------------------------
  // Singleton
  // -----------------------------------------------------------------------

  describe('getInstance', () => {
    it('returns the same instance on repeated calls', () => {
      const a = AuthService.getInstance();
      const b = AuthService.getInstance();
      expect(a).toBe(b);
    });
  });

  // -----------------------------------------------------------------------
  // Registration
  // -----------------------------------------------------------------------

  describe('register', () => {
    const validRegistration: RegisterData = {
      email: 'newuser@example.com',
      password: 'SecurePass1',
      firstName: 'Jane',
      lastName: 'Doe',
    };

    it('creates a user with a hashed password and safety profile', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const createdUser = makeUser({
        email: 'newuser@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      });
      mockPrismaClient.user.create.mockResolvedValue(createdUser);

      const result = await authService.register(validRegistration);

      // User was looked up first to check for duplicates
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'newuser@example.com' },
      });

      // User.create was called with hashed password and nested safety profile
      expect(mockPrismaClient.user.create).toHaveBeenCalledTimes(1);
      const createArg = mockPrismaClient.user.create.mock.calls[0][0];
      expect(createArg.data.email).toBe('newuser@example.com');
      // Password must not be stored in plain text
      expect(createArg.data.hashedPassword).not.toBe(validRegistration.password);
      expect(createArg.data.hashedPassword).toMatch(/^\$2[aby]\$/); // bcrypt hash
      // Safety profile created inline
      expect(createArg.data.safetyProfile).toEqual({
        create: expect.objectContaining({ riskLevel: 'LOW' }),
      });
      expect(createArg.include).toEqual({ safetyProfile: true });

      // Result shape
      expect(result.user.email).toBe('newuser@example.com');
      expect((result.user as any).hashedPassword).toBeUndefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(typeof result.tokens.expiresIn).toBe('number');
    });

    it('lowercases the email before storing', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      mockPrismaClient.user.create.mockResolvedValue(
        makeUser({ email: 'upper@example.com' }),
      );

      await authService.register({
        ...validRegistration,
        email: 'Upper@Example.COM',
      });

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'upper@example.com' },
      });
      const createArg = mockPrismaClient.user.create.mock.calls[0][0];
      expect(createArg.data.email).toBe('upper@example.com');
    });

    it('rejects registration when the email already exists', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(makeUser());

      await expect(authService.register(validRegistration)).rejects.toThrow(
        'User with this email already exists',
      );
      expect(mockPrismaClient.user.create).not.toHaveBeenCalled();
    });

    it('rejects a password shorter than 8 characters', async () => {
      await expect(
        authService.register({ ...validRegistration, password: 'Short1' }),
      ).rejects.toThrow('Password must be at least 8 characters');
    });

    it('rejects a password without numbers', async () => {
      await expect(
        authService.register({ ...validRegistration, password: 'NoNumbersHere' }),
      ).rejects.toThrow('Password must be at least 8 characters');
    });

    it('rejects a password without letters', async () => {
      await expect(
        authService.register({ ...validRegistration, password: '12345678' }),
      ).rejects.toThrow('Password must be at least 8 characters');
    });

    it('rejects an invalid email format', async () => {
      await expect(
        authService.register({ ...validRegistration, email: 'not-an-email' }),
      ).rejects.toThrow('Invalid email format');
    });
  });

  // -----------------------------------------------------------------------
  // Login
  // -----------------------------------------------------------------------

  describe('login', () => {
    it('returns tokens for valid credentials', async () => {
      // We need a real bcrypt hash for the password we will supply
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('SecurePass1', 12);

      mockPrismaClient.user.findUnique.mockResolvedValue(
        makeUser({ hashedPassword: hash }),
      );

      const result = await authService.login({
        email: 'test@example.com',
        password: 'SecurePass1',
      });

      expect(result.user.email).toBe('test@example.com');
      expect((result.user as any).hashedPassword).toBeUndefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();

      // Verify the access token contains expected payload
      const decoded = jwt.verify(
        result.tokens.accessToken,
        'test-jwt-secret',
      ) as any;
      expect(decoded.userId).toBe('user-uuid-1');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.type).toBe('access');
    });

    it('rejects an invalid password', async () => {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('CorrectPass1', 12);

      mockPrismaClient.user.findUnique.mockResolvedValue(
        makeUser({ hashedPassword: hash }),
      );

      await expect(
        authService.login({ email: 'test@example.com', password: 'WrongPass1' }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('rejects a non-existent user', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'nobody@example.com', password: 'Whatever1' }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('rejects a deactivated user', async () => {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('SecurePass1', 12);

      mockPrismaClient.user.findUnique.mockResolvedValue(
        makeUser({ hashedPassword: hash, isActive: false }),
      );

      await expect(
        authService.login({ email: 'test@example.com', password: 'SecurePass1' }),
      ).rejects.toThrow('Account is deactivated');
    });

    it('rejects when user has no hashed password stored', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(
        makeUser({ hashedPassword: null }),
      );

      await expect(
        authService.login({ email: 'test@example.com', password: 'SecurePass1' }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('lowercases the email for lookup', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'Test@EXAMPLE.com', password: 'Pass1234' }),
      ).rejects.toThrow(); // will throw because user not found — we just check the query

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'test@example.com' },
        }),
      );
    });
  });

  // -----------------------------------------------------------------------
  // Token Refresh
  // -----------------------------------------------------------------------

  describe('refreshToken', () => {
    it('returns new tokens for a valid refresh token', async () => {
      // Generate a real refresh token
      const refreshPayload = { userId: 'user-uuid-1', email: 'test@example.com', type: 'refresh' };
      const validRefreshToken = jwt.sign(refreshPayload, 'test-jwt-refresh-secret', {
        expiresIn: '7d',
      });

      mockPrismaClient.user.findUnique.mockResolvedValue(makeUser());

      const result = await authService.refreshToken(validRefreshToken);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(typeof result.expiresIn).toBe('number');

      // Verify returned access token is valid
      const decoded = jwt.verify(result.accessToken, 'test-jwt-secret') as any;
      expect(decoded.userId).toBe('user-uuid-1');
      expect(decoded.type).toBe('access');
    });

    it('rejects an expired refresh token', async () => {
      const expiredToken = jwt.sign(
        { userId: 'user-uuid-1', email: 'test@example.com', type: 'refresh' },
        'test-jwt-refresh-secret',
        { expiresIn: '0s' },
      );

      // Small delay to ensure token is expired
      await new Promise((r) => setTimeout(r, 10));

      await expect(authService.refreshToken(expiredToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('rejects a token signed with the wrong secret', async () => {
      const badToken = jwt.sign(
        { userId: 'user-uuid-1', email: 'test@example.com', type: 'refresh' },
        'wrong-secret',
        { expiresIn: '7d' },
      );

      await expect(authService.refreshToken(badToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('rejects when user no longer exists', async () => {
      const validToken = jwt.sign(
        { userId: 'user-uuid-1', email: 'test@example.com', type: 'refresh' },
        'test-jwt-refresh-secret',
        { expiresIn: '7d' },
      );

      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      await expect(authService.refreshToken(validToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('rejects when user is inactive', async () => {
      const validToken = jwt.sign(
        { userId: 'user-uuid-1', email: 'test@example.com', type: 'refresh' },
        'test-jwt-refresh-secret',
        { expiresIn: '7d' },
      );

      mockPrismaClient.user.findUnique.mockResolvedValue(makeUser({ isActive: false }));

      await expect(authService.refreshToken(validToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });

    it('rejects an access token used as a refresh token', async () => {
      // Sign with refresh secret but with type 'access'
      const wrongTypeToken = jwt.sign(
        { userId: 'user-uuid-1', email: 'test@example.com', type: 'access' },
        'test-jwt-refresh-secret',
        { expiresIn: '7d' },
      );

      await expect(authService.refreshToken(wrongTypeToken)).rejects.toThrow(
        'Invalid refresh token',
      );
    });
  });

  // -----------------------------------------------------------------------
  // Verify Access Token
  // -----------------------------------------------------------------------

  describe('verifyAccessToken', () => {
    it('returns user without password for a valid access token', async () => {
      const accessToken = jwt.sign(
        { userId: 'user-uuid-1', email: 'test@example.com', type: 'access' },
        'test-jwt-secret',
        { expiresIn: '1h' },
      );

      mockPrismaClient.user.findUnique.mockResolvedValue(makeUser());

      const user = await authService.verifyAccessToken(accessToken);

      expect(user.email).toBe('test@example.com');
      expect((user as any).hashedPassword).toBeUndefined();
    });

    it('rejects an invalid access token', async () => {
      await expect(
        authService.verifyAccessToken('garbage-token'),
      ).rejects.toThrow('Invalid or expired token');
    });

    it('rejects when user is inactive', async () => {
      const token = jwt.sign(
        { userId: 'user-uuid-1', email: 'test@example.com', type: 'access' },
        'test-jwt-secret',
        { expiresIn: '1h' },
      );

      mockPrismaClient.user.findUnique.mockResolvedValue(makeUser({ isActive: false }));

      await expect(authService.verifyAccessToken(token)).rejects.toThrow(
        'Invalid or expired token',
      );
    });
  });

  // -----------------------------------------------------------------------
  // Change Password
  // -----------------------------------------------------------------------

  describe('changePassword', () => {
    it('updates the password when the current password is correct', async () => {
      const bcrypt = require('bcryptjs');
      const currentHash = await bcrypt.hash('OldPass123', 12);

      mockPrismaClient.user.findUnique.mockResolvedValue(
        makeUser({ hashedPassword: currentHash }),
      );
      mockPrismaClient.user.update.mockResolvedValue(makeUser());

      await authService.changePassword('user-uuid-1', 'OldPass123', 'NewPass456');

      expect(mockPrismaClient.user.update).toHaveBeenCalledTimes(1);
      const updateArg = mockPrismaClient.user.update.mock.calls[0][0];
      expect(updateArg.where).toEqual({ id: 'user-uuid-1' });
      // New password should be hashed, not plain text
      expect(updateArg.data.hashedPassword).not.toBe('NewPass456');
      expect(updateArg.data.hashedPassword).toMatch(/^\$2[aby]\$/);
    });

    it('rejects when the current password is wrong', async () => {
      const bcrypt = require('bcryptjs');
      const currentHash = await bcrypt.hash('OldPass123', 12);

      mockPrismaClient.user.findUnique.mockResolvedValue(
        makeUser({ hashedPassword: currentHash }),
      );

      await expect(
        authService.changePassword('user-uuid-1', 'WrongOld1', 'NewPass456'),
      ).rejects.toThrow('Current password is incorrect');
      expect(mockPrismaClient.user.update).not.toHaveBeenCalled();
    });

    it('rejects when the new password is too weak', async () => {
      const bcrypt = require('bcryptjs');
      const currentHash = await bcrypt.hash('OldPass123', 12);

      mockPrismaClient.user.findUnique.mockResolvedValue(
        makeUser({ hashedPassword: currentHash }),
      );

      await expect(
        authService.changePassword('user-uuid-1', 'OldPass123', 'short'),
      ).rejects.toThrow('New password must be at least 8 characters');
      expect(mockPrismaClient.user.update).not.toHaveBeenCalled();
    });

    it('rejects when user is not found', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.changePassword('no-user', 'OldPass123', 'NewPass456'),
      ).rejects.toThrow('User not found');
    });
  });

  // -----------------------------------------------------------------------
  // Logout
  // -----------------------------------------------------------------------

  describe('logout', () => {
    it('completes without error', async () => {
      await expect(authService.logout('user-uuid-1')).resolves.toBeUndefined();
    });
  });
});
