# ALIVE Core Freeze Readiness Pass

## Overview

This document outlines the readiness checklist before freezing ALIVE's core system. Once frozen, the core will require explicit justification and contract revision for any changes.

## Core Freeze Checklist

### ✅ Phase 1: Contract Validation

**Core Components (contracts only):**
- [x] Kernel Loop - Stream → Assess → Triage → Budget → Execute → Remember → Reset
- [x] Memory Tiers - Stream, Working, Long-term
- [x] Execution Modes - PRECISION vs HEURISTIC
- [x] Assessment Framework - Urgency/Stakes/Difficulty/Precision
- [x] Budget Governor - Time/compute ceilings
- [x] Reset Controller - Coherence break detection
- [ ] **SystemBus** - Event/message bus for inter-module communication
- [ ] **DomainRegistry** - JSON registry of loaded domains
- [ ] **IntentRouter** - Routes tasks to appropriate domains
- [ ] **ConfigLoader** - Centralized configuration management
- [ ] **AuditLogger** - System-wide audit logging
- [ ] **PolicyEngine** - Permission and policy checks

### ✅ Phase 2: Missing Core Components

#### 2.1 System Bus
- [ ] Create core/system-bus.js
- [ ] Implement pub/sub pattern
- [ ] Add module registration
- [ ] Add event routing

#### 2.2 Domain Registry
- [ ] Create core/domain-registry.json
- [ ] Define registry schema
- [ ] Add version tracking
- [ ] Document registry format

#### 2.3 Intent Router
- [ ] Create core/intent-router.js
- [ ] Implement canHandle() interface
- [ ] Add domain routing logic
- [ ] Add fallback handling

#### 2.4 Config Loader
- [ ] Create core/config-loader.js
- [ ] Support environment variables
- [ ] Support JSON config files
- [ ] Add validation

#### 2.5 Audit Logger
- [ ] Create core/audit-logger.js
- [ ] Define log schema
- [ ] Add log levels
- [ ] Add log rotation

#### 2.6 Policy Engine
- [ ] Create core/policy-engine.js
- [ ] Define permission model
- [ ] Add policy evaluation
- [ ] Start permissive (allow all)

### ✅ Phase 3: Schema & Versioning

#### 3.1 Core Schema
- [ ] Create schema/core-v1.json
- [ ] Define module interfaces
- [ ] Define event schemas
- [ ] Define config schemas

#### 3.2 Version Management
- [ ] Add version field to all modules
- [ ] Create migration framework
- [ ] Document migration process
- [ ] Add version compatibility checks

#### 3.3 Migration Stub
- [ ] Create migrations/ directory
- [ ] Add migration template
- [ ] Document migration guidelines
- [ ] Add migration runner

### ✅ Phase 4: Testing & Validation

#### 4.1 Smoke Tests
- [ ] Create tests/smoke/
- [ ] Test: Kernel boot
- [ ] Test: Memory operations
- [ ] Test: Domain loading
- [ ] Test: CLI commands
- [ ] Test: Hardware integration

#### 4.2 ALIVE Doctor
- [ ] Create bin/alive-doctor.js
- [ ] Check: Core integrity
- [ ] Check: Dependencies
- [ ] Check: Configuration
- [ ] Check: Memory health
- [ ] Check: Domain health
- [ ] Generate health report

#### 4.3 Integration Tests
- [ ] Test: End-to-end workflows
- [ ] Test: Error handling
- [ ] Test: Resource limits
- [ ] Test: Domain isolation

### ✅ Phase 5: Clean Clone Test

#### 5.1 Fresh Install Process
```bash
# Document exact steps
git clone <repo>
cd ALIVE-Genesis
npm install
npm link
ALIVE status
ALIVE hardware status
npm test
```

#### 5.2 Validation Criteria
- [ ] All dependencies install cleanly
- [ ] No missing files
- [ ] CLI commands work
- [ ] Tests pass
- [ ] Documentation accessible

#### 5.3 Install Documentation
- [ ] Create INSTALL.md
- [ ] Document prerequisites
- [ ] Document step-by-step install
- [ ] Document troubleshooting
- [ ] Document verification steps

### ✅ Phase 6: Freeze Enforcement

#### 6.1 Freeze Tag
```bash
git tag -a core-v1.0.0-freeze -m "Core freeze: contracts stable"
git push origin core-v1.0.0-freeze
```

#### 6.2 Freeze Policy
- [ ] Document in CORE-CONTRACTS.md
- [ ] Require justification for core changes
- [ ] Require impact analysis
- [ ] Require contract revision proposal
- [ ] Require community review (if applicable)

#### 6.3 Change Process
```
Core Change Request:
1. Justification - Why is this change needed?
2. Impact Analysis - What breaks? What's affected?
3. Contract Revision - How does the interface change?
4. Migration Plan - How do existing systems upgrade?
5. Review & Approval - Community/team review
6. Implementation - Make the change
7. Documentation - Update all docs
```

## Core Folder Layout (Stable)

```
ALIVE-Genesis/
├── core/                      # FROZEN - Core contracts only
│   ├── kernel.js             # Main organism loop
│   ├── assess.js             # Assessment engine
│   ├── triage.js             # Task prioritization
│   ├── budget.js             # Resource allocation
│   ├── reset.js              # Coherence detection
│   ├── executor.js           # Execution router
│   ├── system-bus.js         # NEW - Event bus
│   ├── intent-router.js      # NEW - Task routing
│   ├── config-loader.js      # NEW - Configuration
│   ├── audit-logger.js       # NEW - Audit logging
│   ├── policy-engine.js      # NEW - Permissions
│   └── domain-loader.js      # Domain loading
├── memory/                    # FROZEN - Memory contracts
│   ├── stream.js
│   ├── working.js
│   └── longterm.js
├── schema/                    # NEW - Interface schemas
│   ├── core-v1.json
│   ├── domain-v1.json
│   └── hardware-v1.json
├── migrations/                # NEW - Version migrations
│   ├── migration-template.js
│   └── README.md
├── tests/                     # NEW - Core tests
│   ├── smoke/                # Smoke tests
│   ├── integration/          # Integration tests
│   └── unit/                 # Unit tests
├── domain/                    # EXTENSIBLE - Domains
├── hardware/                  # EXTENSIBLE - Hardware layer
├── tools/                     # EXTENSIBLE - Tools
└── bin/                       # CLI executables
    ├── alive-cli.js
    └── alive-doctor.js       # NEW - Health check
```

## Pre-Freeze Verification

### Manual Checklist

- [ ] All core modules have version numbers
- [ ] All core modules have contracts defined
- [ ] All tests pass
- [ ] Documentation is complete
- [ ] INSTALL.md verified with clean clone
- [ ] ALIVE doctor runs successfully
- [ ] No TODOs or FIXMEs in core/
- [ ] All core APIs documented
- [ ] Migration framework in place

### Automated Checks

```bash
# Run all checks
npm run core:verify

# Individual checks
npm run core:test          # Run tests
npm run core:lint          # Lint core files
npm run core:doctor        # Health check
npm run core:coverage      # Test coverage
```

## Post-Freeze Process

### Core Changes

**Allowed without approval:**
- Bug fixes (no API changes)
- Documentation improvements
- Performance optimizations (no API changes)
- Test additions

**Requires approval:**
- API changes
- New core modules
- Behavioral changes
- Schema changes

### Approval Process

1. Create issue with "core-change" label
2. Fill out change request template
3. Wait for community review
4. Revise based on feedback
5. Get approval from maintainers
6. Implement change
7. Update documentation
8. Create migration if needed
9. Update CORE-CONTRACTS.md

## Success Criteria

Core freeze is successful when:

✅ All components are contract-based
✅ All tests pass
✅ Clean clone install works
✅ ALIVE doctor passes
✅ Documentation is complete
✅ Migration framework exists
✅ Change process is documented
✅ Freeze commit is tagged

## Timeline

1. **Week 1**: Add missing components (SystemBus, Registry, Router, etc.)
2. **Week 2**: Add schemas and migration framework
3. **Week 3**: Write tests and ALIVE doctor
4. **Week 4**: Clean clone testing and documentation
5. **Week 5**: Final verification and freeze tag

## Contact

For questions about core freeze:
- Review CORE-CONTRACTS.md
- Check docs/CORE-FREEZE-READINESS.md
- File issue with "core-question" label

---

**Status**: 🟡 IN PROGRESS
**Target Freeze Date**: TBD
**Current Phase**: Phase 1 - Contract Validation
