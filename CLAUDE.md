# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Project Overview

An **Agentic EMDR Therapy Application** — an AI system for **research and educational purposes** that guides users through EMDR (Eye Movement Desensitization and Reprocessing) sessions.

> **Critical:** This is NOT a medical device and NOT a replacement for professional therapy. User safety overrides every other concern. Never bypass or disable safety protocols. See `docs/SAFETY_GUIDELINES.md` before any safety-related change.

## Architecture

Monorepo with four workspaces:

- `frontend/` — React + TypeScript (Vite, Tailwind, Zustand)
- `backend/` — Node.js + TypeScript API (Express, Prisma, Socket.io)
- `shared/` — shared types (`shared/types/EMDR.ts`, `shared/types/Agent.ts`)
- `config/` — environment templates

Other top-level docs: `ARCHITECTURE.md`, `DEVELOPMENT_PLAN.md`, `PROJECT_STATUS.md`. Sprint plans live in `docs/plans/`.

### Agents

The design envisions multiple specialized agents, but only one is implemented today:

- **`EMDRTherapistAgent`** (`backend/src/agents/therapy/EMDRTherapistAgent.ts`) — primary therapeutic guidance.
- Safety monitoring is **not** a separate agent — it lives in `SafetyProtocolService` (see below).
- `backend/src/agents/core/` and `agents/specialized/` are empty placeholders. Treat the "Safety Monitor / Orchestrator / Progress / Crisis" agents as planned, not built.

### Backend layout (`backend/src/`)

- `services/` — `AuthService`, `UserService`, `SessionService`, `SafetyProtocolService`, `LLMService` (OpenAI/Anthropic), `PrismaService`
- `controllers/` — `AuthController`, `UserController`, `SessionController`, `SafetyController`
- `routes/` — `auth.ts`, `users.ts`, `sessions.ts`, `safety.ts` (no agent routes yet)
- `middleware/` — JWT auth, Zod validation, multi-tier rate limiting, input sanitization
- `utils/typeAdapters.ts` — Prisma↔shared type conversions (see Gotchas)

### Frontend layout (`frontend/src/`)

- `components/auth/` ✅, `components/Common/` ✅, `components/Safety/` ✅ (10 components), `components/SessionManagement/` ✅ (9 components)
- `components/AgentInterface/`, `components/BilateralStimulation/`, `components/SafetyFeatures/` — **empty**, not yet built (bilateral stim is the next P1 feature, issue #20)
- `pages/` — Dashboard, NewSession, Session, SessionSummary
- `stores/` — `authStore`, `sessionStore`, `safetyStore` (Zustand)
- `services/` — Axios API client (auto token refresh) + WebSocket service

### Database (PostgreSQL + Prisma)

Models in `backend/prisma/schema.prisma`: `User`, `SafetyProfile`, `TargetMemory`, `EMDRSession`, `EMDRSet`, `AgentMessage`, `SafetyCheck`, `ProgressReport`.

## Commands

All commands run from the repo root unless noted.

```bash
# Setup
npm run install:all                # install root + all workspaces
cp config/development.env .env     # then fill in secrets (see Environment)
npm run db:migrate                 # apply Prisma migrations
npm run db:seed                    # seed initial data

# Develop
npm run dev                        # frontend (3000) + backend (5000) concurrently
npm run dev:frontend
npm run dev:backend

# Quality (run before committing)
npm run type-check                 # tsc --noEmit, both packages
npm run lint                       # frontend lint is --max-warnings 0
npm run test                       # frontend (Vitest) + backend (Jest)

# Database (these proxy into backend/)
npm run db:generate                # regenerate Prisma client after schema edits
npm run db:reset                   # destructive — drops and re-migrates
cd backend && npm run db:studio    # Prisma Studio

# Build
npm run build                      # shared -> frontend -> backend
```

Single-package shortcuts: `cd backend && npm run test:watch`, `cd frontend && npm run test:ui`, `npm run lint:fix` (in either package).

## Environment

Required in `.env` (template: `config/development.env`):

```
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
JWT_SECRET=...
REDIS_URL=redis://localhost:6379
```

Docker for local Postgres + Redis: `npm run docker:up` (compose file at repo root).

## Safety System (read before touching)

All safety logic is in `backend/src/services/SafetyProtocolService.ts`:

- Automatic triggers at **SUD ≥ 8** or a rapid distress increase (**≥ 3 points**).
- Crisis intervention surfaces professional resources (988, Crisis Text Line).
- Grounding-techniques library + effectiveness reporting.
- Emergency-stop capability is wired through the WebSocket layer.
- Frontend safety UI: `frontend/src/components/Safety/` + `safetyStore`.

EMDR protocol context: 8 phases (Preparation → Reevaluation), SUD (0–10) and VOC (1–7) tracking per set.

## Conventions

- TypeScript strict mode across all packages.
- Request flow / middleware order: `rateLimit → authenticate → sanitize → validate(zodSchema) → controller`.
- Services are singletons; controllers call services, never Prisma directly.
- Winston for logging.

## Gotchas

- **Package manager drift:** scripts use **npm**, but a stray `pnpm-lock.yaml` exists at the root (and in `backend/`). Use npm; the pnpm lockfiles are slated for removal. Don't add to them.
- **Prisma null vs shared undefined:** Prisma emits `string | null`; shared types expect `string | undefined`. Convert via `backend/src/utils/typeAdapters.ts` — don't sprinkle `as any`.
- **Test coverage is thin:** only backend has tests (4 files, all in `__tests__/`). There are **no frontend tests yet**. Safety-protocol logic must be unit-tested when changed.
- **Rate limiting** is disabled in development; verify limits against production config before relying on them.

## Working Norms

- Prioritize user safety over functionality in every decision.
- Create a migration for any schema change (`cd backend && npx prisma migrate dev --name <desc>`), then `npm run db:generate`.
- Verify with `npm run type-check` and `npm run test` before claiming work complete.
