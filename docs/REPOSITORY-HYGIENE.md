# Repository Hygiene - Code Organization Analysis

**Status:** Documentation Only (No Changes Executed)  
**Date:** 2026-01-08  
**Purpose:** Identify dead/demo code and propose organization improvements

---

## Overview

This document identifies code that may be:
- **Dead Code:** Never used in production
- **Demo Code:** Examples/experiments not part of core system
- **Misplaced Code:** Should be in different directory

**IMPORTANT:** This is analysis only. No files have been moved or deleted.

---

## Files Analyzed

### Root Directory Files

#### 1. **schwab-*.js** (Multiple Files)
**Status:** Demo/Experimental  
**Files:**
- `schwab-auth-simple.js`
- `schwab-auth-fixed.js`
- `schwab-complete.js`
- `.schwab-auth-simple.js.swp` (vim swap file)

**Analysis:**
- Related to Schwab API integration (financial)
- Not related to core ALIVE system
- Likely early experiments or separate project

**Recommendation:**
```
Move to: experiments/schwab/ or archive/schwab/
Rationale: Keep root clean, archive experiments separately
```

#### 2. **deploy-*.js**
**Files:**
- `deploy-alive.js`
- `deploy-alive-genesis-v2.js`

**Analysis:**
- Deployment scripts
- Used for initial setup or deployment

**Recommendation:**
```
Move to: scripts/deploy/ or keep in root if actively used
Rationale: Deployment scripts often live in root, but /scripts is cleaner
```

#### 3. **debug-schwab.js**
**Status:** Debug/Experimental

**Recommendation:**
```
Move to: experiments/schwab/debug-schwab.js
Rationale: Debug script for experimental feature
```

#### 4. **simple-auth.js**
**Status:** Unclear - possibly demo

**Recommendation:**
```
Review usage, then either:
  - Move to examples/ if demo
  - Keep if actively used
  - Delete if dead
```

#### 5. **test.js**
**Status:** Likely temporary test file

**Recommendation:**
```
Review contents, then either:
  - Move to tests/manual/ if useful
  - Delete if obsolete
```

#### 6. **GENESIS-SINGULARITY-DEPLOY.bat**, **IGNITE-GENESIS.bat**
**Status:** Windows batch deployment scripts

**Recommendation:**
```
Move to: scripts/windows/
Rationale: Platform-specific scripts should be in /scripts subdirectory
```

---

## Seed/Swarm Directories

### seed-quine/
**Status:** Experimental/Philosophical  
**Contents:** `genesis-kernel.js`

**Analysis:**
- Appears to be self-modifying/quine experiment
- Not integrated with main system

**Recommendation:**
```
Move to: experiments/quine/ or docs/philosophy/
Rationale: Interesting concept but not production code
```

### swarm-agents/
**Status:** Integration demos  
**Files:**
- `chatgpt_integrator.js`
- `claude_architect.js`
- `grok_enhancer.js`

**Analysis:**
- Multi-AI integration examples
- Not actively used in core system

**Recommendation:**
```
Move to: examples/integrations/ or experiments/multi-ai/
Rationale: Examples for future reference, not production
```

---

## alive-system/

**Status:** Active (Keep)  
**Files:**
- `server.js`
- `package.json`
- `package-lock.json`

**Analysis:**
- Separate Node.js project/server
- Appears to be HTTP API wrapper

**Recommendation:**
```
Keep as-is OR move to: services/alive-system/
Rationale: If it's a separate service, nest it under /services
```

---

## Proposed Directory Structure

```
ALIVE-Genesis/
├── bin/                    # CLI entry points (KEEP)
├── core/                   # Core system (KEEP)
├── memory/                 # Memory systems (KEEP)
├── meta/                   # MetaLoop (KEEP)
├── ui/                     # User interfaces (KEEP)
├── tests/                  # Test suites (KEEP)
├── playbooks/             # Playbook system (KEEP)
├── docs/                   # Documentation (KEEP)
├── data/                   # Runtime data (KEEP)
├── hardware/              # Hardware integration (KEEP)
├── domain/                # Domain modules (KEEP)
│
├── scripts/               # ADD: Deployment & utility scripts
│   ├── deploy/           # deploy-*.js
│   └── windows/          # *.bat files
│
├── examples/              # ADD: Example code
│   └── integrations/     # swarm-agents/
│
└── experiments/           # ADD: Experimental code
    ├── schwab/           # schwab-*.js
    └── quine/            # seed-quine/
```

---

## Dead Code Candidates

### High Confidence (Likely Dead):
1. `.schwab-auth-simple.js.swp` - Vim swap file (DELETE)
2. `test.js` - Temporary test file (REVIEW → DELETE)
3. `simple-auth.js` - If not referenced (REVIEW)

### Medium Confidence (Demo/Experimental):
1. All `schwab-*.js` files - Financial API experiments
2. `seed-quine/` - Philosophical experiment
3. `swarm-agents/` - Multi-AI demos
4. `debug-schwab.js` - Debug script for schwab

### Low Confidence (Check Usage):
1. `deploy-*.js` - May be actively used
2. `*.bat` files - May be actively used on Windows

---

## How to Verify Dead Code

### 1. Search for References:
```bash
# Check if file is imported/required anywhere
grep -r "require.*schwab-auth" . --exclude-dir=node_modules
grep -r "import.*schwab-auth" . --exclude-dir=node_modules
```

### 2. Check Git History:
```bash
# When was it last modified?
git log --oneline schwab-auth-simple.js

# Is it tracked?
git ls-files | grep schwab
```

### 3. Check Package.json:
```bash
# Is it a script entry point?
cat package.json | grep -i schwab
```

---

## Execution Plan (NOT EXECUTED)

**Phase 1: Safe Moves (Low Risk)**
```bash
mkdir -p experiments/schwab scripts/windows examples/integrations experiments/quine

# Move Schwab experiments
mv schwab-*.js experiments/schwab/
mv debug-schwab.js experiments/schwab/

# Move batch files
mv *.bat scripts/windows/

# Move swarm agents
mv swarm-agents/* examples/integrations/
rmdir swarm-agents

# Move seed-quine
mv seed-quine/* experiments/quine/
rmdir seed-quine
```

**Phase 2: Review & Delete**
```bash
# Delete obvious dead code
rm .schwab-auth-simple.js.swp

# Review these files first:
cat test.js
cat simple-auth.js
# Then delete if confirmed dead
```

**Phase 3: Update Documentation**
```bash
# Update README.md to reflect new structure
# Update any hardcoded paths in code
```

---

## Impact Analysis

### Zero Impact (Safe to Move):
- `schwab-*.js` - Not referenced in core
- `swarm-agents/*` - Not referenced in core
- `seed-quine/*` - Not referenced in core
- `.swp` files - Editor artifacts

### Unknown Impact (Need Review):
- `deploy-*.js` - May be used in CI/CD
- `*.bat` - May be used by developers
- `test.js` - Unknown purpose

### Do Not Touch:
- Everything in: `bin/`, `core/`, `memory/`, `meta/`, `ui/`, `tests/`, `playbooks/`, `docs/`, `hardware/`, `domain/`

---

## Recommendations Summary

1. **Create new directories:** `scripts/`, `examples/`, `experiments/`
2. **Move experimental code** out of root into organized subdirectories
3. **Delete obvious dead code** (swap files)
4. **Review uncertain files** before moving or deleting
5. **Update documentation** after moves
6. **Test system** after any moves

---

## Next Steps

1. **Get approval** for proposed structure
2. **Verify files are truly dead** using search/git
3. **Execute moves** in test branch first
4. **Update any hardcoded paths** in code
5. **Test full system** before merging
6. **Update README** with new structure

---

**Status:** Documentation complete, awaiting approval for execution.
