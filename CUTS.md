# ALIVE Core Freeze v1 - Cut List

Post-freeze cleanup: move non-core code out of core repository.

## ✅ Keep in Core

These are essential for `alive run/status/stop`:

### Core Modules
- `core/kernel.js` - Main organism loop
- `core/assess.js` - Assessment engine
- `core/triage.js` - Task prioritization  
- `core/budget.js` - Resource allocation
- `core/reset.js` - Coherence detection
- `core/executor.js` - Execution router
- `core/domain-loader.js` - Domain loading (if used by kernel)

### Memory System
- `memory/stream.js` - Sensory stream
- `memory/working.js` - Working memory
- `memory/longterm.js` - Long-term memory

### Meta System
- `meta/MetaLoop.js` - Meta-loop tracking
- `meta/archive-old/` - Historical reference

### CLI & State
- `bin/alive.js` - Contract CLI (authoritative)
- `bin/contract_test.js` - Contract tests
- `data/` - State persistence

### Documentation
- `CONTRACT.md` - CLI contract
- `CUTS.md` - This file
- `CHANGELOG.md` - Version history
- `FREEZE.md` - Freeze documentation
- `README.md` - Core documentation
- `docs/ALIVE-Contracts.md` - Core contracts

## ❌ Move to /examples

These are demonstrations, not core functionality:

### Hardware Layer (entire directory)
- `hardware/` → `examples/hardware/`
  - HAL, bridges, modules, profiles
  - Vehicle integration demo
  - Hardware CLI

### Domain Examples
- `domain/hardware/` → `examples/domains/hardware/`

### Cooking/Recipe System
- `ui/cli.js` → `examples/cooking/cli.js` (cooking CLI theatrics)
- `domain/cooking/` → `examples/domains/cooking/` (if exists)

### Development Tools
- `ui/cli_meta.js` → `examples/debug/cli_meta.js` (meta loop debug)
- `bin/alive-cli.js` → `examples/legacy/alive-cli.js` (legacy ALIVE commands)

## ❌ Move to /archive

These are historical or experimental:

### Old Systems
- `alive-system/` → `archive/alive-system/`
- `seed-quine/` → `archive/seed-quine/`
- `swarm-agents/` → `archive/swarm-agents/`
- `web/dashboard.html` → `archive/web/`
- `playbooks/` → `archive/playbooks/`

### Old Trading Code
- Already in `archive/trading/` ✓

### Deploy Scripts
- `deploy-alive-genesis-v2.js` → `archive/deploy/`
- `deploy-alive.js` → `archive/deploy/`
- `GENESIS-SINGULARITY-DEPLOY.bat` → `archive/deploy/`
- `IGNITE-GENESIS.bat` → `archive/deploy/`

## 📋 Migration Checklist

### Phase 1: Create directories
```bash
mkdir -p examples/hardware
mkdir -p examples/domains
mkdir -p examples/cooking
mkdir -p examples/debug
mkdir -p examples/legacy
mkdir -p archive/deploy
mkdir -p archive/seed-quine
mkdir -p archive/swarm-agents
mkdir -p archive/web
mkdir -p archive/playbooks
mkdir -p archive/alive-system
```

### Phase 2: Move files
```bash
# Hardware to examples
git mv hardware examples/

# Domains to examples
git mv domain/hardware examples/domains/

# UI to examples
git mv ui/cli.js examples/cooking/
git mv ui/cli_meta.js examples/debug/
git mv bin/alive-cli.js examples/legacy/

# Old systems to archive
git mv alive-system archive/
git mv seed-quine archive/
git mv swarm-agents archive/
git mv web archive/
git mv playbooks archive/

# Deploy scripts to archive
git mv deploy-*.js archive/deploy/
git mv *.bat archive/deploy/
```

### Phase 3: Update imports
- Fix any broken imports in examples
- Update README.md with new structure
- Update package.json scripts if needed

### Phase 4: Commit
```bash
git add -A
git commit -m "Post-freeze cleanup: move non-core to examples/archive"
```

## ⚠️ Important Rules

1. **Don't break the contract**: `alive run/status/stop` must still work
2. **Keep kernel intact**: Don't move anything kernel depends on
3. **Preserve history**: Use `git mv` not delete+add
4. **Test after**: Run `npm run test:contract` after migration
5. **Document**: Update README.md with new structure

## 🎯 Result

After cleanup, core/ should contain ONLY:
- Contract CLI (`bin/alive.js`)
- Kernel loop + memory system
- Meta-loop tracking
- State persistence
- Core documentation

Everything else: examples or archive.

## Timeline

- **Phase 1-2**: Next PR (immediate)
- **Phase 3-4**: Same PR or follow-up
- **Testing**: Before merge

---

**Frozen:** 2026-01-09  
**Status:** Cut list defined, migration pending
