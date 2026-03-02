# Safety Monitoring Interface Design

**Date:** 2026-03-03
**Issue:** #19
**Approach:** Session-Integrated Safety Panel (Approach A)

## Architecture

Safety monitoring lives **inside the session context**, not as a separate page. A persistent status bar and expandable panel keep safety visible without disrupting the therapy flow.

## Components

### SafetyStatusBar
Persistent horizontal bar at top of SessionPage. Shows:
- Risk level badge (LOW=green, MEDIUM=yellow, HIGH=orange, CRITICAL=red)
- Current SUD with trend arrow (up/down/stable)
- Mini sparkline of last 5 SUD readings
- "Safety Check" button (triggers manual assessment)
- Emergency stop button (always visible, never disabled)

### SafetyPanel
Collapsible side panel (slides in from right). Contains:
- **Assessment Section**: Current risk level, indicators list, recommended action
- **SUD Trend**: Line chart of SUD readings over session timeline
- **History Timeline**: Chronological list of safety checks with type badges (AUTOMATIC/MANUAL/TRIGGERED)
- **Grounding Quick-Access**: Cards for available techniques with "Start" buttons

### GroundingExercise
Full-screen overlay for guided grounding. Three built-in techniques:
- **5-4-3-2-1 Sensory**: Step-through with prompts for each sense
- **Box Breathing**: Animated breathing guide (inhale 4s → hold 4s → exhale 4s → hold 4s)
- **Safe Place Visualization**: Timed guided visualization with calming backdrop

Each has: step indicator, timer, "I feel better" / "I need more help" exit buttons.
"I need more help" shows crisis resources.

### CrisisResourcesCard
Reusable card showing:
- 988 Suicide & Crisis Lifeline (call)
- Crisis Text Line: text HOME to 741741
- 911 Emergency Services
- Copy-to-clipboard for each contact

Used in: SafetyPanel, GroundingExercise exit, EmergencyStop modal, ErrorBoundary.

### SafetyApi Service
Typed API client (`frontend/src/services/safetyApi.ts`):
```
performCheck(sessionId, reason?) → SafetyAssessment
getAssessment(sessionId) → SafetyAssessment
updateMeasurements(sessionId, measurements) → void
getHistory(sessionId) → SafetyCheck[]
triggerEmergency(sessionId, reason, severity?) → EmergencyResult
getGroundingTechniques(category?, difficulty?) → GroundingTechnique[]
reportEffectiveness(techniqueId, effectiveness, feedback?) → void
getCrisisResources(location?, type?) → CrisisResource[]
```

### SafetyStore (Zustand)
```
safetyAssessment: SafetyAssessment | null
safetyHistory: SafetyCheck[]
groundingTechniques: GroundingTechnique[]
crisisResources: CrisisResource[]
isAssessing: boolean
activeGrounding: string | null  // technique ID if exercise in progress
```

## Data Flow

1. SessionPage mounts → SafetyStatusBar fetches initial assessment
2. SUD changes → auto-assess if threshold crossed (SUD ≥ 8)
3. User clicks "Safety Check" → manual assessment → update panel
4. Assessment returns HIGH/CRITICAL → auto-expand SafetyPanel, highlight recommended action
5. User starts grounding → full-screen overlay → reports effectiveness on exit
6. Emergency → triggerEmergency API → session stops → crisis resources shown

## Integration with SessionPage

SafetyStatusBar sits between header and main content. SafetyPanel is a fixed-position overlay that doesn't reflow the page. GroundingExercise is a portal-rendered full-screen overlay.

## Accessibility

- All risk levels have both color AND text labels
- Crisis resources are always reachable (max 2 clicks from any state)
- GroundingExercise steps are screen-reader friendly with aria-live regions
- Emergency button has `aria-label` and high contrast at all times
- Box breathing animation respects `prefers-reduced-motion`

## Files to Create/Modify

**New files:**
- `frontend/src/services/safetyApi.ts`
- `frontend/src/stores/safetyStore.ts`
- `frontend/src/components/Safety/SafetyStatusBar.tsx`
- `frontend/src/components/Safety/SafetyPanel.tsx`
- `frontend/src/components/Safety/SafetyAssessmentCard.tsx`
- `frontend/src/components/Safety/SUDTrendChart.tsx`
- `frontend/src/components/Safety/SafetyHistoryTimeline.tsx`
- `frontend/src/components/Safety/GroundingExercise.tsx`
- `frontend/src/components/Safety/GroundingCard.tsx`
- `frontend/src/components/Safety/BoxBreathingGuide.tsx`
- `frontend/src/components/Safety/CrisisResourcesCard.tsx`
- `frontend/src/components/Safety/index.ts`

**Modified files:**
- `frontend/src/pages/SessionPage.tsx` — add SafetyStatusBar + SafetyPanel
- `frontend/src/App.tsx` — no new routes needed (all in-session)
