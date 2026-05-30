# Sprint: Core EMDR Session UI

**Date:** 2026-03-02
**Scope:** Issues #17 (Session Management Interface) + remainder of #4 (Core Frontend Components)
**Goal:** Polished, therapy-appropriate session management interface connected to real backend API.

## Architecture

### New Files
- `frontend/src/stores/sessionStore.ts` — Zustand store for session state + API calls
- `frontend/src/services/sessionApi.ts` — Typed API client for session endpoints
- `frontend/src/components/SessionManagement/` — 8-10 components
- `frontend/src/pages/` — Page-level components: DashboardPage, NewSessionPage, SessionPage, SessionSummaryPage

### Data Flow
```
SessionPage → useSessionStore → sessionApi → backend /api/sessions/*
```
WebSocket deferred to Agent Communication sprint (#18). Mutations refresh from API response.

## Components

| Component | Purpose |
|-----------|---------|
| `SessionDashboard` | Session history list + "New Session" CTA |
| `SessionPage` | Main session container — phase display, controls, measurements |
| `PhaseIndicator` | Horizontal stepper for 8 EMDR phases, animated transitions |
| `SessionControls` | Start/pause/resume/complete/emergency-stop buttons |
| `SessionTimer` | Elapsed time for session and current phase |
| `SUDScale` | Interactive 0-10 distress scale with color gradient |
| `VOCScale` | Interactive 1-7 cognition validity scale |
| `TargetMemoryForm` | react-hook-form + zod for target memory entry |
| `TargetMemoryCard` | Read-only target memory display during session |
| `SessionSummary` | End-of-session outcome: SUD reduction, VOC improvement, duration |

## Design Language
- Calming palette: soft blues, muted teals, warm neutrals
- Framer Motion for phase transitions, scale selections, modal animations
- Large touch targets (therapy context — users may be distressed)
- Clear typography hierarchy, generous spacing
- Harsh red reserved for emergency stop only

## Session Lifecycle

```
[No Session] → POST /sessions → [PREPARING]
    → Enter Target Memory → Record Initial SUD/VOC → Start
[IN_PROGRESS] → PUT /sessions/:id/phase
    PREPARATION → ASSESSMENT → DESENSITIZATION →
    INSTALLATION → BODY_SCAN → CLOSURE → REEVALUATION
    ├── Pause → [PAUSED] → Resume → [IN_PROGRESS]
    ├── Emergency Stop → [EMERGENCY_STOPPED] → Summary
    └── Complete → [COMPLETED] → Summary
```

## Session Store

```typescript
interface SessionStore {
  sessions: EMDRSession[];
  activeSession: EMDRSession | null;
  isLoading: boolean;
  error: string | null;

  createSession: (data: CreateSessionData) => Promise<void>;
  loadSession: (id: string) => Promise<void>;
  loadUserSessions: (page?: number) => Promise<void>;
  progressPhase: (phase: EMDRPhase) => Promise<void>;
  recordSUD: (level: number) => Promise<void>;
  recordVOC: (level: number) => Promise<void>;
  pauseSession: () => Promise<void>;
  resumeSession: () => Promise<void>;
  completeSession: () => Promise<void>;
  emergencyStop: () => Promise<void>;
  startSet: (settings: BilateralStimulationSettings) => Promise<void>;
  completeSet: (feedback: SetFeedback) => Promise<void>;

  timer: { elapsed: number; phaseElapsed: number };
  startTimer: () => void;
  stopTimer: () => void;
}
```

Timer runs client-side. On refresh, recalculates from `session.startTime`.

## Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | DashboardPage | Session history + new session CTA |
| `/sessions/new` | NewSessionPage | Target memory form + initial measurements |
| `/sessions/:id` | SessionPage | Active session with phases, controls, measurements |
| `/sessions/:id/summary` | SessionSummaryPage | Post-session outcome |

All protected behind `ProtectedRoute`.

## Testing
- Component tests: SUDScale, VOCScale, PhaseIndicator, SessionControls
- Store tests: mocked API for session lifecycle
- Form validation: TargetMemoryForm zod schema
- No E2E this sprint

## Out of Scope
- WebSocket real-time sync (deferred to #18)
- Agent communication UI (deferred to #18)
- Bilateral stimulation engine (deferred to #20)
- Safety monitoring interface (deferred to #19)
