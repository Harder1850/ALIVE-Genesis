# Copilot / AI Contributor Instructions for ALIVE-Genesis

Purpose: give task-focused, actionable guidance so AI coding agents can be immediately productive in this repo.

## Big picture (what runs where)
- The **Genesis Kernel** (core simulation) lives in `seed-quine/genesis-kernel.js`. It performs self-analysis, spawns "agents", generates agent code under `swarm-agents/`, and runs the evolution cycle.
- The **ALIVE System GUI / control server** is `alive-system/server.js` (port 3000). It exposes APIs: `GET /api/status` and `POST /api/spawn-bot` and a single-page control UI (returned as HTML from `getGUIHTML`).
- Supporting scripts at repo root (`IGNITE-GENESIS.bat`, `deploy-alive.js`, etc.) are convenience entry points: `IGNITE-GENESIS.bat` runs the kernel (and runs `npm install` if needed); `deploy-alive.js` scaffolds `alive-system` package.
- Generated/derived code goes to `swarm-agents/` (auto-created by the kernel). Treat these files as generated artifacts and avoid manual edits unless updating generator logic in `seed-quine/genesis-kernel.js`.

## How to run (developer workflows)
- Quick start (Windows): run `IGNITE-GENESIS.bat` (checks Node, installs deps, runs `node seed-quine/genesis-kernel.js`).
- Run kernel directly: `node seed-quine/genesis-kernel.js` (prints logs and may write `swarm-agents/*.js`).
- Run the GUI server: `node alive-system/server.js` then open `http://localhost:3000`.
- The top-level README mentions `npm run genesis|ignite|evolve|singularity` but these scripts are not defined in `package.json`; prefer using the `IGNITE-GENESIS.bat` or the direct node commands above unless you add scripts and update README.

## Important conventions & patterns
- Code uses CommonJS module style (module.exports / require). Keep new modules compatible with Node >= 18 (see `package.json` engines).
- Agent generation: `GenesisKernel.generateAgentCode(agentType)` produces a class where the class name is `agentType` with hyphens removed (e.g. `ChatGPT-Integrator` → `ChatGPTIntegrator`). If you change agent code format, update both generator and consumers.
- The kernel writes files into `swarm-agents/` but gracefully falls back to "simulation" (no write) if file IO fails — preserve that safe behavior when refactoring.

## Integration points & external dependencies
- Schwab OAuth flow: `schwab-auth-simple.js` requests tokens and writes `.schwab-tokens.json`. It currently contains a hard-coded `clientSecret` (sensitive) — do not leak secrets in PRs and raise an issue/PR to move secrets to `.env`.
- CI uses Datadog synthetic tests (`.github/workflows/datadog-synthetics.yml`) — repository needs Datadog environment secrets to run these workflows.
- Package dependencies: Express, ws, axios, dotenv (dotenv present but not always used in code). Prefer `process.env` and `.env` for secrets and tokens.

## Security & safety rules for AI agents (must enforce)
- NEVER commit secrets or tokens. If you find credentials in code (e.g., `clientSecret` in `schwab-auth-simple.js`), create an issue and propose a migration to environment variables; suggest adding any discovered token files (e.g., `.schwab-tokens.json`) to `.gitignore`.
- Treat `swarm-agents/` as generated output. Prefer changes in the generator (`seed-quine/genesis-kernel.js`) rather than editing generated agent files directly.
- For changes that alter runtime behavior (spawning, replication, HTTP endpoints), add short manual testing steps and logs to demonstrate expected runtime effects.

## PR guidance (what an AI agent should do)
- Small change PRs (< 10 LOC): include a short test instruction (how to run kernel or server and what to look for in logs). Example: "Run `node seed-quine/genesis-kernel.js` and confirm `ORCHESTRATING SWARM ACTIVATION` appears and files are created in `swarm-agents/`".
- Security fixes: If removing hard-coded secrets, add `.env` usage, update README with usage example, and add the token filename to `.gitignore`. Include a note to rotate any exposed credentials.
- Generator changes: update `generateAgentCode()` and include one example generated file in the PR (or a unit test that asserts generated code exports the class name expected).

## Useful files to inspect for context
- `seed-quine/genesis-kernel.js` (core algorithm and generator)
- `swarm-agents/*.js` (examples of generated agents)
- `alive-system/server.js` (control UI and API)
- `schwab-auth-simple.js` (example external OAuth integration)
- `IGNITE-GENESIS.bat`, `deploy-alive.js` (developer entry points / scaffolding)

## Example tasks an AI can do (low-friction)
- Add a small `npm` script (e.g., `ignite`) and sync README to use it (include test instructions). Keep changes minimal and add integration instructions.
- Replace hard-coded secrets with `process.env` + `.env.example`, add `.schwab-tokens.json` to `.gitignore` and create a short migration note.
- Add unit tests around `generateMutations()` or `selectRandomPurpose()` (small, deterministic checks using seedable PRNG for reproducibility).

---

If any of these areas are unclear or you'd like examples for PR checks, tell me which section to expand and I will iterate. ✅
