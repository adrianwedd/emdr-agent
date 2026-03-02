# Safety Monitoring Interface Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Context:** Three-reviewer QA (Claude, Codex, Gemini) found 31 findings in the last sprint; 24 confirmed bugs, all fixed. This sprint builds the safety monitoring UI on top of the fully-tested backend SafetyProtocolService.

**Goal:** Build a session-integrated safety monitoring interface with live SUD tracking, grounding exercises, and crisis resources — so users are always one click from help.

**Architecture:** Safety lives inside the session context. A persistent SafetyStatusBar shows risk level and SUD. An expandable SafetyPanel shows assessment details, history, and grounding techniques. Full-screen GroundingExercise overlays guide stabilization. No new routes needed — everything is in-session.

**Tech Stack:** TypeScript, React 18 (`useId`), Zustand, Framer Motion, Tailwind CSS, custom SVG sparkline (no chart library)

**Design Doc:** `docs/plans/2026-03-03-safety-monitoring-design.md`

---

## Task 1: Safety API Service & Types

**Files:**
- `frontend/src/services/safetyApi.ts` (create)

### Description

Create a typed API client for all 8 safety backend endpoints. Pattern matches `sessionApi.ts` — plain object with arrow functions wrapping `api.get/post/put`.

### Implementation

```typescript
import { api, ApiResponse } from './api';

// --- Types matching backend responses ---

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SafetyIndicator {
  type: 'distress' | 'dissociation' | 'overwhelm' | 'content' | 'physiological';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  value?: number;
  threshold?: number;
}

export interface CrisisResource {
  name: string;
  type: 'hotline' | 'text' | 'professional' | 'emergency';
  contact: string;
  description: string;
  availability: string;
}

export interface SafetyIntervention {
  type: 'grounding' | 'pause' | 'emergency_stop' | 'professional_referral';
  instructions: string[];
  resources?: CrisisResource[];
  followUpRequired: boolean;
  estimatedDuration?: number;
}

export interface SafetyAssessment {
  sessionId: string;
  userId: string;
  riskLevel: RiskLevel;
  sudLevel: number;
  indicators: SafetyIndicator[];
  recommendedAction: string;
  intervention?: SafetyIntervention;
  timestamp: string;
}

export interface SafetyCheck {
  id: string;
  sessionId: string;
  type: string;
  riskLevel: string;
  action: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface GroundingTechnique {
  id: string;
  name: string;
  type: 'sensory' | 'breathing' | 'movement' | 'cognitive' | 'visualization';
  instructions: string[];
  duration: number;
  effectiveness: number;
}

export interface SafetyMeasurements {
  sudLevel?: number;
  vocLevel?: number;
  physiological?: {
    heartRate?: number;
    breathing?: 'NORMAL' | 'SHALLOW' | 'RAPID' | 'IRREGULAR';
  };
  psychological?: {
    dissociation?: boolean;
    overwhelm?: boolean;
    flashbacks?: boolean;
  };
}

export interface EmergencyResult {
  stopped: boolean;
  crisisResources: CrisisResource[];
  message: string;
}

// --- API client ---

export const safetyApi = {
  performCheck: (sessionId: string, reason?: string): Promise<ApiResponse<SafetyAssessment>> =>
    api.post('/safety/check', { sessionId, reason }),

  getAssessment: (sessionId: string): Promise<ApiResponse<SafetyAssessment>> =>
    api.get(`/safety/assessment/${sessionId}`),

  updateMeasurements: (sessionId: string, measurements: SafetyMeasurements): Promise<ApiResponse> =>
    api.put(`/safety/measurements/${sessionId}`, measurements),

  getHistory: (sessionId: string): Promise<ApiResponse<SafetyCheck[]>> =>
    api.get(`/safety/history/${sessionId}`),

  triggerEmergency: (sessionId: string, reason: string, severity?: string): Promise<ApiResponse<EmergencyResult>> =>
    api.post('/safety/emergency', { sessionId, reason, severity }),

  getGroundingTechniques: (category?: string, difficulty?: string): Promise<ApiResponse<GroundingTechnique[]>> => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (difficulty) params.set('difficulty', difficulty);
    const query = params.toString();
    return api.get(`/safety/grounding-techniques${query ? `?${query}` : ''}`);
  },

  reportEffectiveness: (techniqueId: string, effectiveness: number, feedback?: string): Promise<ApiResponse> =>
    api.post('/safety/grounding-effectiveness', { techniqueId, effectiveness, feedback }),

  getCrisisResources: (location?: string, type?: string): Promise<ApiResponse<CrisisResource[]>> => {
    const params = new URLSearchParams();
    if (location) params.set('location', location);
    if (type) params.set('type', type);
    const query = params.toString();
    return api.get(`/safety/crisis-resources${query ? `?${query}` : ''}`);
  },
};
```

**Verify:** `cd frontend && npx vite build`

---

## Task 2: Safety Zustand Store

**Files:**
- `frontend/src/stores/safetyStore.ts` (create)

### Description

Zustand store managing safety state. Pattern matches `sessionStore.ts` — granular selectors, async actions wrapping API calls.

### Implementation

```typescript
import { create } from 'zustand';
import {
  safetyApi,
  SafetyAssessment,
  SafetyCheck,
  GroundingTechnique,
  CrisisResource,
  SafetyMeasurements,
} from '../services/safetyApi';

interface SafetyStore {
  // State
  assessment: SafetyAssessment | null;
  history: SafetyCheck[];
  groundingTechniques: GroundingTechnique[];
  crisisResources: CrisisResource[];
  isAssessing: boolean;
  activeGrounding: string | null;
  error: string | null;

  // Actions
  fetchAssessment: (sessionId: string) => Promise<void>;
  performCheck: (sessionId: string, reason?: string) => Promise<void>;
  updateMeasurements: (sessionId: string, measurements: SafetyMeasurements) => Promise<void>;
  fetchHistory: (sessionId: string) => Promise<void>;
  fetchGroundingTechniques: (category?: string) => Promise<void>;
  fetchCrisisResources: () => Promise<void>;
  startGrounding: (techniqueId: string) => void;
  completeGrounding: (techniqueId: string, effectiveness: number, feedback?: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export const useSafetyStore = create<SafetyStore>()((set, get) => ({
  assessment: null,
  history: [],
  groundingTechniques: [],
  crisisResources: [],
  isAssessing: false,
  activeGrounding: null,
  error: null,

  fetchAssessment: async (sessionId) => {
    try {
      const response = await safetyApi.getAssessment(sessionId);
      if (response.success && response.data) {
        set({ assessment: response.data });
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to fetch safety assessment';
      set({ error: msg });
    }
  },

  performCheck: async (sessionId, reason) => {
    set({ isAssessing: true, error: null });
    try {
      const response = await safetyApi.performCheck(sessionId, reason);
      if (response.success && response.data) {
        set({ assessment: response.data, isAssessing: false });
        // Refresh history after new check
        get().fetchHistory(sessionId);
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Safety check failed. If you are in distress, call 988 or text HOME to 741741.';
      set({ isAssessing: false, error: msg });
    }
  },

  updateMeasurements: async (sessionId, measurements) => {
    try {
      await safetyApi.updateMeasurements(sessionId, measurements);
      // Re-assess after measurement update
      get().fetchAssessment(sessionId);
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to update measurements';
      set({ error: msg });
    }
  },

  fetchHistory: async (sessionId) => {
    try {
      const response = await safetyApi.getHistory(sessionId);
      if (response.success && response.data) {
        set({ history: response.data });
      }
    } catch {
      // Silent — history is supplementary
    }
  },

  fetchGroundingTechniques: async (category) => {
    try {
      const response = await safetyApi.getGroundingTechniques(category);
      if (response.success && response.data) {
        set({ groundingTechniques: response.data });
      }
    } catch (error: any) {
      set({ error: error.message || 'Failed to load grounding techniques' });
    }
  },

  fetchCrisisResources: async () => {
    try {
      const response = await safetyApi.getCrisisResources();
      if (response.success && response.data) {
        set({ crisisResources: response.data });
      }
    } catch {
      // Fallback handled in component with hardcoded resources
    }
  },

  startGrounding: (techniqueId) => set({ activeGrounding: techniqueId }),

  completeGrounding: async (techniqueId, effectiveness, feedback) => {
    set({ activeGrounding: null });
    try {
      await safetyApi.reportEffectiveness(techniqueId, effectiveness, feedback);
    } catch {
      // Silent — effectiveness tracking is supplementary
    }
  },

  clearError: () => set({ error: null }),
  reset: () => set({
    assessment: null, history: [], groundingTechniques: [], crisisResources: [],
    isAssessing: false, activeGrounding: null, error: null,
  }),
}));
```

**Verify:** `cd frontend && npx vite build`

---

## Task 3: CrisisResourcesCard Component

**Files:**
- `frontend/src/components/Safety/CrisisResourcesCard.tsx` (create)
- `frontend/src/components/Safety/index.ts` (create)

### Description

Reusable card showing crisis contacts. Used in SafetyPanel, GroundingExercise, and emergency flows. Hardcodes fallback resources so it works even if the API is down.

### Implementation

CrisisResourcesCard:
- Props: `resources?: CrisisResource[]`, `compact?: boolean`
- Always shows 988, Crisis Text Line (741741), 911 as hardcoded fallbacks
- If API resources provided, merge with fallbacks (dedup by contact)
- Compact mode: single row, no descriptions. Full mode: stacked cards with descriptions
- Each contact has a "Copy" button (copies number to clipboard)
- Amber background (`bg-amber-50 border-amber-200`) — consistent with existing crisis styling

Index barrel:
```typescript
export { CrisisResourcesCard } from './CrisisResourcesCard';
```

**Verify:** `cd frontend && npx vite build`

---

## Task 4: SafetyStatusBar Component

**Files:**
- `frontend/src/components/Safety/SafetyStatusBar.tsx` (create)
- `frontend/src/components/Safety/SUDSparkline.tsx` (create)
- `frontend/src/components/Safety/index.ts` (modify — add exports)

### Description

Persistent horizontal bar at top of session. Shows risk level badge, current SUD with trend, mini sparkline, and action buttons.

### SafetyStatusBar

Props: `sessionId: string`, `onTogglePanel: () => void`, `isPanelOpen: boolean`

Layout: horizontal flex bar with:
- **Risk badge**: Colored pill with text (LOW/MEDIUM/HIGH/CRITICAL). Colors: LOW=`bg-green-100 text-green-800`, MEDIUM=`bg-yellow-100 text-yellow-800`, HIGH=`bg-orange-100 text-orange-800`, CRITICAL=`bg-red-100 text-red-800 animate-pulse`
- **SUD display**: "SUD: {value}" with trend arrow icon (TrendingUp/TrendingDown/Minus from lucide-react). Arrow red if rising, green if falling
- **SUDSparkline**: Custom SVG, 80px wide, 24px tall, showing last 5-8 SUD values as a mini line chart
- **"Safety Check" button**: Secondary button, triggers `performCheck`. Shows spinner when `isAssessing`
- **"Safety Panel" toggle**: Icon button (Shield from lucide-react), highlights when panel is open
- **Emergency Stop**: Always-visible red button (reuses existing pattern from SessionControls)

Uses `useSafetyStore` with granular selectors. On mount, calls `fetchAssessment(sessionId)`.

### SUDSparkline

Props: `values: number[]`, `maxValue?: number` (default 10), `width?: number` (default 80), `height?: number` (default 24)

Pure SVG component. Draws a polyline from the values array. Color gradient: green (<4) → yellow (4-6) → red (7+). Uses the last value's color for the line stroke. No dependencies.

**Verify:** `cd frontend && npx vite build`

---

## Task 5: SafetyPanel Component

**Files:**
- `frontend/src/components/Safety/SafetyPanel.tsx` (create)
- `frontend/src/components/Safety/SafetyAssessmentCard.tsx` (create)
- `frontend/src/components/Safety/SafetyHistoryTimeline.tsx` (create)
- `frontend/src/components/Safety/GroundingCard.tsx` (create)
- `frontend/src/components/Safety/index.ts` (modify — add exports)

### Description

Slide-in side panel showing full safety details. Three sections: Assessment, History, Grounding.

### SafetyPanel

Props: `sessionId: string`, `isOpen: boolean`, `onClose: () => void`, `onStartGrounding: (techniqueId: string) => void`

- Fixed position, right side, `w-96`, full height below header
- Slides in/out with Framer Motion `animate={{ x: isOpen ? 0 : '100%' }}`
- `role="complementary"`, `aria-label="Safety monitoring panel"`
- Three collapsible sections using `<details>`/`<summary>` (native HTML, accessible by default):
  1. Current Assessment (SafetyAssessmentCard)
  2. Safety History (SafetyHistoryTimeline)
  3. Grounding Techniques (list of GroundingCards)
- On open: fetches history and grounding techniques if not loaded

### SafetyAssessmentCard

Props: `assessment: SafetyAssessment | null`, `isAssessing: boolean`

- Risk level badge (same colors as StatusBar)
- Indicators list: each with severity dot + description
- Recommended action highlighted in a colored box
- If intervention present: show intervention instructions
- Loading skeleton when `isAssessing`

### SafetyHistoryTimeline

Props: `history: SafetyCheck[]`

- Vertical timeline with dots and connecting lines
- Each entry: timestamp, type badge (AUTOMATIC/MANUAL/TRIGGERED), risk level, action taken
- Most recent at top. Max 10 shown, "Show more" expands
- Empty state: "No safety checks recorded yet"

### GroundingCard

Props: `technique: GroundingTechnique`, `onStart: (id: string) => void`

- Card with technique name, type badge, duration, effectiveness bar
- "Start Exercise" button
- Effectiveness shown as a simple bar (0-100% width, green fill)

**Verify:** `cd frontend && npx vite build`

---

## Task 6: GroundingExercise & BoxBreathingGuide

**Files:**
- `frontend/src/components/Safety/GroundingExercise.tsx` (create)
- `frontend/src/components/Safety/BoxBreathingGuide.tsx` (create)
- `frontend/src/components/Safety/index.ts` (modify — add exports)

### Description

Full-screen overlay for guided grounding exercises. Generic wrapper + specialized Box Breathing component.

### GroundingExercise

Props: `technique: GroundingTechnique | null`, `onComplete: (effectiveness: number) => void`, `onCancel: () => void`

- Renders `null` when technique is null
- Full-screen overlay (`fixed inset-0 z-50 bg-therapy-bg`)
- Header: technique name + "X" close button
- Body: If technique is "box-breathing" → render BoxBreathingGuide. Otherwise → step-by-step instructions with Next/Previous navigation
- Step display: large text, current step number, progress dots
- Timer: countdown for technique duration
- Footer: "I feel better" (green, calls onComplete with effectiveness 7+) and "I need more help" (amber, shows CrisisResourcesCard then calls onComplete with effectiveness 3)
- `aria-live="polite"` on step content for screen readers
- Respects `prefers-reduced-motion`: disables animations if set

### BoxBreathingGuide

Props: `onComplete: () => void`

- Animated breathing circle that expands/contracts
- Four phases: Inhale (4s) → Hold (4s) → Exhale (4s) → Hold (4s)
- Phase label in center of circle
- Progress ring around the circle (SVG circle with `stroke-dashoffset` animation)
- Cycle counter: "Cycle 1 of 4"
- Auto-completes after 4 cycles (64 seconds)
- Framer Motion animation with `prefers-reduced-motion` check: if reduced motion, show text-only countdown instead of expanding circle

**Verify:** `cd frontend && npx vite build`

---

## Task 7: Integrate Safety into SessionPage

**Files:**
- `frontend/src/pages/SessionPage.tsx` (modify)
- `frontend/src/components/Safety/index.ts` (modify — ensure all exports)

### Description

Wire SafetyStatusBar, SafetyPanel, and GroundingExercise into the existing SessionPage.

### Changes to SessionPage

1. **Imports**: Add `SafetyStatusBar`, `SafetyPanel`, `GroundingExercise` from `'../components/Safety'`
2. **Imports**: Add `useSafetyStore` from `'../stores/safetyStore'`
3. **State**: Add `const [showSafetyPanel, setShowSafetyPanel] = useState(false);`
4. **Store selectors**: Add safety store selectors:
   ```typescript
   const activeGrounding = useSafetyStore(s => s.activeGrounding);
   const groundingTechniques = useSafetyStore(s => s.groundingTechniques);
   const startGrounding = useSafetyStore(s => s.startGrounding);
   const completeGrounding = useSafetyStore(s => s.completeGrounding);
   const resetSafety = useSafetyStore(s => s.reset);
   ```
5. **Cleanup**: Add `resetSafety()` to the cleanup effect (alongside `clearActiveSession`)
6. **SafetyStatusBar**: Insert between `<header>` and `<main>`:
   ```tsx
   {activeSession && !isFinished && (
     <SafetyStatusBar
       sessionId={activeSession.id}
       onTogglePanel={() => setShowSafetyPanel(prev => !prev)}
       isPanelOpen={showSafetyPanel}
     />
   )}
   ```
   Where `isFinished = activeSession?.state === 'completed' || activeSession?.state === 'emergency_stopped'`
7. **SafetyPanel**: Add after `</main>`:
   ```tsx
   {activeSession && (
     <SafetyPanel
       sessionId={activeSession.id}
       isOpen={showSafetyPanel}
       onClose={() => setShowSafetyPanel(false)}
       onStartGrounding={startGrounding}
     />
   )}
   ```
8. **GroundingExercise**: Add after SafetyPanel:
   ```tsx
   <GroundingExercise
     technique={groundingTechniques.find(t => t.id === activeGrounding) ?? null}
     onComplete={(eff) => { if (activeGrounding) completeGrounding(activeGrounding, eff); }}
     onCancel={() => { if (activeGrounding) completeGrounding(activeGrounding, 5); }}
   />
   ```

**Verify:** `cd frontend && npx vite build`

---

## Task Dependencies

```
Task 1 (API service) → Task 2 (store) → Tasks 3-6 (components, parallel-safe)
Tasks 3-6 → Task 7 (integration)
```

Dispatch order: 1 → 2 → [3, 4, 5, 6 in parallel] → 7

## Final Verification

```bash
cd frontend && npx vite build
```
