# Full-Stack Polish Sprint Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate tech debt, add test coverage for critical services, build reusable frontend components, and groom GitHub issues with proper labels/milestones.

**Architecture:** Fix the Prisma↔shared type mismatch layer by creating adapter functions, then write Jest unit tests for AuthService/SessionService/SafetyProtocolService with mocked Prisma client, and build 5 foundational React components using Tailwind CSS.

**Tech Stack:** TypeScript, Prisma, Jest (backend), Vitest (frontend), React, Tailwind CSS, Zod

---

### Task 1: GitHub Issue Housekeeping

**Files:**
- None (GitHub CLI operations only)

**Step 1: Close duplicate issues**

Run:
```bash
gh issue close 7 --comment "Duplicate of #20" --reason "not planned"
gh issue close 8 --comment "Overlaps with #19 (Safety Monitoring Interface)" --reason "not planned"
```

**Step 2: Create labels**

Run:
```bash
gh label create "P1-critical" --color "d73a4a" --description "Must-have for MVP"
gh label create "P2-next" --color "fbca04" --description "Next priority after MVP"
gh label create "P3-future" --color "0e8a16" --description "Future enhancement"
gh label create "frontend" --color "1d76db" --description "Frontend work"
gh label create "backend" --color "5319e7" --description "Backend work"
gh label create "tech-debt" --color "e4e669" --description "Technical debt cleanup"
```

**Step 3: Label open issues**

Run:
```bash
gh issue edit 4 --add-label "P1-critical,frontend"
gh issue edit 9 --add-label "P2-next,backend"
gh issue edit 10 --add-label "P2-next,frontend"
gh issue edit 11 --add-label "P3-future"
gh issue edit 12 --add-label "P3-future"
gh issue edit 13 --add-label "P3-future"
gh issue edit 14 --add-label "P3-future"
gh issue edit 15 --add-label "P3-future"
gh issue edit 16 --add-label "P2-next"
gh issue edit 17 --add-label "P1-critical,frontend"
gh issue edit 18 --add-label "P1-critical,frontend,backend"
gh issue edit 19 --add-label "P1-critical,frontend"
gh issue edit 20 --add-label "P1-critical,frontend"
```

**Step 4: Commit**

No code to commit — this is GitHub-only.

---

### Task 2: Commit pnpm Migration

**Files:**
- Remove: `package-lock.json`
- Add: `pnpm-lock.yaml`

**Step 1: Stage and commit the lockfile switch**

Run:
```bash
git add package-lock.json pnpm-lock.yaml
git commit -m "chore: migrate from npm to pnpm"
```

---

### Task 3: Create Prisma Type Adapters

**Files:**
- Create: `backend/src/utils/typeAdapters.ts`
- Test: `backend/src/utils/__tests__/typeAdapters.test.ts`

**Step 1: Write the failing test**

Create `backend/src/utils/__tests__/typeAdapters.test.ts`:

```typescript
import { adaptPrismaSession, adaptPrismaSessions, nullToUndefined } from '../typeAdapters';

describe('nullToUndefined', () => {
  it('converts null values to undefined', () => {
    const input = { a: 'hello', b: null, c: 42, d: null };
    const result = nullToUndefined(input);
    expect(result).toEqual({ a: 'hello', b: undefined, c: 42, d: undefined });
  });

  it('preserves non-null values', () => {
    const input = { a: 'hello', b: 42, c: true };
    const result = nullToUndefined(input);
    expect(result).toEqual(input);
  });
});

describe('adaptPrismaSession', () => {
  it('converts Prisma session with nulls to app session with undefineds', () => {
    const prismaSession = {
      id: 'sess-1',
      userId: 'user-1',
      targetMemoryId: 'mem-1',
      phase: 'PREPARATION',
      state: 'PREPARING',
      startTime: null,
      endTime: null,
      totalDuration: null,
      initialSUD: 7,
      currentSUD: null,
      finalSUD: null,
      initialVOC: 2,
      currentVOC: null,
      finalVOC: null,
      preparationNotes: null,
      currentSetNumber: 0,
      phaseData: null,
      sessionData: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      targetMemory: {
        id: 'mem-1',
        userId: 'user-1',
        description: 'Test memory',
        image: null,
        negativeCognition: 'I am unsafe',
        positiveCognition: 'I am safe',
        emotion: 'fear',
        bodyLocation: null,
        initialSUD: 7,
        initialVOC: 2,
        isActive: true,
        isResolved: false,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      },
    };

    const result = adaptPrismaSession(prismaSession);

    expect(result.id).toBe('sess-1');
    expect(result.startTime).toBeUndefined();
    expect(result.endTime).toBeUndefined();
    expect(result.currentSUD).toBeUndefined();
    expect(result.targetMemory.image).toBeUndefined();
    expect(result.targetMemory.bodyLocation).toBeUndefined();
  });
});

describe('adaptPrismaSessions', () => {
  it('adapts an array of sessions', () => {
    const sessions = [
      {
        id: 'sess-1', userId: 'u1', targetMemoryId: 'm1',
        phase: 'PREPARATION', state: 'PREPARING',
        startTime: null, endTime: null, totalDuration: null,
        initialSUD: 5, currentSUD: null, finalSUD: null,
        initialVOC: 3, currentVOC: null, finalVOC: null,
        preparationNotes: null, currentSetNumber: 0,
        phaseData: null, sessionData: null,
        createdAt: new Date(), updatedAt: new Date(),
      },
    ];

    const result = adaptPrismaSessions(sessions);
    expect(result).toHaveLength(1);
    expect(result[0].startTime).toBeUndefined();
  });
});
```

**Step 2: Set up Jest config**

Create `backend/jest.config.ts`:

```typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
};

export default config;
```

**Step 3: Run test to verify it fails**

Run: `cd backend && npx jest src/utils/__tests__/typeAdapters.test.ts --no-cache`
Expected: FAIL — module not found

**Step 4: Write minimal implementation**

Create `backend/src/utils/typeAdapters.ts`:

```typescript
/**
 * Converts null values in an object to undefined.
 * Solves the Prisma (returns null) vs shared types (expect undefined) mismatch.
 */
export function nullToUndefined<T extends Record<string, unknown>>(
  obj: T
): { [K in keyof T]: Exclude<T[K], null> | (null extends T[K] ? undefined : never) } {
  const result = { ...obj };
  for (const key in result) {
    if (result[key] === null) {
      (result as any)[key] = undefined;
    }
  }
  return result as any;
}

/**
 * Adapts a Prisma EMDRSession record to the shared EMDRSession type.
 * Converts null → undefined for optional fields.
 */
export function adaptPrismaSession(prismaSession: any): any {
  const session = nullToUndefined(prismaSession);

  // Adapt nested targetMemory if present
  if (session.targetMemory) {
    session.targetMemory = nullToUndefined(session.targetMemory);
  }

  // Adapt nested user if present
  if (session.user) {
    session.user = nullToUndefined(session.user);
    if (session.user.safetyProfile) {
      session.user.safetyProfile = nullToUndefined(session.user.safetyProfile);
    }
  }

  return session;
}

/**
 * Adapts an array of Prisma EMDRSession records.
 */
export function adaptPrismaSessions(sessions: any[]): any[] {
  return sessions.map(adaptPrismaSession);
}

/**
 * Adapts a Prisma EMDRSet record to the shared type.
 */
export function adaptPrismaSet(prismaSet: any): any {
  return nullToUndefined(prismaSet);
}
```

**Step 5: Run test to verify it passes**

Run: `cd backend && npx jest src/utils/__tests__/typeAdapters.test.ts --no-cache`
Expected: PASS (3 test suites)

**Step 6: Commit**

```bash
git add backend/jest.config.ts backend/src/utils/typeAdapters.ts backend/src/utils/__tests__/typeAdapters.test.ts
git commit -m "feat: add Prisma type adapters with tests

Replaces as-any casts with proper null→undefined conversion functions."
```

---

### Task 4: Replace `as any` Casts in SessionService

**Files:**
- Modify: `backend/src/services/SessionService.ts` (lines 176, 203, 224, 261, 456, 472, 503, 524, 558, 589, 615, 637, 790, 814, 836, 894)

**Step 1: Update imports in SessionService.ts**

At the top of `backend/src/services/SessionService.ts`, add:
```typescript
import { adaptPrismaSession, adaptPrismaSessions, adaptPrismaSet } from '../utils/typeAdapters';
```

**Step 2: Replace all `as any` return casts**

For every line matching `return session as any;` or `return completedSession as any;` or `return session as any[];`:
- Replace `return session as any;` → `return adaptPrismaSession(session);`
- Replace `return completedSession as any;` → `return adaptPrismaSession(completedSession);`
- Replace `return completedSet as any;` → `return adaptPrismaSet(completedSet);`
- Replace `return updatedSession as any;` → `return adaptPrismaSession(updatedSession);`
- Replace `sessions: sessions as any[]` → `sessions: adaptPrismaSessions(sessions)`

For inline `as any` usage like `(session as any)?.sessionData`:
- Replace with proper optional chaining on the Prisma type: `(session?.sessionData as Record<string, unknown>) || {}`
- Or: `(currentSession?.sessionData as Record<string, unknown> | null) || {}`

For the phase cast `phase: phase as any`:
- Replace with `phase: phase as unknown as EMDRPhase` (Prisma enum → shared enum)

**Step 3: Run type check**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors (or only pre-existing errors unrelated to SessionService)

**Step 4: Run existing tests**

Run: `cd backend && npx jest --no-cache`
Expected: All type adapter tests still pass

**Step 5: Commit**

```bash
git add backend/src/services/SessionService.ts
git commit -m "refactor: replace as-any casts with type adapters in SessionService

Eliminates 16 as-any casts using adaptPrismaSession/adaptPrismaSet."
```

---

### Task 5: AuthService Unit Tests

**Files:**
- Create: `backend/src/services/__tests__/AuthService.test.ts`

**Step 1: Write the test file**

```typescript
import { AuthService } from '../AuthService';

// Mock PrismaService
jest.mock('../PrismaService', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    safetyProfile: {
      create: jest.fn(),
    },
  };
  return {
    prismaService: {
      getClient: () => mockPrisma,
      handlePrismaError: (e: any) => e,
    },
    __mockPrisma: mockPrisma,
  };
});

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const { __mockPrisma: mockPrisma } = jest.requireMock('../PrismaService');

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Access singleton
    authService = (AuthService as any).getInstance();
  });

  describe('register', () => {
    it('creates a user with hashed password and safety profile', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        hashedPassword: 'hashed',
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(null); // No existing user
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.safetyProfile.create.mockResolvedValue({});

      const result = await authService.register({
        email: 'test@example.com',
        password: 'Password123',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.safetyProfile.create).toHaveBeenCalledTimes(1);
    });

    it('rejects registration with existing email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        authService.register({
          email: 'existing@example.com',
          password: 'Password123',
        })
      ).rejects.toThrow();
    });

    it('rejects weak passwords', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.register({
          email: 'test@example.com',
          password: 'short',
        })
      ).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('returns tokens for valid credentials', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('Password123', 12);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        hashedPassword,
        isActive: true,
      });

      const result = await authService.login({
        email: 'test@example.com',
        password: 'Password123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('rejects invalid password', async () => {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('Password123', 12);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        hashedPassword,
        isActive: true,
      });

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'WrongPassword1',
        })
      ).rejects.toThrow();
    });

    it('rejects non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'nobody@example.com',
          password: 'Password123',
        })
      ).rejects.toThrow();
    });
  });
});
```

**Step 2: Run test to verify**

Run: `cd backend && npx jest src/services/__tests__/AuthService.test.ts --no-cache`
Expected: Tests may need adjustments based on actual AuthService singleton pattern — adapt mock accordingly.

**Step 3: Fix and iterate until passing**

Adjust mocks to match actual service internals (singleton access, constructor behavior, etc.)

**Step 4: Commit**

```bash
git add backend/src/services/__tests__/AuthService.test.ts
git commit -m "test: add AuthService unit tests

Covers registration, login, password validation, and duplicate email rejection."
```

---

### Task 6: SafetyProtocolService Unit Tests

**Files:**
- Create: `backend/src/services/__tests__/SafetyProtocolService.test.ts`

**Step 1: Write the test file**

Test the core safety logic:
- `assessCurrentState()` — returns correct risk levels for different SUD values
- Safety triggers at SUD >= 8
- `getGroundingTechniques()` — returns techniques matching criteria
- `getCrisisResources()` — returns crisis resources
- Emergency protocol activation

Mock PrismaService and logger as in Task 5.

Focus on testing the pure safety assessment logic:
```typescript
// Key behaviors to test:
// 1. SUD of 3 → risk LOW, action CONTINUE
// 2. SUD of 7 → risk MEDIUM, action CONTINUE
// 3. SUD of 8 → risk HIGH, action GROUNDING
// 4. SUD of 10 → risk CRITICAL, action EMERGENCY_STOP
// 5. Rapid SUD increase (≥3 points) → escalated response
// 6. getGroundingTechniques returns valid techniques
// 7. getCrisisResources returns 988 hotline
```

**Step 2: Run tests**

Run: `cd backend && npx jest src/services/__tests__/SafetyProtocolService.test.ts --no-cache`

**Step 3: Iterate until passing**

**Step 4: Commit**

```bash
git add backend/src/services/__tests__/SafetyProtocolService.test.ts
git commit -m "test: add SafetyProtocolService unit tests

Covers risk assessment, safety triggers, grounding techniques, and crisis resources."
```

---

### Task 7: SessionService Unit Tests

**Files:**
- Create: `backend/src/services/__tests__/SessionService.test.ts`

**Step 1: Write tests for core session lifecycle**

Test:
- `createSession()` — creates session with correct initial state (PREPARING phase, initial SUD/VOC)
- `startSession()` — transitions from PREPARING to IN_PROGRESS, runs safety check first
- `progressToNextPhase()` — follows correct 8-phase order
- `completeSet()` — records set data with SUD/VOC
- `getSession()` — returns session by ID
- `getUserSessions()` — returns paginated sessions

Mock: PrismaService, SafetyProtocolService, logger

**Step 2: Run tests**

Run: `cd backend && npx jest src/services/__tests__/SessionService.test.ts --no-cache`

**Step 3: Iterate until passing**

**Step 4: Commit**

```bash
git add backend/src/services/__tests__/SessionService.test.ts
git commit -m "test: add SessionService unit tests

Covers session lifecycle, phase progression, set completion, and pagination."
```

---

### Task 8: Frontend Foundation — Button Component

**Files:**
- Create: `frontend/src/components/Common/Button.tsx`

**Step 1: Write the component**

```tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variantStyles: Record<string, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500',
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-indigo-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}) => {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
};
```

**Step 2: Create barrel export**

Create `frontend/src/components/Common/index.ts`:
```typescript
export { Button } from './Button';
```

**Step 3: Commit**

```bash
git add frontend/src/components/Common/Button.tsx frontend/src/components/Common/index.ts
git commit -m "feat: add Button component with variants, sizes, and loading state"
```

---

### Task 9: Frontend Foundation — Input Component

**Files:**
- Create: `frontend/src/components/Common/Input.tsx`
- Modify: `frontend/src/components/Common/index.ts`

**Step 1: Write the component**

```tsx
import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors ${
            error
              ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500'
          } ${className}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1 text-sm text-gray-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
```

**Step 2: Add to barrel export**

Add to `frontend/src/components/Common/index.ts`:
```typescript
export { Input } from './Input';
```

**Step 3: Commit**

```bash
git add frontend/src/components/Common/Input.tsx frontend/src/components/Common/index.ts
git commit -m "feat: add Input component with label, error, and helper text"
```

---

### Task 10: Frontend Foundation — Modal Component

**Files:**
- Create: `frontend/src/components/Common/Modal.tsx`
- Modify: `frontend/src/components/Common/index.ts`

**Step 1: Write the component**

```tsx
import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const sizeStyles: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, size = 'md', children }) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div className={`bg-white rounded-lg shadow-xl w-full mx-4 ${sizeStyles[size]}`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 id="modal-title" className="text-lg font-semibold text-gray-900">{title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
              <X size={20} />
            </button>
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
};
```

**Step 2: Add to barrel export**

**Step 3: Commit**

```bash
git add frontend/src/components/Common/Modal.tsx frontend/src/components/Common/index.ts
git commit -m "feat: add Modal component with overlay, escape key, and sizes"
```

---

### Task 11: Frontend Foundation — Card and Alert Components

**Files:**
- Create: `frontend/src/components/Common/Card.tsx`
- Create: `frontend/src/components/Common/Alert.tsx`
- Modify: `frontend/src/components/Common/index.ts`

**Step 1: Write Card**

```tsx
import React from 'react';

interface CardProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ header, footer, className = '', children }) => {
  return (
    <div className={`bg-white rounded-lg shadow border border-gray-200 ${className}`}>
      {header && <div className="px-6 py-4 border-b border-gray-200">{header}</div>}
      <div className="px-6 py-4">{children}</div>
      {footer && <div className="px-6 py-4 border-t border-gray-200">{footer}</div>}
    </div>
  );
};
```

**Step 2: Write Alert**

```tsx
import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

interface AlertProps {
  variant: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const styles: Record<string, { container: string; icon: React.FC<{ size: number }> }> = {
  info: { container: 'bg-blue-50 border-blue-200 text-blue-800', icon: Info },
  success: { container: 'bg-green-50 border-green-200 text-green-800', icon: CheckCircle },
  warning: { container: 'bg-amber-50 border-amber-200 text-amber-800', icon: AlertTriangle },
  error: { container: 'bg-red-50 border-red-200 text-red-800', icon: AlertCircle },
};

export const Alert: React.FC<AlertProps> = ({ variant, title, children, className = '' }) => {
  const { container, icon: Icon } = styles[variant];

  return (
    <div className={`flex gap-3 rounded-lg border p-4 ${container} ${className}`} role="alert">
      <Icon size={20} className="flex-shrink-0 mt-0.5" />
      <div>
        {title && <p className="font-medium mb-1">{title}</p>}
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
};
```

**Step 3: Update barrel export**

```typescript
export { Button } from './Button';
export { Input } from './Input';
export { Modal } from './Modal';
export { Card } from './Card';
export { Alert } from './Alert';
```

**Step 4: Run type check**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add frontend/src/components/Common/
git commit -m "feat: add Card and Alert foundation components

Completes the base component library: Button, Input, Modal, Card, Alert."
```

---

### Task 12: Final Verification and Summary Commit

**Files:**
- None new

**Step 1: Run all backend tests**

Run: `cd backend && npx jest --no-cache --verbose`
Expected: All test suites pass

**Step 2: Run frontend type check**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 3: Run backend type check**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors (or fewer errors than before)

**Step 4: Verify GitHub issues are properly labeled**

Run: `gh issue list --state open --limit 20`
Expected: All open issues have labels, duplicates are closed

**Step 5: Create summary commit if any loose changes remain**

```bash
git status
# If any unstaged changes, commit them
```

---

## Task Summary

| Task | Description | Type |
|------|-------------|------|
| 1 | GitHub issue housekeeping | Ops |
| 2 | Commit pnpm migration | Chore |
| 3 | Create Prisma type adapters + tests | TDD |
| 4 | Replace as-any casts in SessionService | Refactor |
| 5 | AuthService unit tests | Test |
| 6 | SafetyProtocolService unit tests | Test |
| 7 | SessionService unit tests | Test |
| 8 | Button component | Frontend |
| 9 | Input component | Frontend |
| 10 | Modal component | Frontend |
| 11 | Card + Alert components | Frontend |
| 12 | Final verification | QA |
