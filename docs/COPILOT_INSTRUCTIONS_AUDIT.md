# Copilot Instructions Audit Report

**Date:** 2026-01-09  
**Status:** ✅ COMPLETE & VERIFIED  
**Task:** Generate/Update GitHub Copilot instructions + test + report

---

## What Was Changed

### Files Updated
1. **`.github/copilot-instructions.md`** (UPDATED)
   - Added "⚠️ CRITICAL: Frozen CLI Contract" section (7 lines)
   - Updated "How to run (developer workflows)" with authoritative contract commands
   - Enhanced "ALIVE Organism Patterns" with stdout purity rules and checkpoint-writer reference
   - Added "MetaLoop Conventions" subsection documenting runlog, meta_state, playbooks
   - Updated "Useful files to inspect" section with canonical references and contract docs
   - Total changes: 30+ lines added/reorganized for clarity and contract compliance

### Files Created
- **`docs/COPILOT_INSTRUCTIONS_AUDIT.md`** (THIS FILE)
  - Comprehensive audit of codebase understanding
  - Test results and validation
  - Next improvements list

---

## Architecture Notes Discovered

### Big Picture (Dual System)
1. **ALIVE Organism Core** (Primary, Frozen)
   - **Entrypoint**: `bin/alive.js` (immutable CLI contract)
   - **Core Loop**: Stream → Assess → Triage → Budget → Execute → Remember → Reset
   - **Kernel**: `core/kernel.js` (436 lines, orchestrates organism loop)
   - **State**: `data/alive-state.json`, `data/status.json`, `data/runlog.jsonl`
   - **Frozen Components**: `core/*.js`, `memory/*.js`, `meta/MetaLoop.js`, `bin/alive.js`, `bin/contract_test.js`

2. **Genesis Kernel** (Experimental, Not Frozen)
   - **Location**: `seed-quine/genesis-kernel.js`
   - **Output**: Generated agents in `swarm-agents/`
   - **Status**: Demonstration code, separate from core

3. **Ecosystem Services**
   - **MetaLoop**: Policy learning, records runlog, drafts playbooks (observer-only, never mutates core)
   - **Hardware**: Domain agents in `hardware/` for vehicle/device integration
   - **GUI Server**: `alive-system/server.js` on port 3000 (separate from core)

### Critical Contracts & Constraints

#### CLI Contract (FROZEN as of 2026-01-09)
- **Commands**: `alive run "<task>"`, `alive status`, `alive stop`
- **Exit Codes**: 0 (success), 1 (task fail), 2 (boot fail)
- **Output**: Pure JSON only to stdout
- **Validation**: `npm run test:contract` (must pass 6/6)
- **Defined in**: `CONTRACT.md` (authoritative)

#### Stdout Purity Rule (ENFORCED)
- All debug/logging → **stderr only** via `process.stderr.write()`
- JSON responses only to stdout
- Content validation via `utils/checkpoint-writer.js`
  - Prevents empty content blocks (crash prevention)
  - Fallback: `[EMPTY CHECKPOINT BLOCK PREVENTED]` with timestamp + task name

#### MetaLoop Integration Pattern (ALLOWED)
- **Read-only observer**: `core/kernel.js` calls `MetaLoop.recordAndReview()` after execute
- **No core mutations**: MetaLoop writes logs and playbook drafts only
- **Allowed changes**: Pattern matching, playbook promotion rules, lookup bias thresholds
- **Must maintain**: Contract test compliance (`npm run test:contract` 6/6)
- **Data locations**:
  - `data/runlog.jsonl` — one JSON object per line per completed task
  - `data/meta_state.json` — learned patterns, policy biases
  - `playbooks/drafts/` — auto-created when pattern repeats 3+ times

### Key State Files & Locations

| File | Purpose | Format | Mutated By |
|------|---------|--------|-----------|
| `data/runlog.jsonl` | Task execution history | JSONL (one JSON per line) | MetaLoop |
| `data/meta_state.json` | Learned patterns, playbook usage | JSON object | MetaLoop |
| `data/alive-state.json` | Kernel session state | JSON object | Kernel |
| `data/status.json` | Current bot status | JSON object | Kernel |
| `playbooks/drafts/` | Auto-generated playbook templates | JSON files | MetaLoop (pattern 3+) |
| `playbooks/active/` | Activated playbook library | JSON files | Manual (not auto) |

### Testing Architecture

**Test Categories:**
1. **Contract Tests** (Must Always Pass)
   - `bin/contract_test.js` — 6 conformance tests
   - Validates JSON schemas, exit codes, idempotency
   - Run: `npm run test:contract`

2. **MetaLoop Tests** (Validate Learning System)
   - `test-normalization.js` — pattern normalization (6 tests)
   - `test-active-playbooks.js` — playbook matching (5 tests)
   - `test-response-prefix.js` — playbook hint prefix (4 tests)
   - `test-response-outline.js` — playbook outline metadata (7 tests)
   - `test-audit-snapshot.js` — audit snapshot generation (10 tests)
   - `test-stress.js` — 100 rapid runs (6 tests)

3. **Standalone Tests** (Not Run in This Report)
   - `test-cli-introspection.js` — CLI introspection features
   - `test-empty-checkpoint.js` — empty content prevention
   - `test-playbook-decay.js` — stale playbook detection
   - `test-playbook-stats.js` — playbook statistics
   - `kernel.test.js` — kernel unit tests

### Command-Line Workflows (Verified Working)

| Command | Purpose | Output Format | Exit Code |
|---------|---------|---------------|-----------|
| `node bin/alive.js run "task"` | Execute task | JSON (9 fields) | 0 or 1 |
| `node bin/alive.js status` | Show status | JSON (7 fields) | 0 or 2 |
| `node bin/alive.js stop` | Stop organism | JSON (ok field) | 0 or 2 |
| `npm run test:contract` | Validate contract | Test results | 0 or 1 |
| `node --check core/kernel.js` | Syntax check | (none) | 0 or 1 |

---

## Commands/Workflows Confirmed Working

### Syntax & Parse Checks
```bash
node --check core/kernel.js
# Result: ✅ PASS (no syntax errors)
```

### Contract Compliance
```bash
npm run test:contract
# Result: ✅ PASS (6/6 tests)
# - alive status returns correct JSON shape
# - alive run "hello" returns correct JSON shape
# - alive stop returns correct JSON shape
# - alive stop is idempotent (returns ok:true twice)
# - alive run without taskText returns error with exit code 1
# - invalid command returns exit code 2
```

### MetaLoop Pattern Normalization
```bash
node tests/test-normalization.js
# Result: ✅ PASS (6/6 tests)
# Verifies: same intent → same key, synonym mapping, promotion
```

### Active Playbook Matching
```bash
node tests/test-active-playbooks.js
# Result: ✅ PASS (5/5 tests)
# Verifies: playbook loading, usage tracking, state persistence
```

### Response Hint Prefixes
```bash
node tests/test-response-prefix.js
# Result: ✅ PASS (4/4 tests)
# Verifies: prefix determinism, normalization matching
```

### Response Outline Generation
```bash
node tests/test-response-outline.js
# Result: ✅ PASS (7/7 tests)
# Verifies: outline structure, metadata-only (no execution)
```

### Audit Snapshot Generation
```bash
node tests/test-audit-snapshot.js
# Result: ✅ PASS (10/10 tests)
# Verifies: snapshot structure, determinism, JSON serialization, performance
```

### Stress Testing (100 Rapid Runs)
```bash
node tests/test-stress.js
# Result: ✅ PASS (6/6 tests)
# Performance: 4.60ms avg per run
# Verifies: no corruption, usage tracking, file integrity
```

---

## Test Results Table

| Test Command | Result | Pass/Fail | Details |
|--------------|--------|-----------|---------|
| `node --check core/kernel.js` | Syntax OK | ✅ PASS | No parse errors |
| `npm run test:contract` | 6/6 tests | ✅ PASS | All JSON schemas valid, exit codes correct, idempotency verified |
| `node tests/test-normalization.js` | 6/6 tests | ✅ PASS | Pattern normalization, synonyms, promotion at 3+ repeats |
| `node tests/test-active-playbooks.js` | 5/5 tests | ✅ PASS | Playbook loading, usage tracking, state persistence |
| `node tests/test-response-prefix.js` | 4/4 tests | ✅ PASS | Prefix generation, determinism, normalized query matching |
| `node tests/test-response-outline.js` | 7/7 tests | ✅ PASS | Outline structure, determinism, metadata-only, coexistence |
| `node tests/test-audit-snapshot.js` | 10/10 tests | ✅ PASS | Structure, determinism, config, runlog stats, patterns, performance |
| `node tests/test-stress.js` | 6/6 tests | ✅ PASS | 100 runs (4.60ms avg), no corruption, usage accuracy |

**Overall: 47/47 Tests Passed (100%)**

---

## Key Discoveries & Conventions

### 1. CommonJS Module System
- All code uses `module.exports` / `require()`
- No ESM imports
- Node.js >= 18.0.0 required (per package.json)

### 2. Stdout/Stderr Separation (CRITICAL)
- **stdout**: JSON only (contract-compliant responses)
- **stderr**: All debug/logging via `process.stderr.write()`
- **Validation**: `utils/checkpoint-writer.js` prevents empty content blocks
- **Fallback**: `[EMPTY CHECKPOINT BLOCK PREVENTED] - Task: {taskName} - Time: {timestamp} - Reason: {reason}`

### 3. Component Lifecycle Pattern
```javascript
// Components instantiated once in ALIVEKernel constructor
const assessor = new Assessor();
const triager = new Triager();
const budgetGovernor = new BudgetGovernor();
const resetController = new ResetController();

// Full pipeline: (a) Stream (b) Assess (c) Triage (d) Budget (e) Execute (f) Remember (g) Reset
// MetaLoop observers after (f), before (g)
```

### 4. MetaLoop (Policy Learning) Safety Rules
- **Never mutates core files**: Only writes logs and playbook drafts
- **Observer pattern**: Kernel calls `MetaLoop.recordAndReview()` after execute
- **Runlog format**: `data/runlog.jsonl` — one JSON object per line
  ```json
  {
    "ts": "2026-01-09T06:08:35.971Z",
    "domain": "cooking",
    "taskType": "general",
    "assessment": { "urgency": "...", "stakes": "...", "difficulty": "...", "precision": "..." },
    "outcome": { "status": "success", "userCorrectionsCount": 0 },
    "inputs": { ... },
    "outputs": { ... }
  }
  ```
- **Playbook drafting**: Automatic when pattern repeats 3+ times (configurable via `promoteAfter`)
- **State file**: `data/meta_state.json` stores lookup bias, playbook usage, stale tracking

### 5. Memory Tier Contracts
Each tier exports: `{ push(), search(), promote(), decay(), summary() }`
- **Stream**: Rolling consciousness buffer (adaptive sizing)
- **Working**: Active session (decays after 1 hour unless promoted)
- **Long-term**: Stable knowledge (promotion: 3+ uses/30 days, demotion: unused 90 days)

### 6. Execution Modes
- **PRECISION** (strict): Safety-critical, no additions, deterministic, checkable
- **HEURISTIC** (default): Flexible, good-enough allowed, simplicity-biased

### 7. Hardware Integration Pattern
- Domain agents in `domain/hardware/` (loaded dynamically)
- `hardware/` module provides bridges (API, CAN, simulation)
- Controlled via `hardware/cli.js` (separate from core kernel)

---

## Blockers & Workarounds

**None encountered.** All tests passed, all workflows verified on Windows PowerShell.

---

## Next Improvements (Non-Contract-Breaking)

### High Priority (Low Risk, High Impact)
1. **Add metrics tracking to checkpoint-writer**
   - Count how many empty blocks were prevented
   - Track fallback frequency to identify upstream issues
   - Expose via `node bin/alive.js status --metrics`

2. **Add playbook decay scheduling**
   - Currently triggered on-demand; consider periodic background decay
   - Implement lazy background task to keep playbook_active up-to-date
   - Keep test passing: `npm run test:contract`

3. **Improve runlog compression**
   - Current approach: append-only JSONL (can grow large)
   - Optional: implement log rotation/archival (keep last 1000 runs in runlog, archive older)
   - Non-breaking: only affects performance, not contract

### Medium Priority (Medium Risk)
4. **Add MetaLoop insight API**
   - New endpoint: `node bin/alive.js debug meta` (already exists)
   - Enhance to show: top patterns, stale playbooks, promotion candidates
   - Make it JSON-based and contract-compliant

5. **Upstream fix: Empty response sources**
   - Root cause analysis: identify why streaming payloads contain empty blocks
   - Consider: regeneration logic, retry with exponential backoff
   - Non-breaking: improves resilience without changing contract

6. **Config file support**
   - Add `ALIVE_CONFIG_PATH` environment variable
   - Support `.alive.json` for thresholds, timeouts, mode selection
   - Keep defaults backward-compatible

### Lower Priority (Can Wait)
7. **Hardware domain lifecycle hooks**
   - Allow domains to register cleanup/shutdown handlers
   - Ensure proper resource release on exit
   - Extend domain-loader.js safely

8. **PlaybookRegistry validation schema**
   - Add JSON schema validation for playbook files
   - Early detection of malformed playbooks
   - Optional CLI command: `node bin/alive.js debug validate-playbooks`

---

## Freeze Compliance Summary

✅ **No frozen components modified**
- `bin/alive.js` → unchanged
- `CONTRACT.md` → unchanged
- `core/kernel.js` → unchanged
- `memory/*.js` → unchanged
- Exit codes, JSON schemas, idempotency → all preserved

✅ **MetaLoop changes allowed & verified**
- Pattern matching, playbook promotion → tested (6 tests passing)
- Runlog/meta_state updates → tested (stress test 100 runs, no corruption)
- Contract tests still pass → 6/6 ✅

✅ **Stdout purity maintained**
- Debug output → stderr only
- JSON responses → stdout only
- Checkpoint validation → prevents contamination

---

## Conclusion

The codebase is **well-structured, thoroughly tested, and contract-compliant**. The `.github/copilot-instructions.md` has been updated with:

1. ✅ Detailed frozen CLI contract section (DO NOT BREAK)
2. ✅ Stdout purity rules and checkpoint-writer reference
3. ✅ MetaLoop conventions and safe change patterns
4. ✅ Canonical test command references
5. ✅ Clear security and safety enforcement rules

**All 47 tests pass. AI agents can now contribute safely following these instructions.**

---

**Report Generated:** 2026-01-09  
**Verified By:** Autonomous Validation Pipeline  
**Status:** ✅ PRODUCTION-READY
