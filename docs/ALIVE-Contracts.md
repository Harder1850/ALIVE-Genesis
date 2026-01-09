# ALIVE Core Contracts v0

**Status**: Frozen (2026-01-08)  
**Purpose**: Define immutable interfaces for ALIVE Core components

---

## Core Principle: Reduction Rule

> **Any change requiring kernel modification is a kernel proposal, not a feature.**

Features must conform to existing contracts. If a feature cannot fit within these contracts, the contract itself must be revised with explicit justification.

---

## 1. Kernel Loop Contract

### **Interface**

```
input → Stream → Assess → Triage → Budget → Execute → Remember → Reset? → output
```

### **Stages (Immutable Order)**

1. **Stream Capture**: Add input to consciousness buffer
2. **Assess**: Evaluate via RESTI framework
3. **Triage**: Prioritize, defer, discard
4. **Budget**: Allocate time/compute resources
5. **Execute**: Run prioritized tasks
6. **Remember**: Store in appropriate memory tier
7. **Reset**: Trigger on coherence break (optional)

### **Guarantees**

- ✅ Every input passes through all stages in order
- ✅ No stage may be skipped
- ✅ Each stage receives output of previous stage
- ✅ Reset is the ONLY way to restart the loop

### **What May Change**

- ❌ Stage order (frozen)
- ✅ Logic WITHIN stages (via contracts)
- ✅ Domain handlers called by Execute
- ✅ Memory tier implementations

---

## 2. Assess Output Schema (RESTI)

### **Interface**

```javascript
{
  // Resources: What's available?
  resources: {
    localKnowledge: boolean,  // Can answer from memory
    needsLookup: boolean,      // Requires external search
    toolsAvailable: string[]   // Which tools can help
  },
  
  // Environment: What's the context?
  environment: {
    domain: string,            // e.g., "cooking", "general"
    urgency: "NOW" | "SOON" | "LATER",
    stakes: "low" | "medium" | "high"
  },
  
  // Skills: What's the difficulty?
  skills: {
    difficulty: "easy" | "moderate" | "hard" | "critical",
    knownPattern: boolean,     // Have we done this before?
    confidence: number         // 0.0 - 1.0
  },
  
  // Threats: What could go wrong?
  threats: {
    contradictions: string[],  // Conflicting assumptions
    ambiguity: boolean,        // Unclear intent
    outOfScope: boolean        // Beyond capabilities
  },
  
  // Internal State: How are we doing?
  internal: {
    precision: "strict" | "flexible",  // Execution mode
    loopCount: number,         // How many iterations
    needsReset: boolean        // Coherence break detected
  },
  
  // Legacy (for backwards compatibility)
  inputType: string            // Classified task type
}
```

### **What May Change**

- ❌ Top-level RESTI categories (frozen)
- ✅ Fields within categories (extensible)
- ✅ Classification logic (how values are determined)
- ✅ Threshold values (e.g., what defines "high" stakes)

---

## 3. MetaLoop Contract

### **What MetaLoop MAY Do**

✅ **Observe** execution (read-only access to results)  
✅ **Log** runs to `data/runlog.jsonl`  
✅ **Adjust policy** in `data/meta_state.json`  
✅ **Draft playbooks** in `playbooks/drafts/*.json`  
✅ **Provide bias values** via `getLookupBias(domain, taskType)`  

### **What MetaLoop MAY NOT Do**

❌ Modify kernel execution flow  
❌ Skip or reorder kernel stages  
❌ Write to core/ or modify .js files  
❌ Make final execution decisions  
❌ Access user secrets or raw inputs beyond summaries  

### **Interface**

```javascript
// Required method
recordAndReview({
  domain: string,
  taskType: string,
  assessment: RESTI,
  metrics: {
    timeMs: number,
    stepCount: number,
    toolCalls: number,
    lookupUsed: boolean,
    lookupCount: number,
    resetTriggered: boolean
  },
  outcome: {
    status: "success" | "partial" | "fail",
    userCorrectionsCount: number
  },
  inputs: object,    // Summary only (max 100 chars)
  outputs: object,   // Summary only
  lookupImpact: {
    decisionChanged: boolean
  }
}) => ReviewResult

// Optional query method
getLookupBias(domain: string, taskType: string) => number  // [-2, +2]

// Debug method
debugSnapshot(limit?: number) => {
  runlogPath: string,
  metaStatePath: string,
  lastRuns: Run[],
  lookupBias: object,
  draftedKeys: object
}
```

### **Outputs (Write-Only)**

- `data/runlog.jsonl` - Append-only JSONL log
- `data/meta_state.json` - Policy state
- `playbooks/drafts/*.json` - Human-readable playbook drafts

### **Fail-Safe Rule**

> If MetaLoop crashes, kernel continues normally. Observer failures MUST NOT crash the organism.

---

## 4. Policy-Informed Execution Rule

### **Principle**

> **The Executor owns all execution decisions. Policy is advisory input only.**

### **Decision Flow**

```
1. Executor receives task from Triage
2. Executor MAY consult MetaLoop for policy: getLookupBias()
3. Executor DECIDES whether to run task (considers policy + context)
4. Executor EXECUTES decision
5. MetaLoop observes result (after the fact)
```

### **Executor Decision Authority**

The Executor MUST consider:
- ✅ Policy from MetaLoop (lookup bias, step priorities)
- ✅ Current context (stakes, urgency, budget)
- ✅ Safety overrides (high stakes = run all steps)
- ✅ Fail-safe defaults (unknown steps = run them)

**Final decision**: Executor, not MetaLoop

### **Safety Overrides**

```javascript
if (assessment.stakes === "high") {
    // HIGH STAKES: Ignore policy, run everything
    return RUN_TASK;
}

if (policyReadFails) {
    // FAIL-SAFE: Run task if policy unavailable
    return RUN_TASK;
}

// Only then consider policy
if (policy.suggests(SKIP) && context.allows(SKIP)) {
    return SKIP_TASK;
}
```

### **What May Change**

- ❌ Executor ownership (frozen)
- ❌ Safety-first principle (frozen)
- ✅ Policy types (lookup bias, step priorities, etc.)
- ✅ Decision heuristics (how policy + context combine)

---

## 5. Domain Isolation Contract

### **Principle**

> **Core MUST boot and run without any specific domain loaded.**

### **Requirements**

✅ Kernel loop works with domain="general"  
✅ CLI accepts commands with no domain  
✅ System reports "No domain loaded" gracefully  
✅ Core components have ZERO domain-specific logic  

### **Domain Handler Interface**

```javascript
// Domain handlers are registered, not hard-coded
class DomainHandler {
  name: string              // "cooking", "finance", etc.
  
  canHandle(assessment: RESTI) => boolean
  
  execute(task: Task, context: Context) => Result
}

// Registration (not in core)
Executor.registerDomain(new CookingDomain());
```

### **Smoke Test**

```javascript
// Disable all domains
Executor.clearDomains();

// Core still works
const result = kernel.process("test input");
assert(result.success === false || result.result.type === "no_domain");

// No crashes
assert(kernel.status.loopCount > 0);
```

---

## 6. Memory Tier Contract

### **Three Tiers (Immutable)**

1. **Stream**: Rolling window, decays/expands
2. **Working**: Active session, detects contradictions
3. **Long-term**: Stable knowledge, promotion rule: 3+ uses in 30 days

### **Promotion Rule**

```
item.useCount >= 3 AND item.lastUsed within 30 days => promote to long-term
item.unusedFor > 90 days => demote from long-term
```

### **What May Change**

- ❌ Three-tier structure (frozen)
- ❌ Promotion direction (stream → working → long-term)
- ✅ Promotion thresholds (3 uses, 30 days)
- ✅ Storage implementation (Map, SQLite, etc.)
- ✅ Decay algorithms within tiers

---

## 7. Reset Contract

### **Trigger Conditions**

Reset MUST trigger when:
- ✅ Contradictory assumptions detected
- ✅ Repeated loops without progress
- ✅ New information not incorporated into plan

### **Reset Actions**

```
1. Snapshot working memory
2. Store learned patterns to long-term
3. Clear working memory
4. Collapse stream memory to summary
5. Reset loop counter
6. Resume at Stream stage
```

### **What May Change**

- ❌ Reset triggers (frozen: contradiction, loop, stagnation)
- ❌ Memory clearing (frozen: working cleared, long-term preserved)
- ✅ Trigger sensitivity (how many loops = "repeated")
- ✅ Snapshot format

---

## 8. Mode Contract

### **Two Modes (Immutable)**

1. **PRECISION**: Strict, deterministic, no creative additions
2. **HEURISTIC**: Flexible, "good enough" allowed, simplicity bias

### **Mode Selection Rules**

```
PRECISION for:
- Conversions (measurements, currency)
- Safety queries (temperatures, allergens)
- Form filling (schemas, APIs)
- Legal/financial tasks

HEURISTIC for (default):
- Brainstorming
- Recipe variations
- Planning
- Casual queries
```

### **What May Change**

- ❌ Two-mode system (frozen)
- ❌ PRECISION = strict (frozen)
- ✅ Mode selection heuristics
- ✅ Per-stage mode interpretation

---

## Enforcement

### **Contract Violations**

Any code that:
- Skips kernel stages
- Modifies execution order
- Lets MetaLoop control decisions
- Hard-codes domain logic in core
- Bypasses safety overrides

...is **rejected** and requires contract revision proposal.

### **Contract Changes**

1. Propose change with justification
2. Document impact on existing code
3. Require explicit review/approval
4. Version bump (e.g., v0 → v1)

---

## Version History

**v0 (2026-01-08)**: Initial contract freeze
- Kernel loop order: immutable
- RESTI framework: frozen
- MetaLoop observer-only: frozen
- Executor ownership: frozen
- Domain isolation: required
- Three memory tiers: frozen
- Reset triggers: frozen
- Two execution modes: frozen

---

**Status**: 🔒 Frozen  
**Next Review**: After 100 production runs or contract violation proposal
