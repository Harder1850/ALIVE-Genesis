# Changelog

All notable changes to the ALIVE Bot project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Core Freeze v1] - 2026-01-09

### 🎯 CORE FROZEN

Core system is now frozen. All future changes require contract justification.

### Added
- **Contract CLI** (`bin/alive.js`) - Single authoritative entrypoint
  - `alive run "<taskText>"` - Execute tasks with kernel integration
  - `alive status` - Show organism status
  - `alive stop` - Stop organism (idempotent)
- **Contract Tests** (`bin/contract_test.js`) - 6 conformance tests
- **Contract Documentation** (`CONTRACT.md`) - Immutable CLI contract
- **Cut List** (`CUTS.md`) - Post-freeze cleanup plan
- **Freeze Documentation** (`FREEZE.md`) - What's frozen and why

### Changed
- **package.json** - Both `alive` and `ALIVE` point to same file
- **JSON Output** - Exact contract-compliant keys for all commands
- **Exit Codes** - 0 (success), 1 (task failure), 2 (boot failure)
- **MetaLoop File** - Renamed to canonical `meta/MetaLoop.js` casing

### Fixed
- Windows case-insensitivity issue with MetaLoop imports
- `ALIVE debug meta` command (corrected export name)
- Pure JSON stdout (no contamination from logs)
- CLI exit behavior (no hangs)

### Contract Guarantees
- ✅ Pure stdout - JSON only
- ✅ Deterministic output
- ✅ Idempotent stop
- ✅ Clean exit
- ✅ Stable keys
- ✅ Real kernel integration

### Testing
```bash
npm run test:contract  # All tests pass: 6/6
```

---

## [2.0.0] - 2025-12-XX

### Added
- Hardware integration layer
- Domain expansion framework
- Memory tier system
- Meta-loop tracking

### Changed
- Core organism architecture
- Triage and budget systems

---

## [1.0.0] - Initial Release

### Added
- Basic ALIVE organism
- Cooking domain MVP
- Simple CLI interface
