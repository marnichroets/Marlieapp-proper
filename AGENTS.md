# Marlie / PooksBooks Agent Instructions

## Canonical Repository

This repository is the canonical Marlie/PooksBooks production repository:

`/mnt/c/Users/user/Desktop/Marlie App Project`

Do not copy or merge work from the separate newer `Marlie App` repository
unless the user explicitly changes this instruction.

Preserve all existing uncommitted work. Never reset, clean, discard, overwrite,
or broadly stage unrelated changes. Inspect `git status` before editing and
stage only explicit paths or hunks.

## Architecture

- `src/`, `public/`, and the repository root contain the React + Vite frontend.
- `backend/` is the main FastAPI API, state-sync service, games database, photo
  and plant identification backend, and notification service.
- `sound-service/` is a separate FastAPI/BirdNET service.
- `scripts/` contains unit-style checks, lifecycle tests, and potentially
  hazardous browser/sync harnesses.
- `backups/` and root state dumps are local production-state safety artifacts
  and must not be deleted or committed casually.

The frontend uses a localStorage cache but synchronizes persisted account state
with the production Railway backend. Treat account state as production data.

## Build and Test Commands

Frontend:

- Install: `npm ci`
- Develop: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Core tests: `npm test`
- Preview production build: `npm run preview`

Additional targeted tests:

- `node scripts/greenhouse-lifecycle-test.mjs`
- Run individual `scripts/test-*.mjs` files when relevant.

Backend:

- From `backend/`: `pip install -r requirements.txt`
- From `backend/`: `python main.py`
- Health check: `curl http://localhost:8080/api/health`

Sound service tests must be run from an isolated local environment and must not
be deployed into the main backend container.

Browser smoke scripts and cross-device sync scripts are not routine tests.
Review them before execution because some target real accounts or production
services.

## Production Safety

The repository is connected to production deployment and real user data.

- Do not push, deploy, change cloud variables, relink services, or write to a
  production API unless explicitly requested.
- A push to `main` can automatically deploy both frontend and backend changes.
- Never test with Pooks, Marnich, or any other real production account unless
  the user explicitly approves that exact test.
- Never inject test data into localStorage while logged into a real account.
- Before browser testing persisted features, block outgoing `POST /api/state`
  before navigation, or use a no-login isolated preview harness.
- Prefer synthetic local state and throwaway preview entry points.
- Treat reads from production as sensitive and minimize returned personal data.

## Production Writes and Backups

Before every direct production-state write:

1. Read the current remote state.
2. Save a timestamped, complete pre-write backup under the existing gitignored
   `backups/` convention.
3. Validate the backup can be parsed and identifies the intended account.
4. Show the proposed scoped mutation and obtain approval.
5. Write only the approved fields.
6. Re-read and verify the result.
7. Retain the backup for recovery.

Never delete or replace a whole account when a scoped field update is possible.
State imports are forced recovery operations and require explicit approval.

## Deployment Boundaries

- Vercel owns the React frontend deployed from the repository root.
- Railway service `Marlieapp-proper` owns `backend/`.
- Railway service `sound-id` owns `sound-service/`.
- Do not deploy BirdNET into the main backend container.
- Do not point local tests at a production database volume path.
- Do not expose server-side API keys through Vite or Vercel public variables.
- Verify service identity and target environment before any Railway action.

## Browser QA Workflow

This is the permanent workflow for visual/UI work on the frontend.

- Use Claude Code with a connected Chrome browser as the default visual
  verification method.
- Inspect the live or locally rendered UI before making a visual fix --
  do not guess a root cause from reading source alone when the browser
  is available.
- Follow this loop for every visual change: reproduce -> diagnose ->
  edit -> reload -> verify.
- Prefer a local dev server with synthetic/mock state (a throwaway
  preview harness) over a real logged-in account for inspection and
  verification.
- Never mutate production user state during QA without explicit
  approval -- no purchase, claim, send, delete, or plant actions
  against a real account while inspecting or verifying a fix.
- Any temporary QA harness (preview entry points, throwaway pages,
  temporary `export`s added to reach an unexported component) must be
  fully removed before committing -- confirm with `git status`/`git
  diff` that no harness files or stray exports remain staged or
  unstaged.
- Visually verified work is the definition of done for frontend
  changes: a fix isn't complete until it's been seen rendering
  correctly, not just reasoned about.

## Garden Design Skill

For visual frontend design, redesign, critique, or explicit browser acceptance,
use:

`.agents/skills/web-design-engineer/SKILL.md`

Preserve `skills-lock.json` and the skill's manifest/provenance metadata.
Follow the skill's preservation-aware workflow and established Marlie visual
language. Browser acceptance is opt-in and does not override the production
account restrictions above.

## Durable Knowledge

The Obsidian vault is:

`/home/user/ObsidianVault`

The canonical notes subtree is:

`/home/user/ObsidianVault/wiki`

Save durable knowledge when work establishes or changes:

- architecture or deployment topology;
- production safety procedures;
- data and sync contracts;
- consequential design or product decisions;
- root causes and non-obvious bug fixes;
- reusable testing hazards or verification techniques;
- operational recovery procedures.

Do not save routine command output, transient status, raw chat transcripts,
secrets, account passwords, or unsupported assumptions.

Use the existing claude-obsidian capture, provenance, ledger, and transaction
workflow. Do not write wiki files directly when an ingestion/save transaction
is appropriate.

Read-only vault queries are allowed. Any vault mutation requires explicit user
approval of the planned transaction, its target paths, and its approved plan
hash. Network research, destructive repair, bulk migration, or Git checkpoint
of the vault also requires explicit approval.
