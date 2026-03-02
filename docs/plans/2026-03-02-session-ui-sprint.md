# EMDR Session UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a polished, therapy-appropriate EMDR session management interface connected to the real backend API.

**Architecture:** Zustand session store calls a typed API client that hits the existing `/api/sessions/*` endpoints. Page-level components live in `frontend/src/pages/`, session components in `frontend/src/components/SessionManagement/`. Framer Motion for animations, therapy-calming color palette.

**Tech Stack:** React 18, TypeScript, Zustand, Framer Motion, react-hook-form + zod, Tailwind CSS (with existing `therapy` color tokens), lucide-react icons

---

## Task 1: Session API Client

**Files:**
- Create: `frontend/src/services/sessionApi.ts`

**Step 1: Create the typed API client**

```typescript
import { api, ApiResponse } from './api';
import { EMDRPhase, BilateralStimulationSettings } from '../../../shared/types/EMDR';

// Types matching backend API responses
export interface SessionListItem {
  id: string;
  phase: string;
  state: string;
  startTime: string;
  endTime?: string;
  totalDuration?: number;
  initialSUD?: number;
  currentSUD?: number;
  finalSUD?: number;
  initialVOC?: number;
  currentVOC?: number;
  finalVOC?: number;
  createdAt: string;
  updatedAt: string;
  targetMemory?: {
    id: string;
    description: string;
    negativeCognition: string;
    positiveCognition: string;
    emotion: string;
    bodyLocation?: string;
  };
}

export interface SessionDetail extends SessionListItem {
  sets: Array<{
    id: string;
    number: number;
    startTime: string;
    endTime?: string;
    duration?: number;
    sudBefore?: number;
    sudAfter?: number;
  }>;
  safetyChecks: Array<{
    id: string;
    timestamp: string;
    type: string;
    action: string;
  }>;
}

export interface PaginatedSessions {
  sessions: SessionListItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface CreateSessionData {
  targetMemory: {
    description: string;
    negativeCognition: string;
    positiveCognition: string;
    emotion: string;
    bodyLocation?: string;
  };
  initialSUD: number;
  initialVOC: number;
}

export interface SetFeedback {
  sudLevel?: number;
  bodyResponse?: string;
  imagery?: string;
  thoughts?: string;
  emotions?: string;
}

export const sessionApi = {
  // Session CRUD
  create: (data: CreateSessionData): Promise<ApiResponse<SessionDetail>> =>
    api.post('/sessions', data),

  getById: (id: string): Promise<ApiResponse<SessionDetail>> =>
    api.get(`/sessions/${id}`),

  getUserSessions: (page = 1, limit = 20, state?: string): Promise<ApiResponse<PaginatedSessions>> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (state) params.set('state', state);
    return api.get(`/sessions?${params}`);
  },

  // Session lifecycle
  start: (id: string): Promise<ApiResponse<SessionDetail>> =>
    api.post(`/sessions/${id}/start`),

  pause: (id: string): Promise<ApiResponse<SessionDetail>> =>
    api.post(`/sessions/${id}/pause`),

  resume: (id: string): Promise<ApiResponse<SessionDetail>> =>
    api.post(`/sessions/${id}/resume`),

  complete: (id: string, notes?: string): Promise<ApiResponse<SessionDetail>> =>
    api.post(`/sessions/${id}/complete`, { notes }),

  emergencyStop: (id: string, reason: string): Promise<ApiResponse<SessionDetail>> =>
    api.post(`/sessions/${id}/emergency-stop`, { reason }),

  // Phase management
  updatePhase: (id: string, phase: string, phaseData?: Record<string, unknown>): Promise<ApiResponse<SessionDetail>> =>
    api.put(`/sessions/${id}/phase`, { phase, phaseData }),

  // Set management
  startSet: (id: string, stimulationSettings?: Partial<BilateralStimulationSettings>): Promise<ApiResponse> =>
    api.post(`/sessions/${id}/sets`, { stimulationSettings }),

  completeSet: (id: string, setId: string, feedback?: SetFeedback): Promise<ApiResponse> =>
    api.put(`/sessions/${id}/sets/${setId}`, feedback),
};
```

**Step 2: Verify file compiles**

Run: `cd frontend && npx tsc --noEmit src/services/sessionApi.ts 2>&1 | grep -v node_modules | head -20`

Note: Pre-existing type errors from missing `@types/react` are expected — only check for errors in sessionApi.ts itself.

**Step 3: Commit**

```bash
git add frontend/src/services/sessionApi.ts
git commit -m "feat: add typed session API client"
```

---

## Task 2: Session Zustand Store

**Files:**
- Create: `frontend/src/stores/sessionStore.ts`

**Step 1: Create the store**

```typescript
import { create } from 'zustand';
import { sessionApi, SessionDetail, SessionListItem, PaginatedSessions, CreateSessionData, SetFeedback } from '../services/sessionApi';

interface SessionStore {
  // State
  sessions: SessionListItem[];
  activeSession: SessionDetail | null;
  totalSessions: number;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;

  // Timer state
  elapsed: number;
  phaseElapsed: number;
  timerInterval: ReturnType<typeof setInterval> | null;

  // Session CRUD
  createSession: (data: CreateSessionData) => Promise<string>;
  loadSession: (id: string) => Promise<void>;
  loadUserSessions: (page?: number, state?: string) => Promise<void>;

  // Session lifecycle
  startSession: () => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  completeSession: (notes?: string) => Promise<void>;
  emergencyStop: (reason: string) => Promise<void>;

  // Phase management
  progressPhase: (phase: string) => Promise<void>;

  // Set management
  startSet: () => Promise<void>;
  completeSet: (setId: string, feedback?: SetFeedback) => Promise<void>;

  // Timer
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;

  // Utility
  clearError: () => void;
  clearActiveSession: () => void;
}

export const useSessionStore = create<SessionStore>()((set, get) => ({
  sessions: [],
  activeSession: null,
  totalSessions: 0,
  currentPage: 1,
  totalPages: 1,
  isLoading: false,
  error: null,
  elapsed: 0,
  phaseElapsed: 0,
  timerInterval: null,

  createSession: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await sessionApi.create(data);
      if (response.success && response.data) {
        set({ activeSession: response.data, isLoading: false });
        return response.data.id;
      }
      throw new Error(response.message || 'Failed to create session');
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to create session';
      set({ isLoading: false, error: msg });
      throw error;
    }
  },

  loadSession: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await sessionApi.getById(id);
      if (response.success && response.data) {
        set({ activeSession: response.data, isLoading: false });
        return;
      }
      throw new Error(response.message || 'Failed to load session');
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to load session';
      set({ isLoading: false, error: msg });
      throw error;
    }
  },

  loadUserSessions: async (page = 1, state) => {
    set({ isLoading: true, error: null });
    try {
      const response = await sessionApi.getUserSessions(page, 20, state);
      if (response.success && response.data) {
        const data = response.data;
        set({
          sessions: data.sessions,
          totalSessions: data.total,
          currentPage: data.page,
          totalPages: data.totalPages,
          isLoading: false,
        });
        return;
      }
      throw new Error(response.message || 'Failed to load sessions');
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to load sessions';
      set({ isLoading: false, error: msg });
    }
  },

  startSession: async () => {
    const session = get().activeSession;
    if (!session) return;
    set({ isLoading: true, error: null });
    try {
      const response = await sessionApi.start(session.id);
      if (response.success && response.data) {
        set({ activeSession: response.data, isLoading: false });
        get().startTimer();
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to start session';
      set({ isLoading: false, error: msg });
    }
  },

  pauseSession: async () => {
    const session = get().activeSession;
    if (!session) return;
    set({ isLoading: true, error: null });
    try {
      const response = await sessionApi.pause(session.id);
      if (response.success && response.data) {
        set({ activeSession: response.data, isLoading: false });
        get().stopTimer();
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to pause session';
      set({ isLoading: false, error: msg });
    }
  },

  resumeSession: async () => {
    const session = get().activeSession;
    if (!session) return;
    set({ isLoading: true, error: null });
    try {
      const response = await sessionApi.resume(session.id);
      if (response.success && response.data) {
        set({ activeSession: response.data, isLoading: false });
        get().startTimer();
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to resume session';
      set({ isLoading: false, error: msg });
    }
  },

  completeSession: async (notes) => {
    const session = get().activeSession;
    if (!session) return;
    set({ isLoading: true, error: null });
    try {
      const response = await sessionApi.complete(session.id, notes);
      if (response.success && response.data) {
        set({ activeSession: response.data, isLoading: false });
        get().stopTimer();
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to complete session';
      set({ isLoading: false, error: msg });
    }
  },

  emergencyStop: async (reason) => {
    const session = get().activeSession;
    if (!session) return;
    try {
      const response = await sessionApi.emergencyStop(session.id, reason);
      if (response.success && response.data) {
        set({ activeSession: response.data, isLoading: false });
        get().stopTimer();
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Emergency stop failed';
      set({ error: msg });
    }
  },

  progressPhase: async (phase) => {
    const session = get().activeSession;
    if (!session) return;
    set({ isLoading: true, error: null });
    try {
      const response = await sessionApi.updatePhase(session.id, phase);
      if (response.success && response.data) {
        set({ activeSession: response.data, isLoading: false, phaseElapsed: 0 });
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to update phase';
      set({ isLoading: false, error: msg });
    }
  },

  startSet: async () => {
    const session = get().activeSession;
    if (!session) return;
    set({ isLoading: true, error: null });
    try {
      const response = await sessionApi.startSet(session.id);
      if (response.success) {
        // Reload session to get updated sets array
        await get().loadSession(session.id);
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to start set';
      set({ isLoading: false, error: msg });
    }
  },

  completeSet: async (setId, feedback) => {
    const session = get().activeSession;
    if (!session) return;
    set({ isLoading: true, error: null });
    try {
      const response = await sessionApi.completeSet(session.id, setId, feedback);
      if (response.success) {
        await get().loadSession(session.id);
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to complete set';
      set({ isLoading: false, error: msg });
    }
  },

  startTimer: () => {
    const existing = get().timerInterval;
    if (existing) clearInterval(existing);
    const interval = setInterval(() => {
      set((state) => ({
        elapsed: state.elapsed + 1,
        phaseElapsed: state.phaseElapsed + 1,
      }));
    }, 1000);
    set({ timerInterval: interval });
  },

  stopTimer: () => {
    const interval = get().timerInterval;
    if (interval) clearInterval(interval);
    set({ timerInterval: null });
  },

  resetTimer: () => {
    get().stopTimer();
    set({ elapsed: 0, phaseElapsed: 0 });
  },

  clearError: () => set({ error: null }),
  clearActiveSession: () => {
    get().stopTimer();
    set({ activeSession: null, elapsed: 0, phaseElapsed: 0 });
  },
}));
```

**Step 2: Commit**

```bash
git add frontend/src/stores/sessionStore.ts
git commit -m "feat: add session Zustand store with API integration"
```

---

## Task 3: Therapy Design Tokens — Extend Tailwind Config

**Files:**
- Modify: `frontend/tailwind.config.js`

**Step 1: Add therapy-specific design tokens**

Add these to the `extend` block in `theme`:

```javascript
// Inside theme.extend, add/update:
colors: {
  // ... keep existing primary and therapy colors ...
  therapy: {
    calm: '#e0f2fe',     // keep existing
    focus: '#0ea5e9',    // keep existing
    alert: '#ef4444',    // keep existing
    safe: '#22c55e',     // keep existing
    bg: '#f8fafc',       // page background
    surface: '#ffffff',  // card surfaces
    border: '#e2e8f0',   // subtle borders
    muted: '#94a3b8',    // secondary text
    accent: '#6366f1',   // indigo accent (matches Button primary)
  },
  sud: {
    0: '#22c55e',   // green — no distress
    1: '#4ade80',
    2: '#86efac',
    3: '#fde047',   // yellow zone
    4: '#facc15',
    5: '#f59e0b',
    6: '#f97316',   // orange zone
    7: '#ef4444',
    8: '#dc2626',   // red zone
    9: '#b91c1c',
    10: '#991b1b',  // crisis
  },
  voc: {
    1: '#ef4444',   // completely false — red
    2: '#f97316',
    3: '#f59e0b',
    4: '#a3a3a3',   // neutral — gray
    5: '#86efac',
    6: '#4ade80',
    7: '#22c55e',   // completely true — green
  },
},
fontFamily: {
  therapy: ['Inter', 'system-ui', 'sans-serif'],
},
```

**Step 2: Commit**

```bash
git add frontend/tailwind.config.js
git commit -m "feat: add therapy design tokens for SUD/VOC scales"
```

---

## Task 4: PhaseIndicator Component

**Files:**
- Create: `frontend/src/components/SessionManagement/PhaseIndicator.tsx`

**Step 1: Build the component**

A horizontal stepper showing 8 EMDR phases. Current phase highlighted with Framer Motion animation. Completed phases get a checkmark.

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const PHASES = [
  { key: 'preparation', label: 'Preparation', short: '1' },
  { key: 'assessment', label: 'Assessment', short: '2' },
  { key: 'desensitization', label: 'Desensitization', short: '3' },
  { key: 'installation', label: 'Installation', short: '4' },
  { key: 'body_scan', label: 'Body Scan', short: '5' },
  { key: 'closure', label: 'Closure', short: '6' },
  { key: 'reevaluation', label: 'Reevaluation', short: '7' },
  { key: 'resource_installation', label: 'Resources', short: '8' },
] as const;

interface PhaseIndicatorProps {
  currentPhase: string;
  completedPhases?: string[];
}

export const PhaseIndicator: React.FC<PhaseIndicatorProps> = ({
  currentPhase,
  completedPhases = [],
}) => {
  const currentIndex = PHASES.findIndex((p) => p.key === currentPhase.toLowerCase());

  return (
    <div className="w-full px-2">
      <div className="flex items-center justify-between">
        {PHASES.map((phase, index) => {
          const isCompleted = completedPhases.includes(phase.key) || index < currentIndex;
          const isCurrent = phase.key === currentPhase.toLowerCase();
          const isUpcoming = index > currentIndex;

          return (
            <React.Fragment key={phase.key}>
              {/* Step circle */}
              <div className="flex flex-col items-center relative">
                <motion.div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${
                    isCurrent
                      ? 'border-therapy-accent bg-therapy-accent text-white'
                      : isCompleted
                      ? 'border-therapy-safe bg-therapy-safe text-white'
                      : 'border-therapy-border bg-therapy-surface text-therapy-muted'
                  }`}
                  animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                  transition={isCurrent ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
                >
                  {isCompleted ? <Check className="w-5 h-5" /> : phase.short}
                </motion.div>
                <span
                  className={`mt-2 text-xs text-center max-w-[80px] leading-tight ${
                    isCurrent ? 'text-therapy-accent font-semibold' : isCompleted ? 'text-therapy-safe' : 'text-therapy-muted'
                  }`}
                >
                  {phase.label}
                </span>
              </div>

              {/* Connector line */}
              {index < PHASES.length - 1 && (
                <div className="flex-1 h-0.5 mx-1 mt-[-20px]">
                  <div
                    className={`h-full rounded ${
                      index < currentIndex ? 'bg-therapy-safe' : 'bg-therapy-border'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
```

**Step 2: Create barrel export**

Create `frontend/src/components/SessionManagement/index.ts`:
```typescript
export { PhaseIndicator } from './PhaseIndicator';
```

**Step 3: Commit**

```bash
git add frontend/src/components/SessionManagement/PhaseIndicator.tsx frontend/src/components/SessionManagement/index.ts
git commit -m "feat: add PhaseIndicator component with animated stepper"
```

---

## Task 5: SUDScale and VOCScale Components

**Files:**
- Create: `frontend/src/components/SessionManagement/SUDScale.tsx`
- Create: `frontend/src/components/SessionManagement/VOCScale.tsx`

**Step 1: Build SUDScale — interactive 0-10 distress scale**

```tsx
import React from 'react';
import { motion } from 'framer-motion';

const SUD_LABELS: Record<number, string> = {
  0: 'No distress',
  1: 'Minimal',
  2: 'Mild',
  3: 'Low',
  4: 'Moderate',
  5: 'Medium',
  6: 'Uncomfortable',
  7: 'High',
  8: 'Severe',
  9: 'Extreme',
  10: 'Worst possible',
};

const SUD_COLORS: Record<number, string> = {
  0: 'bg-sud-0', 1: 'bg-sud-1', 2: 'bg-sud-2', 3: 'bg-sud-3',
  4: 'bg-sud-4', 5: 'bg-sud-5', 6: 'bg-sud-6', 7: 'bg-sud-7',
  8: 'bg-sud-8', 9: 'bg-sud-9', 10: 'bg-sud-10',
};

interface SUDScaleProps {
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
}

export const SUDScale: React.FC<SUDScaleProps> = ({
  value,
  onChange,
  disabled = false,
  label = 'Subjective Units of Distress (SUD)',
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {value !== undefined && (
          <span className="text-sm text-gray-500">
            {value} — {SUD_LABELS[value]}
          </span>
        )}
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: 11 }, (_, i) => (
          <motion.button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onChange(i)}
            className={`flex-1 h-12 rounded-lg text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-therapy-accent ${
              value === i
                ? `${SUD_COLORS[i]} text-white shadow-md scale-110`
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            whileTap={disabled ? {} : { scale: 0.95 }}
            aria-label={`SUD level ${i}: ${SUD_LABELS[i]}`}
            aria-pressed={value === i}
          >
            {i}
          </motion.button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-therapy-muted">
        <span>No distress</span>
        <span>Worst possible</span>
      </div>
    </div>
  );
};
```

**Step 2: Build VOCScale — interactive 1-7 validity scale**

```tsx
import React from 'react';
import { motion } from 'framer-motion';

const VOC_LABELS: Record<number, string> = {
  1: 'Completely false',
  2: 'Mostly false',
  3: 'Somewhat false',
  4: 'Neutral',
  5: 'Somewhat true',
  6: 'Mostly true',
  7: 'Completely true',
};

const VOC_COLORS: Record<number, string> = {
  1: 'bg-voc-1', 2: 'bg-voc-2', 3: 'bg-voc-3', 4: 'bg-voc-4',
  5: 'bg-voc-5', 6: 'bg-voc-6', 7: 'bg-voc-7',
};

interface VOCScaleProps {
  value?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
  cognition?: string;
}

export const VOCScale: React.FC<VOCScaleProps> = ({
  value,
  onChange,
  disabled = false,
  label = 'Validity of Cognition (VOC)',
  cognition,
}) => {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {cognition && (
          <p className="text-sm text-therapy-muted italic mt-1">"{cognition}"</p>
        )}
      </div>
      {value !== undefined && (
        <p className="text-sm text-gray-500">
          {value} — {VOC_LABELS[value]}
        </p>
      )}
      <div className="flex gap-2">
        {Array.from({ length: 7 }, (_, i) => {
          const level = i + 1;
          return (
            <motion.button
              key={level}
              type="button"
              disabled={disabled}
              onClick={() => onChange(level)}
              className={`flex-1 h-14 rounded-lg text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-therapy-accent ${
                value === level
                  ? `${VOC_COLORS[level]} text-white shadow-md scale-110`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              whileTap={disabled ? {} : { scale: 0.95 }}
              aria-label={`VOC level ${level}: ${VOC_LABELS[level]}`}
              aria-pressed={value === level}
            >
              {level}
            </motion.button>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-therapy-muted">
        <span>Completely false</span>
        <span>Completely true</span>
      </div>
    </div>
  );
};
```

**Step 3: Update barrel export**

Add to `frontend/src/components/SessionManagement/index.ts`:
```typescript
export { SUDScale } from './SUDScale';
export { VOCScale } from './VOCScale';
```

**Step 4: Commit**

```bash
git add frontend/src/components/SessionManagement/SUDScale.tsx frontend/src/components/SessionManagement/VOCScale.tsx frontend/src/components/SessionManagement/index.ts
git commit -m "feat: add interactive SUD and VOC scale components"
```

---

## Task 6: SessionTimer Component

**Files:**
- Create: `frontend/src/components/SessionManagement/SessionTimer.tsx`

**Step 1: Build the timer display**

```tsx
import React from 'react';
import { Clock } from 'lucide-react';

interface SessionTimerProps {
  elapsed: number;
  phaseElapsed: number;
  currentPhase?: string;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const SessionTimer: React.FC<SessionTimerProps> = ({
  elapsed,
  phaseElapsed,
  currentPhase,
}) => {
  return (
    <div className="flex items-center gap-6 text-sm">
      <div className="flex items-center gap-2 text-gray-700">
        <Clock className="w-4 h-4 text-therapy-muted" />
        <span className="font-mono text-lg font-semibold">{formatTime(elapsed)}</span>
        <span className="text-therapy-muted">total</span>
      </div>
      {currentPhase && (
        <div className="flex items-center gap-2 text-gray-500">
          <span className="font-mono text-base">{formatTime(phaseElapsed)}</span>
          <span className="text-therapy-muted">in phase</span>
        </div>
      )}
    </div>
  );
};
```

**Step 2: Update barrel export**

Add to `frontend/src/components/SessionManagement/index.ts`:
```typescript
export { SessionTimer } from './SessionTimer';
```

**Step 3: Commit**

```bash
git add frontend/src/components/SessionManagement/SessionTimer.tsx frontend/src/components/SessionManagement/index.ts
git commit -m "feat: add SessionTimer component"
```

---

## Task 7: SessionControls Component

**Files:**
- Create: `frontend/src/components/SessionManagement/SessionControls.tsx`

**Step 1: Build controls with emergency stop**

```tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Square, AlertOctagon, SkipForward } from 'lucide-react';
import { Button } from '../Common/Button';
import { Modal } from '../Common/Modal';

interface SessionControlsProps {
  state: string;
  isLoading: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onComplete: (notes?: string) => void;
  onEmergencyStop: (reason: string) => void;
  onNextPhase?: () => void;
  canProgressPhase?: boolean;
}

export const SessionControls: React.FC<SessionControlsProps> = ({
  state,
  isLoading,
  onStart,
  onPause,
  onResume,
  onComplete,
  onEmergencyStop,
  onNextPhase,
  canProgressPhase = false,
}) => {
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');

  const isActive = state === 'in_progress';
  const isPaused = state === 'paused';
  const isPreparing = state === 'preparing';
  const isFinished = state === 'completed' || state === 'emergency_stopped';

  return (
    <div className="flex items-center gap-3">
      {/* Main controls */}
      {isPreparing && (
        <Button variant="primary" size="lg" onClick={onStart} loading={isLoading}>
          <Play className="w-4 h-4 mr-2" />
          Start Session
        </Button>
      )}

      {isActive && (
        <>
          <Button variant="secondary" onClick={onPause} loading={isLoading}>
            <Pause className="w-4 h-4 mr-2" />
            Pause
          </Button>
          {canProgressPhase && onNextPhase && (
            <Button variant="primary" onClick={onNextPhase} loading={isLoading}>
              <SkipForward className="w-4 h-4 mr-2" />
              Next Phase
            </Button>
          )}
          <Button variant="secondary" onClick={() => setShowCompleteModal(true)}>
            <Square className="w-4 h-4 mr-2" />
            Complete
          </Button>
        </>
      )}

      {isPaused && (
        <>
          <Button variant="primary" size="lg" onClick={onResume} loading={isLoading}>
            <Play className="w-4 h-4 mr-2" />
            Resume
          </Button>
          <Button variant="secondary" onClick={() => setShowCompleteModal(true)}>
            <Square className="w-4 h-4 mr-2" />
            Complete
          </Button>
        </>
      )}

      {/* Emergency stop — always visible when not finished */}
      {!isFinished && !isPreparing && (
        <motion.div className="ml-auto" whileHover={{ scale: 1.05 }}>
          <Button
            variant="danger"
            size="lg"
            onClick={() => setShowEmergencyModal(true)}
            className="shadow-lg"
          >
            <AlertOctagon className="w-5 h-5 mr-2" />
            Emergency Stop
          </Button>
        </motion.div>
      )}

      {/* Emergency Stop Modal */}
      <Modal
        open={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        title="Emergency Stop"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This will immediately end the session. You can optionally provide a reason.
          </p>
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="Reason (optional)..."
            rows={3}
            value={emergencyReason}
            onChange={(e) => setEmergencyReason(e.target.value)}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowEmergencyModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                onEmergencyStop(emergencyReason || 'User requested emergency stop');
                setShowEmergencyModal(false);
                setEmergencyReason('');
              }}
            >
              Confirm Emergency Stop
            </Button>
          </div>
        </div>
      </Modal>

      {/* Complete Session Modal */}
      <Modal
        open={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="Complete Session"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            End this therapy session. Add any notes below.
          </p>
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-therapy-accent focus:border-therapy-accent"
            placeholder="Session notes (optional)..."
            rows={4}
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setShowCompleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                onComplete(completionNotes || undefined);
                setShowCompleteModal(false);
                setCompletionNotes('');
              }}
            >
              Complete Session
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
```

**Step 2: Update barrel export**

Add to `frontend/src/components/SessionManagement/index.ts`:
```typescript
export { SessionControls } from './SessionControls';
```

**Step 3: Commit**

```bash
git add frontend/src/components/SessionManagement/SessionControls.tsx frontend/src/components/SessionManagement/index.ts
git commit -m "feat: add SessionControls with emergency stop modal"
```

---

## Task 8: TargetMemoryForm and TargetMemoryCard Components

**Files:**
- Create: `frontend/src/components/SessionManagement/TargetMemoryForm.tsx`
- Create: `frontend/src/components/SessionManagement/TargetMemoryCard.tsx`

**Step 1: Build TargetMemoryForm with react-hook-form + zod**

```tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../Common/Input';
import { Button } from '../Common/Button';
import { SUDScale } from './SUDScale';
import { VOCScale } from './VOCScale';

const targetMemorySchema = z.object({
  description: z.string().min(10, 'Please describe the memory in at least 10 characters'),
  negativeCognition: z.string().min(3, 'Required — e.g., "I am not safe"'),
  positiveCognition: z.string().min(3, 'Required — e.g., "I am safe now"'),
  emotion: z.string().min(2, 'What emotion comes up?'),
  bodyLocation: z.string().optional(),
});

type TargetMemoryFormData = z.infer<typeof targetMemorySchema>;

interface TargetMemoryFormProps {
  onSubmit: (data: TargetMemoryFormData & { initialSUD: number; initialVOC: number }) => void;
  isLoading?: boolean;
}

export const TargetMemoryForm: React.FC<TargetMemoryFormProps> = ({ onSubmit, isLoading }) => {
  const [initialSUD, setInitialSUD] = useState<number | undefined>(undefined);
  const [initialVOC, setInitialVOC] = useState<number | undefined>(undefined);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TargetMemoryFormData>({
    resolver: zodResolver(targetMemorySchema),
  });

  const onFormSubmit = (data: TargetMemoryFormData) => {
    if (initialSUD === undefined || initialVOC === undefined) return;
    onSubmit({ ...data, initialSUD, initialVOC });
  };

  const canSubmit = initialSUD !== undefined && initialVOC !== undefined;

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Target Memory</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Describe the memory or image
          </label>
          <textarea
            {...register('description')}
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-therapy-accent focus:border-therapy-accent"
            rows={3}
            placeholder="Describe the disturbing memory or image..."
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        <Input
          label="Negative Cognition"
          placeholder='e.g., "I am not safe" or "I am powerless"'
          error={errors.negativeCognition?.message}
          {...register('negativeCognition')}
        />

        <Input
          label="Positive Cognition (desired belief)"
          placeholder='e.g., "I am safe now" or "I have choices"'
          error={errors.positiveCognition?.message}
          {...register('positiveCognition')}
        />

        <Input
          label="Primary Emotion"
          placeholder="e.g., fear, shame, sadness"
          error={errors.emotion?.message}
          {...register('emotion')}
        />

        <Input
          label="Body Location (optional)"
          placeholder="Where do you feel it in your body?"
          {...register('bodyLocation')}
        />
      </div>

      <div className="border-t border-gray-200 pt-6 space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Initial Measurements</h3>

        <SUDScale
          value={initialSUD}
          onChange={setInitialSUD}
          label="Current Distress Level (SUD)"
        />

        <VOCScale
          value={initialVOC}
          onChange={setInitialVOC}
          label="How true does the positive cognition feel?"
          cognition="(your positive cognition above)"
        />
      </div>

      <div className="pt-4">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={!canSubmit}
          loading={isLoading}
        >
          Begin Session
        </Button>
        {!canSubmit && (
          <p className="mt-2 text-sm text-therapy-muted text-center">
            Please select both SUD and VOC levels to continue
          </p>
        )}
      </div>
    </form>
  );
};
```

**Step 2: Build TargetMemoryCard**

```tsx
import React from 'react';
import { Brain } from 'lucide-react';

interface TargetMemoryCardProps {
  description: string;
  negativeCognition: string;
  positiveCognition: string;
  emotion: string;
  bodyLocation?: string;
}

export const TargetMemoryCard: React.FC<TargetMemoryCardProps> = ({
  description,
  negativeCognition,
  positiveCognition,
  emotion,
  bodyLocation,
}) => {
  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-2 text-indigo-700">
        <Brain className="w-5 h-5" />
        <h4 className="font-semibold text-sm uppercase tracking-wide">Target Memory</h4>
      </div>

      <p className="text-gray-800 text-sm">{description}</p>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-red-600 font-medium block text-xs mb-0.5">Negative Cognition</span>
          <span className="text-gray-700 italic">"{negativeCognition}"</span>
        </div>
        <div>
          <span className="text-green-600 font-medium block text-xs mb-0.5">Positive Cognition</span>
          <span className="text-gray-700 italic">"{positiveCognition}"</span>
        </div>
      </div>

      <div className="flex gap-4 text-sm text-gray-600">
        <span>Emotion: <strong>{emotion}</strong></span>
        {bodyLocation && <span>Body: <strong>{bodyLocation}</strong></span>}
      </div>
    </div>
  );
};
```

**Step 3: Update barrel export**

Add to `frontend/src/components/SessionManagement/index.ts`:
```typescript
export { TargetMemoryForm } from './TargetMemoryForm';
export { TargetMemoryCard } from './TargetMemoryCard';
```

**Step 4: Commit**

```bash
git add frontend/src/components/SessionManagement/TargetMemoryForm.tsx frontend/src/components/SessionManagement/TargetMemoryCard.tsx frontend/src/components/SessionManagement/index.ts
git commit -m "feat: add TargetMemoryForm and TargetMemoryCard components"
```

---

## Task 9: SessionSummary Component

**Files:**
- Create: `frontend/src/components/SessionManagement/SessionSummary.tsx`

**Step 1: Build end-of-session summary view**

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Clock, Layers, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SessionDetail } from '../../services/sessionApi';

interface SessionSummaryProps {
  session: SessionDetail;
  elapsed: number;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export const SessionSummary: React.FC<SessionSummaryProps> = ({ session, elapsed }) => {
  const sudReduction = (session.initialSUD ?? 0) - (session.finalSUD ?? session.currentSUD ?? 0);
  const vocImprovement = (session.finalVOC ?? session.currentVOC ?? 0) - (session.initialVOC ?? 0);
  const isEmergencyStopped = session.state === 'emergency_stopped';
  const totalSets = session.sets?.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Status Banner */}
      <div
        className={`rounded-xl p-4 flex items-center gap-3 ${
          isEmergencyStopped
            ? 'bg-red-50 border border-red-200'
            : 'bg-green-50 border border-green-200'
        }`}
      >
        {isEmergencyStopped ? (
          <AlertTriangle className="w-6 h-6 text-red-600" />
        ) : (
          <CheckCircle2 className="w-6 h-6 text-green-600" />
        )}
        <div>
          <h3 className={`font-semibold ${isEmergencyStopped ? 'text-red-900' : 'text-green-900'}`}>
            {isEmergencyStopped ? 'Session Stopped' : 'Session Complete'}
          </h3>
          <p className={`text-sm ${isEmergencyStopped ? 'text-red-700' : 'text-green-700'}`}>
            {isEmergencyStopped
              ? 'This session was ended early. Please take a moment to ground yourself.'
              : 'Great work. Take a moment to notice how you feel.'}
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <TrendingDown className="w-5 h-5 text-green-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-900">{sudReduction > 0 ? `-${sudReduction}` : sudReduction}</div>
          <div className="text-xs text-therapy-muted">SUD Change</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <TrendingUp className="w-5 h-5 text-blue-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-900">{vocImprovement > 0 ? `+${vocImprovement}` : vocImprovement}</div>
          <div className="text-xs text-therapy-muted">VOC Change</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <Clock className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-900">{formatDuration(session.totalDuration || elapsed)}</div>
          <div className="text-xs text-therapy-muted">Duration</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <Layers className="w-5 h-5 text-purple-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-gray-900">{totalSets}</div>
          <div className="text-xs text-therapy-muted">Sets Completed</div>
        </div>
      </div>
    </motion.div>
  );
};
```

**Step 2: Update barrel export**

Add to `frontend/src/components/SessionManagement/index.ts`:
```typescript
export { SessionSummary } from './SessionSummary';
```

**Step 3: Commit**

```bash
git add frontend/src/components/SessionManagement/SessionSummary.tsx frontend/src/components/SessionManagement/index.ts
git commit -m "feat: add SessionSummary component with outcome metrics"
```

---

## Task 10: Page Components — DashboardPage

**Files:**
- Create: `frontend/src/pages/DashboardPage.tsx`

**Step 1: Build the dashboard replacing the hardcoded one in App.tsx**

```tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Clock, Activity, Shield } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useSessionStore } from '../stores/sessionStore';
import { Button } from '../components/Common/Button';
import { Card } from '../components/Common/Card';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { sessions, totalSessions, isLoading, loadUserSessions } = useSessionStore();
  const navigate = useNavigate();

  useEffect(() => {
    loadUserSessions();
  }, [loadUserSessions]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const stateLabel = (state: string) => {
    const labels: Record<string, { text: string; color: string }> = {
      preparing: { text: 'Preparing', color: 'bg-yellow-100 text-yellow-800' },
      in_progress: { text: 'In Progress', color: 'bg-blue-100 text-blue-800' },
      paused: { text: 'Paused', color: 'bg-gray-100 text-gray-800' },
      completed: { text: 'Completed', color: 'bg-green-100 text-green-800' },
      emergency_stopped: { text: 'Stopped', color: 'bg-red-100 text-red-800' },
    };
    return labels[state] || { text: state, color: 'bg-gray-100 text-gray-800' };
  };

  return (
    <div className="min-h-screen bg-therapy-bg">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-therapy-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">EMDR Therapy</h1>
              <p className="text-sm text-therapy-muted">
                Welcome, {user?.firstName}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="primary" onClick={() => navigate('/sessions/new')}>
                <Plus className="w-4 h-4 mr-2" />
                New Session
              </Button>
              <Button variant="ghost" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-therapy-border p-5 flex items-center gap-4">
            <div className="bg-indigo-100 rounded-lg p-3">
              <Activity className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{totalSessions}</div>
              <div className="text-sm text-therapy-muted">Total Sessions</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-therapy-border p-5 flex items-center gap-4">
            <div className="bg-green-100 rounded-lg p-3">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {user?.safetyProfile?.riskLevel || 'N/A'}
              </div>
              <div className="text-sm text-therapy-muted">Safety Level</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-therapy-border p-5 flex items-center gap-4">
            <div className="bg-purple-100 rounded-lg p-3">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {sessions.filter((s) => s.state === 'completed').length}
              </div>
              <div className="text-sm text-therapy-muted">Completed</div>
            </div>
          </div>
        </div>

        {/* Session History */}
        <Card header={<h2 className="text-lg font-semibold text-gray-900">Session History</h2>}>
          {isLoading ? (
            <div className="text-center py-8 text-therapy-muted">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-therapy-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions yet</h3>
              <p className="text-therapy-muted mb-6">
                Start your first EMDR therapy session to begin processing.
              </p>
              <Button variant="primary" onClick={() => navigate('/sessions/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Start First Session
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sessions.map((session) => {
                const state = stateLabel(session.state);
                return (
                  <motion.div
                    key={session.id}
                    className="py-4 flex items-center justify-between hover:bg-gray-50 -mx-6 px-6 cursor-pointer transition-colors"
                    onClick={() => {
                      const route = session.state === 'completed' || session.state === 'emergency_stopped'
                        ? `/sessions/${session.id}/summary`
                        : `/sessions/${session.id}`;
                      navigate(route);
                    }}
                    whileHover={{ x: 4 }}
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {session.targetMemory?.description
                            ? session.targetMemory.description.slice(0, 60) + (session.targetMemory.description.length > 60 ? '...' : '')
                            : 'Session'}
                        </div>
                        <div className="text-sm text-therapy-muted">
                          {formatDate(session.createdAt)} · Phase: {session.phase}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {session.currentSUD !== undefined && (
                        <span className="text-sm text-gray-600">SUD: {session.currentSUD}</span>
                      )}
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${state.color}`}>
                        {state.text}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx
git commit -m "feat: add DashboardPage with session history and stats"
```

---

## Task 11: Page Components — NewSessionPage and SessionPage

**Files:**
- Create: `frontend/src/pages/NewSessionPage.tsx`
- Create: `frontend/src/pages/SessionPage.tsx`
- Create: `frontend/src/pages/SessionSummaryPage.tsx`

**Step 1: Build NewSessionPage**

```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSessionStore } from '../stores/sessionStore';
import { TargetMemoryForm } from '../components/SessionManagement';
import { Button } from '../components/Common/Button';
import { Card } from '../components/Common/Card';
import { Alert } from '../components/Common/Alert';

export const NewSessionPage: React.FC = () => {
  const navigate = useNavigate();
  const { createSession, isLoading, error, clearError } = useSessionStore();

  const handleSubmit = async (data: {
    description: string;
    negativeCognition: string;
    positiveCognition: string;
    emotion: string;
    bodyLocation?: string;
    initialSUD: number;
    initialVOC: number;
  }) => {
    try {
      const sessionId = await createSession({
        targetMemory: {
          description: data.description,
          negativeCognition: data.negativeCognition,
          positiveCognition: data.positiveCognition,
          emotion: data.emotion,
          bodyLocation: data.bodyLocation,
        },
        initialSUD: data.initialSUD,
        initialVOC: data.initialVOC,
      });
      navigate(`/sessions/${sessionId}`);
    } catch {
      // Error is captured in store
    }
  };

  return (
    <div className="min-h-screen bg-therapy-bg">
      <header className="bg-white shadow-sm border-b border-therapy-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">New EMDR Session</h1>
          <p className="text-therapy-muted mt-1">
            Identify the target memory and record your initial measurements.
          </p>
        </div>

        {error && (
          <Alert variant="error" className="mb-6" onDismiss={clearError}>
            {error}
          </Alert>
        )}

        <Card>
          <TargetMemoryForm onSubmit={handleSubmit} isLoading={isLoading} />
        </Card>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Important:</strong> This is a research tool, not a replacement for
            professional therapy. If you experience significant distress, please use the
            emergency stop button or contact a mental health professional.
          </p>
        </div>
      </main>
    </div>
  );
};
```

**Step 2: Build SessionPage — main active session view**

```tsx
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSessionStore } from '../stores/sessionStore';
import {
  PhaseIndicator,
  SessionControls,
  SessionTimer,
  SUDScale,
  VOCScale,
  TargetMemoryCard,
} from '../components/SessionManagement';
import { Button } from '../components/Common/Button';
import { Alert } from '../components/Common/Alert';
import { Card } from '../components/Common/Card';

const PHASE_ORDER = [
  'preparation', 'assessment', 'desensitization', 'installation',
  'body_scan', 'closure', 'reevaluation', 'resource_installation',
];

export const SessionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    activeSession,
    isLoading,
    error,
    elapsed,
    phaseElapsed,
    loadSession,
    startSession,
    pauseSession,
    resumeSession,
    completeSession,
    emergencyStop,
    progressPhase,
    clearError,
    clearActiveSession,
  } = useSessionStore();

  useEffect(() => {
    if (id) loadSession(id);
    return () => clearActiveSession();
  }, [id, loadSession, clearActiveSession]);

  useEffect(() => {
    if (activeSession?.state === 'completed' || activeSession?.state === 'emergency_stopped') {
      navigate(`/sessions/${activeSession.id}/summary`, { replace: true });
    }
  }, [activeSession?.state, activeSession?.id, navigate]);

  if (!activeSession && isLoading) {
    return (
      <div className="min-h-screen bg-therapy-bg flex items-center justify-center">
        <div className="text-therapy-muted">Loading session...</div>
      </div>
    );
  }

  if (!activeSession) {
    return (
      <div className="min-h-screen bg-therapy-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Session not found</p>
          <Button variant="primary" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const currentPhaseIndex = PHASE_ORDER.indexOf(activeSession.phase?.toLowerCase() || 'preparation');
  const nextPhase = currentPhaseIndex < PHASE_ORDER.length - 1 ? PHASE_ORDER[currentPhaseIndex + 1] : null;
  const isActive = activeSession.state === 'in_progress';

  const handleNextPhase = () => {
    if (nextPhase) progressPhase(nextPhase);
  };

  return (
    <div className="min-h-screen bg-therapy-bg">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-therapy-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <SessionTimer
              elapsed={elapsed}
              phaseElapsed={phaseElapsed}
              currentPhase={activeSession.phase}
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {error && (
          <Alert variant="error" onDismiss={clearError}>
            {error}
          </Alert>
        )}

        {/* Phase Indicator */}
        <Card>
          <PhaseIndicator currentPhase={activeSession.phase || 'preparation'} />
        </Card>

        {/* Controls */}
        <div className="bg-white rounded-xl border border-therapy-border p-4">
          <SessionControls
            state={activeSession.state}
            isLoading={isLoading}
            onStart={startSession}
            onPause={pauseSession}
            onResume={resumeSession}
            onComplete={completeSession}
            onEmergencyStop={emergencyStop}
            onNextPhase={handleNextPhase}
            canProgressPhase={isActive && nextPhase !== null}
          />
        </div>

        {/* Target Memory */}
        {activeSession.targetMemory && (
          <TargetMemoryCard
            description={activeSession.targetMemory.description}
            negativeCognition={activeSession.targetMemory.negativeCognition}
            positiveCognition={activeSession.targetMemory.positiveCognition}
            emotion={activeSession.targetMemory.emotion}
            bodyLocation={activeSession.targetMemory.bodyLocation}
          />
        )}

        {/* Measurements */}
        {isActive && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card header={<h3 className="font-semibold text-gray-900">Current Distress</h3>}>
              <SUDScale
                value={activeSession.currentSUD ?? undefined}
                onChange={() => {}}
                disabled
                label="Current SUD"
              />
              <div className="mt-3 flex items-center gap-4 text-sm text-therapy-muted">
                <span>Initial: {activeSession.initialSUD ?? '—'}</span>
                <span>Current: {activeSession.currentSUD ?? '—'}</span>
              </div>
            </Card>
            <Card header={<h3 className="font-semibold text-gray-900">Cognition Validity</h3>}>
              <VOCScale
                value={activeSession.currentVOC ?? undefined}
                onChange={() => {}}
                disabled
                label="Current VOC"
              />
              <div className="mt-3 flex items-center gap-4 text-sm text-therapy-muted">
                <span>Initial: {activeSession.initialVOC ?? '—'}</span>
                <span>Current: {activeSession.currentVOC ?? '—'}</span>
              </div>
            </Card>
          </div>
        )}

        {/* Sets info */}
        {activeSession.sets && activeSession.sets.length > 0 && (
          <Card header={<h3 className="font-semibold text-gray-900">Processing Sets</h3>}>
            <div className="text-sm text-therapy-muted">
              {activeSession.sets.length} set{activeSession.sets.length !== 1 ? 's' : ''} completed
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};
```

**Step 3: Build SessionSummaryPage**

```tsx
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { useSessionStore } from '../stores/sessionStore';
import { SessionSummary } from '../components/SessionManagement';
import { Button } from '../components/Common/Button';

export const SessionSummaryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeSession, isLoading, elapsed, loadSession } = useSessionStore();

  useEffect(() => {
    if (id) loadSession(id);
  }, [id, loadSession]);

  if (!activeSession && isLoading) {
    return (
      <div className="min-h-screen bg-therapy-bg flex items-center justify-center">
        <div className="text-therapy-muted">Loading session...</div>
      </div>
    );
  }

  if (!activeSession) {
    return (
      <div className="min-h-screen bg-therapy-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Session not found</p>
          <Button variant="primary" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-therapy-bg">
      <header className="bg-white shadow-sm border-b border-therapy-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Session Summary</h1>

        <SessionSummary session={activeSession} elapsed={elapsed} />

        <div className="mt-8 flex justify-center">
          <Button variant="primary" size="lg" onClick={() => navigate('/')}>
            <Home className="w-4 h-4 mr-2" />
            Return to Dashboard
          </Button>
        </div>
      </main>
    </div>
  );
};
```

**Step 4: Commit**

```bash
git add frontend/src/pages/NewSessionPage.tsx frontend/src/pages/SessionPage.tsx frontend/src/pages/SessionSummaryPage.tsx
git commit -m "feat: add NewSession, Session, and SessionSummary pages"
```

---

## Task 12: Wire Up Routes in App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: Replace the hardcoded Dashboard with new pages and routes**

Replace the entire `App.tsx` content with:

```tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ProtectedRoute, AuthPage } from './components/auth';
import { DashboardPage } from './pages/DashboardPage';
import { NewSessionPage } from './pages/NewSessionPage';
import { SessionPage } from './pages/SessionPage';
import { SessionSummaryPage } from './pages/SessionSummaryPage';
import './App.css';

const LandingPage = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Agentic EMDR Therapy
      </h1>
      <p className="text-xl text-gray-600 mb-8">
        AI-powered EMDR therapy with intelligent therapeutic agents
      </p>
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto text-left space-y-3">
        <div className="flex items-center space-x-2"><span className="text-green-500">✓</span><span>Multi-agent therapeutic system</span></div>
        <div className="flex items-center space-x-2"><span className="text-green-500">✓</span><span>Adaptive EMDR protocols</span></div>
        <div className="flex items-center space-x-2"><span className="text-green-500">✓</span><span>Real-time safety monitoring</span></div>
        <div className="flex items-center space-x-2"><span className="text-green-500">✓</span><span>Multi-modal bilateral stimulation</span></div>
      </div>
      <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          <strong>Important:</strong> This is a research and educational tool.
          Always consult with qualified mental health professionals.
        </p>
      </div>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/" element={<ProtectedRoute fallback={<AuthPage />}><DashboardPage /></ProtectedRoute>} />
        <Route path="/sessions/new" element={<ProtectedRoute fallback={<AuthPage />}><NewSessionPage /></ProtectedRoute>} />
        <Route path="/sessions/:id" element={<ProtectedRoute fallback={<AuthPage />}><SessionPage /></ProtectedRoute>} />
        <Route path="/sessions/:id/summary" element={<ProtectedRoute fallback={<AuthPage />}><SessionSummaryPage /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
```

**Step 2: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: wire up session routes in App.tsx"
```

---

## Task 13: Verify Build + Final Commit

**Step 1: Run frontend TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -v 'node_modules\|Cannot find module' | head -30
```

Expect: Only pre-existing errors from missing `@types/react` etc. No new errors from our files.

**Step 2: Run Vite dev build check**

```bash
cd frontend && npx vite build 2>&1 | tail -20
```

If build fails, fix issues.

**Step 3: Run backend tests to confirm nothing broke**

```bash
cd backend && npx jest --no-cache 2>&1 | tail -5
```

Expect: 150/150 tests passing (no backend changes in this sprint).

**Step 4: Final commit if any fixes needed, then push**

```bash
git log --oneline -15
```

---

## Execution Batches

**Batch 1 (Tasks 1-3):** API client, store, design tokens — foundational layer
**Batch 2 (Tasks 4-6):** PhaseIndicator, SUD/VOC scales, timer — core display components
**Batch 3 (Tasks 7-9):** Controls, target memory, summary — interaction components
**Batch 4 (Tasks 10-12):** Pages and routing — wire everything together
**Batch 5 (Task 13):** Build verification
