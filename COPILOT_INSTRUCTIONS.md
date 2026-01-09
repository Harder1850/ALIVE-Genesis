> ⚠️ NOTE
> This file is a mirror for tooling compatibility.
> The authoritative version lives at:
>
> `.github/copilot-instructions.md`

# Copilot / AI Contributor Instructions for ALIVE-Genesis

Purpose: give task-focused, actionable guidance so AI coding agents can be immediately productive in this repo.

## Big picture (dual-system architecture)

This repo contains **two parallel systems** that coexist:

### System 1: ALIVE Organism (primary, frozen core)
- **Core Loop**: Stream → Assess → Triage → Budget → Execute → Remember → Reset
- **Kernel**: `core/kernel.js` orchestrates the main organism loop
- **Memory Tiers**: Stream (consciousness buffer), Working (session), Long-term (stable knowledge) in `memory/`
- **Components**: Assessor, Triager, BudgetGovernor, ResetController in `core/`
- **CLI Entry**: `bin/alive-cli.js start` launches cooking CLI via `ui/cli.js`
- **Status**: Core frozen as of 2026-01-08 (see `docs/ALIVE-Contracts.md`); contracts define immutable interfaces
- **Domain**: Cooking/recipe tasks (recipe search, substitution engine, meal planning)

### System 2: Genesis Kernel (side project)
- **Location**: `seed-quine/genesis-kernel.js`
- **Purpose**: Self-aware AI that replicates, spawns agents, and evolves autonomously
- **Output**: Generates agent code in `swarm-agents/*.js` (classes like `ChatGPTIntegrator`)
- **Lifecycle**: Self-analysis → identify opportunities → replicate → orchestrate swarm
- **Execution**: Run via `IGNITE-GENESIS.bat` (Windows) or `node seed-quine/genesis-kernel.js` directly
- **Note**: This is experimental/demonstration code; primary work is on ALIVE core

### Ecosystem Services
- **ALIVE GUI Server**: `alive-system/server.js` (Express, port 3000) — separate from core, exposes `/api/status`, `/api/spawn-bot`
- **Hardware Integration**: `hardware/` module provides vehicle/device interfaces via bridges and domain agents
- **Meta Loop Observer**: `meta/MetaLoop.js` — policy learning system, records task patterns for playbooks

## ⚠️ CRITICAL: Frozen CLI Contract (DO NOT BREAK)

**Entrypoint**: `bin/alive.js` — defines immutable CLI contract (frozen as of 2026-01-09)

**Contract commands** (see [CONTRACT.md](CONTRACT.md)):
```bash
alive run "<taskText>"    # Execute task via kernel; pure JSON stdout
alive status              # Show organism status; pure JSON stdout
alive stop                # Stop organism (idempotent); pure JSON stdout
```

**Exit codes**: 0 (success), 1 (task fail), 2 (boot fail)  
**Output**: Pure JSON only to stdout; all debug/logging → stderr  
**Test contract compliance**: `npm run test:contract` (must pass 6/6)

**⛔ DO NOT**:
- Change JSON schema keys in CONTRACT.md without major version bump
- Mix debug logs into stdout (contamination breaks parsers)
- Change exit code meanings
- Add new stdout format beyond exact contract

## How to run (developer workflows)
- **Contract CLI (authoritative)**: `node bin/alive.js run "task"` or `node bin/alive.js status`
- **Test contract compliance**: `npm run test:contract` (validates output schemas, exit codes, idempotency)
- **Syntax check core**: `node --check core/kernel.js` (verify no parse errors)
- **MetaLoop data**: `data/runlog.jsonl` (JSONL task history), `data/meta_state.json` (learned patterns)
- **Debug output**: Write to stderr with `process.stderr.write()` never to stdout

## Important conventions & patterns

### Module System
- **Module style**: CommonJS (module.exports / require); Node >= 18.0.0
- **Memory layer pattern**: Each memory tier exports `{ push(), search(), promote(), decay(), summary() }` methods
- **Assessor pattern**: Component returns `{ urgency, stakes, difficulty, precision }` enum-like values

### ALIVE Organism Patterns
- **Component lifecycle**: Each component (Assessor, Triager, etc.) is instantiated once in `ALIVEKernel` constructor
- **Synchronous policy decisions**: Budget and reset checks happen **before** execute (see `core/kernel.js` process flow)
- **MetaLoop integration**: Optional; kernel calls `MetaLoop.recordAndReview()` after execute but catches errors gracefully
- **Error safety**: Core loop never throws; catches errors and logs to stderr, continues processing
- **Stdout purity**: Only JSON goes to stdout; use `process.stderr.write()` for all debugging/logging
- **Contract wrapper**: `utils/checkpoint-writer.js` validates content before stdout to prevent crashes from empty responses

### MetaLoop Conventions
- **Runlog**: `data/runlog.jsonl` — one JSON object per line (one per completed task)
- **Meta state**: `data/meta_state.json` — learned patterns, policy biases, playbook metadata
- **Playbook drafts**: `playbooks/drafts/` — auto-created when task pattern repeats 3+ times
- **Never mutates core code**: MetaLoop only writes logs/drafts, never changes `core/*.js`
- **Allowed MetaLoop changes**: Pattern matching, playbook promotion rules, lookup bias thresholds (all must keep `npm run test:contract` passing)

### Genesis Kernel Patterns (seed-quine)
- **Agent code generation**: `GenesisKernel.generateAgentCode(agentType)` produces classes with hyphens stripped from names (e.g., `ChatGPT-Integrator` → `ChatGPTIntegrator`)
- **Graceful degradation**: If `fs.writeFileSync()` fails, kernel logs warning but continues in simulation mode (no swarm-agents files created)
- **Async orchestration**: `selfAnalyze()`, `replicate()`, `orchestrateSwarm()` are async; use `await` in calling code

### Test & Data Patterns
- **Runlog format**: `data/runlog.jsonl` — one JSON object per line, each represents a completed task
- **Test harnesses**: `tests/replay-harness.js` replays runlog entries; deterministic replay verifies MetaLoop pattern matching
- **No test runner**: Tests are standalone scripts; run via `npm test` which executes a custom runner (see package.json)

## Integration points & external dependencies

### Internal Data Flows
- **ALIVE → MetaLoop**: `core/kernel.js` calls `MetaLoop.recordAndReview(assessment, triage, result)` after execute; MetaLoop records patterns, returns nothing (observer-only)
- **ALIVE → Hardware**: `bin/alive-cli.js hardware` delegates to `hardware/cli.js`; hardware domain agents sit in `domain/hardware/`
- **Genesis → Swarm Agents**: Genesis kernel generates files and imports them; swarm agents execute tasks but don't feed back to kernel currently

### External Integrations (archive)
- **Schwab OAuth**: `archive/trading/schwab-auth-fixed.js` uses `process.env.SCHWAB_CLIENT_ID` / `process.env.SCHWAB_CLIENT_SECRET` (prefer this pattern over hard-coded secrets)
- **Hardware API Bridges**: `hardware/bridges/api.js` supports Bearer token auth (loaded from `this.auth.token`)
- **CI/CD**: `.github/workflows/datadog-synthetics.yml` runs synthetic tests; requires Datadog environment secrets (not in repo)

### Dependency Map
- **Core**: Requires only `fs`, `path`, Node stdlib (no npm deps for ALIVE organism logic)
- **GUI/API**: Express, CORS, WebSockets (ws) in `alive-system/package.json`
- **Hardware**: Axios, dotenv for external API calls
- **All**: dotenv for `.env` support (present but not enforced everywhere)

## Security & safety rules for AI agents (must enforce)
- **NEVER commit secrets or tokens**. If you find credentials in code (e.g., `clientSecret` in `archive/trading/schwab-auth-*.js`), create an issue and propose migration to environment variables; suggest adding token files (e.g., `.schwab-tokens.json`) to `.gitignore`
- **Treat `swarm-agents/` as generated output**. Prefer changes in the generator (`seed-quine/genesis-kernel.js`) rather than editing generated agent files directly
- **ALIVE Core Contracts**: Changes to `core/kernel.js`, memory tier interfaces, or assessment/triage logic require explicit contract review (see `docs/ALIVE-Contracts.md`); document impact before PR
- **For changes altering runtime behavior** (spawning, replication, HTTP endpoints, memory promotion rules): add short manual testing steps and logs to demonstrate expected runtime effects

## PR guidance (what an AI agent should do)
- **Small change PRs** (< 10 LOC): include short test instruction (how to verify). Example: "Run `node seed-quine/genesis-kernel.js` and confirm `ORCHESTRATING SWARM ACTIVATION` appears and files are created in `swarm-agents/`"
- **ALIVE Core changes**: Document which contracts are affected (see `docs/ALIVE-Contracts.md`). Include test command like "Run `npm run test:contract` to verify interface compliance"
- **Security fixes**: If removing hard-coded secrets, add `.env` usage, update README with usage example, add token filename to `.gitignore`, include note to rotate exposed credentials
- **Generator changes** (`seed-quine/`): update `generateAgentCode()` and include one example generated file in PR or assert generated code exports correct class name
- **Hardware/Domain changes**: verify no hardcoded tokens; use `process.env` or `this.auth` pattern from `hardware/bridges/api.js`

## Useful files to inspect for context
- [bin/alive.js](bin/alive.js) — contract CLI entrypoint (authoritative, frozen)
- [CONTRACT.md](CONTRACT.md) — immutable CLI contract (exact JSON schemas, exit codes)
- [core/kernel.js](core/kernel.js) — full organism loop (Stream → Assess → Triage → Budget → Execute → Remember → Reset)
- [bin/contract_test.js](bin/contract_test.js) — 6 conformance tests (must all pass)
- [utils/checkpoint-writer.js](utils/checkpoint-writer.js) — stdout validation & empty-content prevention
- [meta/MetaLoop.js](meta/MetaLoop.js) — policy learning system, records and replays task patterns
- [seed-quine/genesis-kernel.js](seed-quine/genesis-kernel.js) — self-aware replication kernel (experimental, not frozen)
- [memory/](memory/) — three-tier memory implementation (stream, working, longterm)
- [docs/ALIVE-Contracts.md](docs/ALIVE-Contracts.md) — detailed core contracts (what cannot change without justification)
- [FREEZE.md](FREEZE.md) — what is frozen and the change process

## Example tasks an AI can do (low-friction)
- Add small `npm` script (e.g., rename mentioned scripts to work, sync README). Keep changes minimal, add integration test instruction.
- Replace hard-coded secrets with `process.env` + `.env.example`, add token filename to `.gitignore`, create migration note.
- Add unit tests around `generateMutations()` or `selectRandomPurpose()` (small, deterministic checks using seedable PRNG).
- Fix or enhance MetaLoop pattern matching (see `meta/MetaLoop.js` `patternHash()` and `matchPatterns()` methods) — low risk to core, add test to `tests/`
- Add API route to ALIVE GUI server (`alive-system/server.js`) exposing memory tier status or assessment results

---

If any of these areas are unclear or you'd like examples for PR checks, tell me which section to expand and I will iterate. ✅
