# Safety Monitoring QA Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Context:** Three-reviewer QA (Codex, Gemini, Claude) found 5 critical, 14 important, and 6 minor findings in the Safety Monitoring UI sprint. All findings are frontend-only except C2 (backend placeholder) and C3 (backend field names).

**Goal:** Fix all critical and important QA findings so the safety monitoring UI is functionally correct, accessible (WCAG AA), and safe for the therapy context.

**Architecture:** Fixes span frontend components, the safety store, the safety API service, one backend controller, and SessionPage integration. No new files needed.

**Tech Stack:** TypeScript, React 18 (`useId`), Zustand, Framer Motion, Tailwind CSS

---

## Task 1: Critical Safety UX Fixes

**Files:**
- `frontend/src/components/Safety/GroundingExercise.tsx` (modify)
- `frontend/src/components/Safety/CrisisResourcesCard.tsx` (modify)
- `frontend/src/pages/SessionPage.tsx` (modify)

### C1. Fix "I need more help" auto-dismiss (GroundingExercise.tsx:68-73)

Remove the `setTimeout(() => onComplete(3), 800)`. Instead, keep the exercise alive when showing crisis resources. Only call `onComplete(3)` when user explicitly closes the crisis overlay.

Replace `handleNeedMoreHelp`:
```typescript
function handleNeedMoreHelp() {
  setShowCrisis(true);
}
```

Add a new handler for closing crisis overlay:
```typescript
function handleCloseCrisis() {
  setShowCrisis(false);
  if (!completedRef.current) {
    completedRef.current = true;
    onComplete(3);
  }
}
```

Update the crisis overlay close button to use `handleCloseCrisis`.

### C4. Add tel:/sms: links to CrisisResourcesCard

In `CrisisResourcesCard.tsx`, add a helper that returns the correct href based on resource type:
```typescript
function getContactHref(resource: CrisisResource): string | null {
  if (resource.type === 'hotline' || resource.type === 'emergency') return `tel:${resource.contact}`;
  if (resource.type === 'text') return `sms:741741?body=HOME`;
  return null;
}
```

Wrap contact text in `<a>` tags where `getContactHref` returns non-null. Style: `underline text-amber-800 hover:text-amber-900`.

### I1. Keep SafetyStatusBar visible after emergency stop (SessionPage.tsx:87-93)

Change the condition from:
```
activeSession.state !== 'completed' && activeSession.state !== 'emergency_stopped'
```
To only hide for completed:
```
activeSession.state !== 'completed'
```

### I14. Delay auto-redirect after emergency stop (SessionPage.tsx:48-51)

Don't auto-redirect on `emergency_stopped`. Let user explicitly navigate. Change:
```typescript
if (activeSession?.state === 'completed' || activeSession?.state === 'emergency_stopped') {
```
To:
```typescript
if (activeSession?.state === 'completed') {
```

**Verify:** `cd frontend && npx vite build`

---

## Task 2: Backend Contract Fixes

**Files:**
- `backend/src/controllers/SafetyController.ts` (modify lines 27-28)

### C2. Implement real performCheck (SafetyController.ts:27-28)

Replace the placeholder with a real call:
```typescript
const safetyCheck = await safetyProtocolService.assessCurrentState(sessionId);
```

The `assessCurrentState` method already exists and returns the right shape.

### C3. This is a frontend-side fix — add type adapter in Task 3.

**Verify:** `cd backend && npx tsc --noEmit 2>&1 | head -20`

---

## Task 3: Store & API Contract Fixes

**Files:**
- `frontend/src/stores/safetyStore.ts` (modify)
- `frontend/src/services/safetyApi.ts` (modify)
- `frontend/src/components/Safety/GroundingCard.tsx` (modify line 23)

### C3. Add SafetyCheck field adapter (safetyApi.ts)

Backend returns `checkType/measurements/timestamp`. Frontend expects `type/riskLevel/details/createdAt`. Add a normalizer in `safetyApi.getHistory`:

```typescript
getHistory: async (sessionId: string): Promise<ApiResponse<SafetyCheck[]>> => {
  const response = await api.get<any>(`/safety/history/${sessionId}`);
  if (response.success && response.data) {
    response.data = response.data.map((check: any) => ({
      id: check.id,
      sessionId: check.sessionId,
      type: check.checkType ?? check.type ?? 'UNKNOWN',
      riskLevel: check.measurements?.riskLevel ?? check.riskLevel ?? 'LOW',
      action: check.action ?? check.measurements?.action ?? '',
      details: check.measurements ?? check.details,
      createdAt: check.timestamp ?? check.createdAt,
    }));
  }
  return response;
},
```

### I3. Fix effectiveness 0-1 vs 0-100 scale (GroundingCard.tsx:23)

Backend returns 0-1. Change line 23:
```typescript
const effectivenessPercent = Math.max(0, Math.min(100, Math.round(technique.effectiveness * 100)));
```

### I4. Fix isAssessing stuck on success:false (safetyStore.ts:55-63)

Add `finally` block:
```typescript
performCheck: async (sessionId, reason) => {
  set({ isAssessing: true, error: null });
  try {
    const response = await safetyApi.performCheck(sessionId, reason);
    if (response.success && response.data) {
      set({ assessment: response.data });
      get().fetchHistory(sessionId);
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Safety check failed. If you are in distress, call 988 or text HOME to 741741.';
    set({ error: msg });
  } finally {
    set({ isAssessing: false });
  }
},
```

### I7. Reset hasOpenedRef on sessionId change

This is in SafetyPanel — handled in Task 4.

### I8. Call fetchCrisisResources in SafetyPanel

This is in SafetyPanel — handled in Task 4.

### I9. Await fire-and-forget mutations (safetyStore.ts)

In `performCheck`, change `get().fetchHistory(sessionId)` to not fire-and-forget — just leave as-is since the store update is non-critical. But add isAssessing reset in finally (already done above).

### I10. Fix `catch (error: any)` → `catch (error: unknown)` throughout store

Replace all `catch (error: any)` with `catch (error: unknown)` and use proper narrowing:
```typescript
catch (error: unknown) {
  const msg = error instanceof Error ? error.message : 'Failed to ...';
  // For axios errors: check (error as any).response?.data?.message first
}
```

**Verify:** `cd frontend && npx vite build`

---

## Task 4: Accessibility & Panel Fixes

**Files:**
- `frontend/src/components/Safety/GroundingExercise.tsx` (modify lines 142-158)
- `frontend/src/components/Safety/SafetyPanel.tsx` (modify)
- `frontend/src/components/Safety/SUDSparkline.tsx` (modify)
- `frontend/src/components/Safety/BoxBreathingGuide.tsx` (modify)

### C5. Fix progress dots ARIA (GroundingExercise.tsx:142)

Replace `role="tablist"` with `role="group"` and `aria-label="Step progress"`. Remove `role="tab"` and `aria-selected` from dots. Add `aria-hidden="true"` to each dot.

### I2. Add aria-hidden/inert to SafetyPanel when closed

Add `aria-hidden={!isOpen}` and `inert={!isOpen ? '' : undefined}` to the `motion.div`:
```tsx
<motion.div
  role="complementary"
  aria-label="Safety monitoring panel"
  aria-hidden={!isOpen}
  {...(!isOpen ? { inert: '' } : {})}
  ...
```

### I7. Reset hasOpenedRef on sessionId change (SafetyPanel.tsx:49)

Add a second useEffect:
```typescript
useEffect(() => {
  hasOpenedRef.current = false;
}, [sessionId]);
```

### I8. Call fetchCrisisResources (SafetyPanel.tsx:51-56)

Add `fetchCrisisResources` to the store selectors and call it in the first-open effect:
```typescript
const fetchCrisisResources = useSafetyStore((s) => s.fetchCrisisResources);

// In the open effect:
if (isOpen && !hasOpenedRef.current) {
  hasOpenedRef.current = true;
  fetchHistory(sessionId);
  fetchGroundingTechniques();
  fetchCrisisResources();
}
```

### I13. Fix SUDSparkline conflicting ARIA (SUDSparkline.tsx)

Remove `role="img"` and `aria-label` from all three SVGs. Keep only `aria-hidden="true"`.

### I11. Fix window.matchMedia in BoxBreathingGuide render (BoxBreathingGuide.tsx:42)

Replace with a `useState` + `useEffect`:
```typescript
const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
useEffect(() => {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  setPrefersReducedMotion(mq.matches);
  const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}, []);
```

### I6. Fix BoxBreathingGuide onComplete inline arrow (GroundingExercise.tsx:120)

Wrap in useCallback or use a ref:
```typescript
const onBreathingComplete = useRef(() => onComplete(7));
useEffect(() => { onBreathingComplete.current = () => onComplete(7); });
```
Then pass `() => onBreathingComplete.current()` to BoxBreathingGuide.

Actually simpler: store `onComplete` in a ref inside BoxBreathingGuide and remove `onComplete` from the useEffect deps array:
```typescript
const onCompleteRef = useRef(onComplete);
useEffect(() => { onCompleteRef.current = onComplete; });

// In the interval effect, use onCompleteRef.current instead of onComplete
// Remove onComplete from dependency array
useEffect(() => {
  // ... interval logic using onCompleteRef.current ...
}, []); // stable — no deps needed
```

### I12. Clean up setTimeout in BoxBreathingGuide (line 82)

Store the timeout ID and clear in cleanup:
```typescript
const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
// In the interval:
timeoutRef.current = setTimeout(() => onCompleteRef.current(), 500);
// Add cleanup:
return () => {
  clearInterval(interval);
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
};
```

**Verify:** `cd frontend && npx vite build`

---

## Task Dependencies

```
Tasks 1, 2, 3, 4 are all independent — can run in parallel.
```

## Final Verification

```bash
cd frontend && npx vite build
cd backend && npx tsc --noEmit 2>&1 | head -20
```
