# ALIVE Core Freeze v1

**Date:** 2026-01-09  
**Status:** 🔒 FROZEN

## What is Frozen

The following components are now immutable and require explicit justification for any changes:

### Core Contract
- **CLI Commands** (`alive run/status/stop`)
- **JSON Output Schemas** (exact keys defined in CONTRACT.md)
- **Exit Codes** (0=success, 1=task fail, 2=boot fail)
- **Behavior Guarantees** (pure stdout, idempotency, deterministic)

### Core Modules
- `core/kernel.js` - Main organism loop
- `core/assess.js` - Assessment engine
- `core/triage.js` - Task prioritization
- `core/budget.js` - Resource governor
- `core/reset.js` - Coherence detection
- `core/executor.js` - Execution router

### Memory System
- `memory/stream.js` - Sensory stream
- `memory/working.js` - Working memory
- `memory/longterm.js` - Long-term storage

### Meta System
- `meta/MetaLoop.js` - Meta-loop tracking

### CLI & Testing
- `bin/alive.js` - Contract CLI (single entrypoint)
- `bin/contract_test.js` - Contract conformance tests

## Why Frozen

1. **Stability**: Contract must be reliable for downstream systems
2. **Predictability**: JSON schemas must not change unexpectedly
3. **Trust**: Exit codes and behavior must be deterministic
4. **Integration**: Other systems depend on this contract
5. **Testing**: Automated systems rely on stable interfaces

## What is NOT Frozen

These can evolve freely:

### Examples & Demos
- `hardware/` (will move to examples/)
- `domain/` (will move to examples/)
- `ui/cli.js` (will move to examples/cooking/)
- `bin/alive-cli.js` (will move to examples/legacy/)

### Documentation
- README.md (can be updated)
- Guides and tutorials (can be improved)

### Archived Code
- Everything in `archive/` (already archived)

## Change Process

To change frozen code:

### 1. Justification Required
File an issue with:
- Why the change is needed
- What breaks without it
- Impact analysis on downstream systems
- Migration plan for users

### 2. Contract Revision
If changing contract:
- Propose new contract version
- Document breaking changes
- Provide migration guide
- Update CONTRACT.md

### 3. Review & Approval
- Community review (if applicable)
- Maintainer approval
- Breaking change requires major version bump

### 4. Implementation
- Make the change
- Update all documentation
- Create migration tools if needed
- Update CHANGELOG.md

### 5. Testing
- All contract tests must pass
- Add new tests for new behavior
- Verify no regressions

## Allowed Without Approval

These don't require the full change process:

- **Bug fixes** (no API changes)
- **Documentation improvements**
- **Performance optimizations** (no API changes)
- **Test additions** (new tests, not changing existing)
- **Internal refactoring** (no observable changes)

## Version Policy

### Semantic Versioning
- **MAJOR** (x.0.0): Breaking contract changes
- **MINOR** (0.x.0): New features (backward compatible)
- **PATCH** (0.0.x): Bug fixes

### Current Version
- Contract: **v1**
- Tag: **core-freeze-v1**

## Enforcement

### Automated
- Contract tests run on every PR
- JSON schema validation
- Exit code verification
- Idempotency checks

### Manual
- Code review for changes to frozen modules
- Documentation review for contract changes
- Migration guide review for breaking changes

## Unfreezing

To unfreeze (should be rare):

1. Major security issue or critical bug
2. Widespread user request with strong justification
3. Technology obsolescence (e.g., Node.js version incompatibility)
4. Formal proposal with community consensus

Process:
1. File "Unfreeze Request" issue
2. Document reason and scope
3. Propose timeline and migration plan
4. Get stakeholder approval
5. Update FREEZE.md with unfreeze date
6. Follow normal change process

## Testing the Freeze

Verify contract compliance:
```bash
npm run test:contract
```

All 6 tests must pass:
- ✅ alive status returns correct JSON shape
- ✅ alive run "hello" returns correct JSON shape
- ✅ alive stop returns correct JSON shape
- ✅ alive stop is idempotent
- ✅ alive run without taskText returns error
- ✅ invalid command returns exit code 2

## History

- **2026-01-09**: Core Freeze v1 - Initial freeze
  - Contract CLI established
  - JSON schemas defined
  - Exit codes standardized
  - Tests implemented

---

**Remember**: Frozen ≠ Dead. It means **stable** and **reliable**.

Core improvements are welcome, but must justify why they're worth breaking the freeze.
