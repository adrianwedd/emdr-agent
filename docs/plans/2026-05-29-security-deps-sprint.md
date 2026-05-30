# Security & Dependency Cleanup Sprint

**Date:** 2026-05-29
**Tracks:** #37 (Dependabot blocked / axios advisory), PR #39 (grouped 20-dep bump)
**Goal:** Clear the security-dependency backlog, get the axios advisory resolved, and restore a clean, single-package-manager dependency baseline — *without* breaking the build via risky major bumps bundled in the grouped PR.

> **Why this sprint first:** Security debt compounds and the Dependabot pipeline is currently jammed. Clearing it gives the next two feature sprints (Bilateral Stimulation, Agent System) a green, trustworthy CI baseline to build on.

---

## Current state (verified 2026-05-29)

- Only **one** open PR remains: **#39** — `build(deps): Bump the npm_and_yarn group across 3 directories with 20 updates`. Status: **MERGEABLE**, Socket Security **pass**.
- The stale PRs listed in #37 (#21, #26, #27, #30–#36) are **already closed** — the grouped bump #39 superseded them. #37's stated remediation is effectively done; it just needs verification + closure.
- **Package-manager drift:** root commits `pnpm-lock.yaml` *and* declares npm `workspaces`; `backend/pnpm-lock.yaml` is untracked (shows in `git status`). Mixed npm/pnpm lockfiles are a hygiene + reproducibility hazard.

### What #39 actually changes
| Dependency | From → To | Risk | Notes |
|---|---|---|---|
| `axios` | 1.12.0 → 1.16.1 | 🟢 Low | The security advisory fix. Patch/minor. |
| `express` | 4.18.2 → 4.22.2 | 🟢 Low | Patch. |
| `express-rate-limit` | 8.0.1 → 8.0.2 | 🟢 Low | Patch. |
| `react-router-dom` | 6.8.0 → 6.30.3 | 🟢 Low | Minor, same major. |
| `esbuild` (transitive) | 0.21.5 → 0.25.12 | 🟢 Low | Pulled by vite; closes the dev-server advisory. |
| `vite` | 5.4.21 → **8.0.14** (root) / 6.4.2 (frontend) | 🔴 High | Multiple majors. Config/plugin breakage likely. |
| `uuid` | **9 → 14** | 🔴 High | 5 majors. ESM-only + API changes. Backend imports `uuid`. |

**The trap:** merging #39 wholesale ships the axios fix but very likely breaks the frontend (vite 8) and backend build (uuid 14). The sprint must *split* safe from risky.

---

## Tasks

### Task 1 — Verify the board is actually unblocked
- `gh pr list --author 'app/dependabot' --state open` → confirm #39 is the only one.
- If any pre-#39 stragglers exist, close them (`gh pr close <n> --comment "superseded by #39"`).
- Comment on #37 with the verification and **close it** (the bulk-close remediation is complete).

### Task 2 — Land the safe security bumps now
Cherry-pick the low-risk updates out of #39 so the axios advisory is resolved immediately, independent of the risky majors:
- On a branch `chore/security-safe-bumps`: bump `axios`→1.16.1, `express`→4.22.2, `express-rate-limit`→8.0.2, `react-router-dom`→6.30.3 across the 3 package.json files.
- Regenerate the lockfile (single PM — see Task 4), `npm run type-check && npm run test && npm run build`.
- Open PR, confirm Socket Security passes, merge. Axios advisory closed. ✅

### Task 3 — Handle the risky majors deliberately (separate, reversible)
Do **not** fold these into the security PR. One branch per major so a break is isolated:
- **`uuid` 9 → 14:** audit `import`/`require('uuid')` usage in `backend/src` (mainly `v4()`). v14 is ESM-only — verify ts-node/jest config tolerate it or pin to last CJS-friendly major if it fights the toolchain. Run backend tests.
- **`vite` 5 → 6/8:** bump frontend first (6.4.2 is the conservative target the PR already picked for frontend). Validate `vite.config`, plugin-react compatibility, `npm run build` + `npm run dev`. Defer vite 8 (root) unless something depends on it — root has no vite app.
- Each goes in its own PR with a green build before merge. If a major can't be made to pass cheaply, **pin and file a follow-up issue** rather than block the sprint.
- Once safe bumps + viable majors are merged, **close #39** (its content is absorbed) or let Dependabot auto-close it.

### Task 4 — Resolve package-manager drift (root cause of lockfile churn)
- Decide one PM. Repo uses npm `workspaces` in root `package.json` and `npm run` scripts throughout → **standardize on npm**.
- Remove committed `pnpm-lock.yaml` (root) and untracked `backend/pnpm-lock.yaml`; add `pnpm-lock.yaml` to `.gitignore`.
- Ensure a single `package-lock.json` at root covers the workspaces; regenerate with `npm install`.
- This stops future Dependabot/lockfile thrash.

### Task 5 — Make the pipeline self-healing
- Add/confirm Dependabot `groups` config in `.github/dependabot.yml` (group patch/minor; keep majors separate) so future runs don't jam on mixed batches.
- Confirm CI runs `type-check + test + build` on Dependabot PRs so risky bumps fail loudly instead of silently merging.

---

## Definition of done
- [x] #37 closed; no stale Dependabot PRs open.
- [x] axios advisory resolved (PR #40). _No CI exists to make "green" — see execution notes._
- [ ] uuid/vite/@typescript-eslint majors pinned with tracked follow-up issues.
- [x] Single package manager; one root `package-lock.json`; stray lockfiles removed.
- [x] Dependabot grouping configured. CI gating deferred (no CI yet + tsc red).

---

## Execution notes (2026-05-30)

Reality diverged from the plan's assumptions; recorded here for the next session.

- **PM direction reversed by the plan, then re-confirmed.** Git history shows a
  deliberate `chore: migrate from npm to pnpm` (commit `6875699`), so the plan's
  "standardize on npm" was reverting a real decision — but it was an *incomplete*
  migration (npm `workspaces` field kept, no `pnpm-workspace.yaml`, scripts still
  call npm). User confirmed: **go npm**. Done in PR #40.
- **Dead `langchain@0.0.125`** (zero imports) was the single biggest vuln source
  (transitive `axios@0.26.1` + `expr-eval`). Removed it → vulns **14 → 7**. This
  did more for security than the axios bump itself.
- **#39's risky majors confirmed**, plus a third: `@typescript-eslint` 6→8 (6× high
  `minimatch` ReDoS, dev-tooling). uuid/vite/@typescript-eslint all deferred.
- **No CI exists** (`.github/workflows/` absent) and **type-check is red in BOTH
  packages, pre-existing** (~7 backend `SessionService.ts`, ~9 frontend). The plan's
  "green CI" DoD was unachievable as written. Per user decision, type-check debt is
  being fixed this sprint (branch `fix/type-check-both-packages`) before any CI gate.
- Also found: frontend declares `"test": "vitest"` but `vitest` isn't installed.

---

## Roadmap — sprints after this one

Per decision 2026-05-29, sequence is **Security → Bilateral Stimulation → Agent System**.

### Sprint 2 — Bilateral Stimulation Engine (#20) · P1
- Self-contained frontend; no backend dependency. `frontend/src/components/BilateralStimulation/` is currently empty.
- Visual (smooth horizontal sweep), auditory (alternating L/R panned tones), and tactile (where supported) BLS with configurable speed/sets, integrated into `SessionPage` alongside the existing SUD/VOC + safety UI.
- Emergency-stop must halt stimulation instantly (reuse `safetyStore` / SessionControls hook).
- Reconcile prematurely-closed #7 into #20 on completion.
- *Will get its own `-design.md` + `-sprint.md` plan before implementation.*

### Sprint 3 — Multi-Agent System + Communication Interface (#9 backend + #18 frontend) · P1/P2
- Backend (#9): implement the agents that today are only documented — Safety Monitor, Session Orchestrator, Progress Analyst, Crisis Intervention — extending `BaseAgent`, emitting via the existing `AgentMessage` + Socket.io broadcast path. Currently only `EMDRTherapistAgent.ts` exists; `agents/core/` and `agents/specialized/` are empty.
- Frontend (#18): real-time agent message interface in `frontend/src/components/AgentInterface/` (empty today), consuming the existing `useWebSocket` hook.
- **Dependency:** #18 is weakly blocked by #9 — build/land enough backend agents to produce meaningful message traffic before/with the UI. Sequence backend-first within the sprint.

### Backlog (unchanged, P2/P3)
#10 Advanced Analytics · #16 Dev Workflow · #11–15 future enhancements.
