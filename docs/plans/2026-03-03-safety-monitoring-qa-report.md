# Safety Monitoring Sprint — Three-Reviewer QA Report

**Date:** 2026-03-03
**Reviewers:** Codex (OpenAI), Gemini (Google), Claude (Anthropic)
**Scope:** 13 files, 1,567 lines added in Safety Monitoring UI sprint

## Critical Findings (5)

### C1. "I need more help" auto-dismisses crisis resources after 800ms
**Reviewers:** Claude, Gemini, Codex
**Files:** `GroundingExercise.tsx:68-73`, `SessionPage.tsx:137`
`onComplete(3)` fires via setTimeout(800ms), parent clears `activeGrounding`, unmounts overlay. Distressed user loses crisis contacts almost immediately.
**Fix:** Remove auto-dismiss. Keep crisis resources until user explicitly closes.

### C2. `performCheck` backend returns placeholder data
**Reviewers:** Claude, Codex
**Files:** `SafetyController.ts:27-28`, `safetyApi.ts:84`
Backend has TODO stub returning `{id, sessionId, reason, timestamp}` — structurally incompatible with `SafetyAssessment`. Frontend store writes invalid data.
**Fix:** Implement real `performCheck` in SafetyController using `safetyProtocolService.assessCurrentState()`.

### C3. History field name mismatch (frontend vs backend)
**Reviewers:** Claude, Codex
**Files:** `SafetyHistoryTimeline.tsx`, `SafetyProtocolService.ts:373,577`
Frontend expects `type/riskLevel/details/createdAt`. Backend returns `checkType/measurements/timestamp`. Timeline will show empty/broken data.
**Fix:** Add type adapter in safetyApi.ts or normalize backend response shape.

### C4. Crisis contacts not actionable links
**Reviewers:** Claude, Gemini, Codex
**Files:** `CrisisResourcesCard.tsx`
Phone numbers are plain text + copy button. No `tel:` or `sms:` links for one-tap calling on mobile.
**Fix:** Wrap contacts in `<a href="tel:988">`, `<a href="sms:741741?body=HOME">` links.

### C5. ARIA `role="tablist/tab"` on non-interactive progress dots
**Reviewers:** Claude, Codex
**Files:** `GroundingExercise.tsx:142`
Progress dots use tab roles but are non-interactive divs. Violates ARIA authoring practices.
**Fix:** Change to `role="group"` with `aria-label="Step progress"`, dots as `aria-hidden="true"`.

## Important Findings (14)

### I1. SafetyStatusBar hidden after emergency stop
**Reviewers:** Gemini, Claude
User loses access to safety resources when session state is `completed` or `emergency_stopped`.

### I2. SafetyPanel always mounted, no `aria-hidden`/`inert` when closed
**Reviewers:** Claude, Codex
Panel slides off-screen but remains keyboard/screen-reader reachable.

### I3. Grounding `effectiveness` 0-1 vs 0-100 scale mismatch
**Reviewer:** Codex
Backend returns 0-1, GroundingCard displays as percentage without ×100.

### I4. `isAssessing` not reset on `success: false` path
**Reviewer:** Codex
"Checking..." button stuck if API returns `success: false` without throwing.

### I5. Modal dialogs lack focus trap
**Reviewers:** Claude, Gemini
GroundingExercise and nested crisis overlay don't trap focus.

### I6. `BoxBreathingGuide` onComplete inline arrow causes effect restart
**Reviewer:** Claude
`() => onComplete(7)` creates new reference each render, restarting breathing exercise.

### I7. `hasOpenedRef` not reset on sessionId change
**Reviewer:** Claude
Panel shows stale data when navigating between sessions.

### I8. `fetchCrisisResources` never called
**Reviewer:** Codex
Store method defined but unused. Always falls back to static US-only resources.

### I9. Fire-and-forget mutations cause race conditions
**Reviewers:** Claude, Gemini
`fetchHistory`/`fetchAssessment` called without await after mutations.

### I10. `catch (error: any)` throughout store
**Reviewers:** Claude, Gemini, Codex
Should use `unknown` with proper narrowing.

### I11. `window.matchMedia` called during render
**Reviewers:** Claude, Gemini
Not reactive to runtime changes. Should use `useEffect` or Framer Motion hook.

### I12. `setTimeout` in BoxBreathingGuide not cleaned up
**Reviewers:** Claude, Codex
500ms delay `onComplete` may fire after unmount.

### I13. SUDSparkline conflicting ARIA attributes
**Reviewer:** Claude
`aria-hidden="true"` and `role="img"` with `aria-label` conflict.

### I14. Auto-redirect after emergency stop
**Reviewer:** Claude
Immediate navigate to summary page removes access to crisis resources.

## Minor Findings (6)

- `resetSafety` missing from useEffect dependency array in SessionPage
- `CopyButton` setTimeout not cleaned up on unmount
- `SafetyCheck.riskLevel` typed as `string` instead of `RiskLevel`
- `prefers-reduced-motion` not checked in SafetyPanel slide animation
- `document.execCommand('copy')` fallback is deprecated
- Hardcoded effectiveness values (7, 3) instead of user self-report
