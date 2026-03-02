# Full-Stack Polish Sprint Design

**Date**: 2026-03-02
**Goal**: Close achievable GitHub issues, eliminate tech debt, add test coverage, improve quality

## Sprint Scope

### 1. GitHub Housekeeping
- Close #7 as duplicate of #20 (Bilateral Stimulation Engine)
- Close #8 as overlap with #19 (Safety Monitoring Interface)
- Add labels (P1-critical, P2-next, P3-future, frontend, backend, tech-debt)
- Create "MVP Sprint" milestone for achievable work

### 2. Tech Debt Cleanup

**Type Adapters** — Replace 11 `as any` casts in SessionService:
- Create `backend/src/utils/typeAdapters.ts` with Prisma-to-shared type conversion functions
- Handle null→undefined conversion for Prisma compatibility
- Remove all `as any` casts from SessionService

**Shared Type Gaps**:
- `shared/types/User.ts` — User, UserProfile, SafetyProfile types
- `shared/types/API.ts` — Request/response DTOs for all endpoints
- `shared/types/WebSocket.ts` — Client/server event type definitions
- Fix `AgentInteraction.agentType` enum mismatch in `shared/types/EMDR.ts`

**Validation Completion**:
- Fill remaining Zod schema gaps in `backend/src/middleware/validation.ts`

**Lockfile Migration**:
- Commit npm→pnpm switch

### 3. Test Coverage

**Unit Tests**:
- `AuthService.test.ts` — registration, login, token refresh, password validation
- `SessionService.test.ts` — session lifecycle, phases, SUD/VOC tracking
- `SafetyProtocolService.test.ts` — risk assessment, triggers, emergency protocols, grounding

**Integration Tests**:
- `auth.integration.test.ts` — full authentication flow

### 4. Frontend Foundation Components (Partial #4)

Reusable building blocks in `frontend/src/components/Common/`:
- `Button` — variants (primary, secondary, danger, ghost), sizes, loading
- `Input` — label, error state, helper text
- `Modal` — overlay, close handling, sizes
- `Card` — header, body, footer
- `Alert` — info, warning, error, success (for safety alerts)

### 5. Shared Types Hardening
- Type guards and validators in `shared/utils/validators.ts`
- Export Zod schemas from shared package
- Discriminated unions for AgentMessage.content and SessionUpdate.data

## Issue Impact

| Issue | Action | Result |
|-------|--------|--------|
| #7 | Close as duplicate | Closed |
| #8 | Close as duplicate | Closed |
| #4 | Foundation components | ~30% |
| #16 | Labels, milestones | ~50% |
| #9 | Type system fixes | ~20% |
| Tech debt | as-any casts, validation | Resolved |
| Quality | 4 test suites | New coverage |

## Out of Scope
- EMDR session management UI
- Agent intelligence/LLM integration
- Bilateral stimulation engine
- Safety monitoring UI
- Production deployment
