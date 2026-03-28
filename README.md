# ⚠️ ARCHIVED — HISTORICAL R&D (NOT PART OF ACTIVE ALIVE)

**This repository contains early experimental research predating ALIVE's constitutional architecture (STG, execution gating, authority separation).**

**It is NOT wired into the ALIVE system.**  
**It has NO authority.**  
**It must NOT be used as a reference for current architecture.**

This repository is retained solely for research and code mining.

**👉 The active contained cognition system is:** `alive-genesis-sandbox`

---

# 🧬 ALIVE Cooking MVP - Organism System

**A**utonomous **L**earning **I**ntelligence with **V**ersatile **E**xecution

An AI organism that behaves like a living system: it triages, budgets resources, uses memory tiers, and can operate offline-first for cooking tasks.

---

## 🔒 ALIVE Core v0 (Frozen)

**Status**: Core architecture is frozen as of 2026-01-08

The following components are immutable and require explicit contract review for changes:
- **Kernel Loop**: Stream → Assess → Triage → Budget → Execute → Remember → Reset
- **MetaLoop Observer**: Observer-only pattern, policy-informed execution
- **CLI Entrypoints**: Command interface and kernel integration
- **Memory Tiers**: Three-tier architecture (Stream, Working, Long-term)
- **Execution Modes**: PRECISION vs HEURISTIC

**Contract**: See `docs/ALIVE-Contracts.md` for complete interface specifications.

**Rationale**: Stability before expansion. Domain features and learning enhancements build on this foundation without modifying core contracts.

**Changes Require**: Explicit justification, impact analysis, and contract revision proposal.

---

## 🧠 Core Architecture

### The Organism Loop

Every input goes through the full organism pipeline:

```
Stream → Assess → Triage → Budget → Execute → Remember → Reset (if needed)
                                       ↓
                                   MetaLoop (observes & learns)
```

**Policy-Influenced Execution**: The executor consults MetaLoop's learned policies to skip low-value steps under budget pressure or low stakes, while always prioritizing safety for high-stakes tasks.

1. **Stream Capture** - Add to consciousness buffer (adaptive window)
2. **Assess** - Evaluate urgency/stakes/difficulty/precision
3. **Triage** - Prioritize top 3 tasks, identify dependencies, defer/discard
4. **Budget** - Allocate time/compute with ceilings
5. **Execute** - Run tasks in order (respects dependencies)
6. **Remember** - Store in appropriate memory tier
7. **Reset** - Trigger on coherence breaks (contradictions, loops, stagnation)

### Memory Tiers

**Stream Memory** (Consciousness Buffer)
- Rolling window of recent events
- Adaptive: shrinks when active, expands when relaxed, collapses to summary when idle

**Working Memory** (Active Session)
- Current task, assumptions, active plans
- Decays after 1 hour unless promoted
- Detects contradictions

**Long-term Memory** (Stable Knowledge)
- Recipe library, preferences, trusted sources, patterns
- Promotion rule: 3+ uses within 30 days
- Demotion: unused for 90 days

### Execution Modes

**PRECISION Mode** (strict)
- Use for: conversions, safety queries, form filling
- No creative additions
- Deterministic, checkable output

**HEURISTIC Mode** (flexible) - Default
- Use for: brainstorming, variations, planning
- "Good enough" allowed
- Simplicity bias applied

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Run CLI

```bash
npm start
```

### Example Queries

```
ALIVE> Compare 3 recipes for chocolate chip cookies
ALIVE> Substitute for butter in baking
ALIVE> Convert 2 cups to ml
ALIVE> Search for pasta recipes
```

### CLI Commands

```
help              - Show help
status            - Show kernel status
mode <mode>       - Set PRECISION or HEURISTIC mode
memory            - Show memory tier status
quit / exit       - Exit
```

## 📋 Assessment Output

For every query, ALIVE outputs:

- **Urgency**: NOW / SOON / LATER
- **Stakes**: low / medium / high
- **Difficulty**: easy / moderate / hard / critical
- **Precision**: strict / flexible

## 🎯 Triage Output

- **Top Priorities** (max 3 tasks)
- **Dependencies** (what must happen first)
- **Deferred Items** (postponed)
- **Discarded Noise** (irrelevant)

## 💰 Budget Governor

- Enforces time/compute ceilings per task
- Stops research loops when marginal value < 10%
- If time expires: chooses best reversible action

## 🔄 Reset Controller

Triggers reset when:
- Contradictory assumptions detected
- Repeated loops without progress
- New information not incorporated into plan

## 🍳 Cooking Features

### Recipe Management
- Add recipe
- Search recipes
- Compare recipes (extracts core, detects bloat)

### Substitution Engine
- Identifies ingredient function (fat, binder, leavening, etc.)
- Suggests substitutes ranked by risk/availability/reversibility
- Always proposes minimal workable option first

### Conversion Lookup
- Local tables for common conversions
- Volume, weight, temperature
- Web lookup only when time-sensitive or confidence low

### Recipe Comparison
- Gathers 2-5 candidates
- Extracts common core (signal)
- Identifies variations (style)
- Warns about bloat/unnecessary steps
- Outputs "Mikey version" (≤5 ingredients preferred)

## 🧪 Project Structure

```
ALIVE-Genesis/
├── core/              # Kernel and organism loop
│   ├── kernel.js      # Main organism loop orchestrator
│   ├── assess.js      # Assessment engine
│   ├── triage.js      # Task prioritization
│   ├── budget.js      # Resource allocation
│   ├── reset.js       # Coherence break detection
│   └── executor.js    # Task execution router
├── memory/            # Three-tier memory system
│   ├── stream.js      # Consciousness buffer
│   ├── working.js     # Active session state
│   └── longterm.js    # Stable knowledge base
├── domain/            # Domain-specific features
│   └── cooking/       # Cooking domain (to be expanded)
├── storage/           # Persistence layer (SQLite)
├── tools/             # Safe tool wrappers
├── ui/                # User interfaces
│   └── cli.js         # Command-line interface
└── tests/             # Acceptance tests
```

## 🎯 Design Principles

### Mikey's Preferences (Built-in)
- **≤5 ingredients** unless justified
- **Penalize unnecessary steps** - simplicity bias
- **Minimal workable option first** - field expedience
- **Good enough > perfect** - heuristic mode default
- **Reversible actions preferred** - safe defaults

### Organism Behavior
- **Budget-constrained** - won't spin forever
- **Dependency-aware** - respects task order
- **Self-correcting** - resets on coherence breaks
- **Memory-efficient** - decays unused items
- **Offline-first** - local tables before web lookup

## ✅ Acceptance Tests (To Implement)

1. **Triage Test**: Given 10 mixed tasks, outputs prioritized sequence with dependencies
2. **Budget Test**: In NOW/high stakes, acts within budget and chooses reversible actions
3. **Precision Test**: Fills schema exactly - no extra/missing fields
4. **Recipe Compare**: Outputs core + variations + bloat warnings
5. **Memory Promotion**: Repeated recipe becomes long-term; unused notes decay
6. **Reset Test**: Triggers correctly when stuck in loop

## 🛠️ Development

### Add a New Domain Handler

1. Create handler in `domain/`
2. Add routing in `core/executor.js`
3. Update assessor keywords if needed
4. Test through CLI

### Extend Memory

- Long-term memory uses Map-based indexing
- Export/import for backup
- Promotion/demotion rules can be tuned

### Add Tool

- Create safe wrapper in `tools/`
- Hook into executor
- Respect budget constraints

## 🔐 Security

- No secrets in repository
- Environment variables in `.env` (gitignored)
- See `SECURITY.md` for details

## 📝 Status

**Current**: Phase 1 Complete - Core organism functional
**Next**: Full cooking domain features, SQLite storage, acceptance tests

## 🤝 Contributing

This is a personal project for Mikey. If extending:
- Follow organism principles
- Respect budget constraints
- Keep simplicity bias
- Test with CLI

---

## 📱 Creating PB / EXP Tasks from GitHub Mobile

This repo includes **GitHub Issue Forms** so you can create structured tasks quickly from your phone.

1. Open the repo in **GitHub Mobile**
2. Tap **Issues** → **New issue**
3. Pick a template:
   - **Playbook Task (PB-xxxx)** → for implementation work
   - **Experiment (EXP-xxxx)** → for hypotheses + benchmarks
   - **Bug Report** → for break/fix with repro steps
4. Fill the fields and submit

Tips:
- Put the short identifier up front in the title: `PB-0123: ...` or `EXP-0042: ...`
- Keep constraints explicit (especially anything touching **FREEZE.md**)

---

**Built with**: Node.js 18+
**License**: See LICENSE file
**Version**: 2.0.0 - ALIVE Cooking MVP
