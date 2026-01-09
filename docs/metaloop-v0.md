## 🧠 MetaLoop v0 - Meta-Learning System

**Status**: ✅ Implemented and Integrated  
**Version**: 0.1.0  
**Type**: Pure Observer (Non-invasive)

---

### Overview

MetaLoop v0 is a meta-learning layer that observes the ALIVE organism loop and learns from experience **without modifying execution flow**. It records patterns, reduces low-value steps, and generates playbook drafts automatically.

### Architecture

```
Organism Loop (Unchanged)
    ↓
afterActionReview()  ← MetaLoop observes here
    ↓
MetaLoop Analysis:
  (1) Log action to JSONL
  (2) Track step values
  (3) Detect patterns
  (4) Generate playbook drafts
    ↓
Outputs: logs/, config/, playbooks/drafts/
```

### Core Components

#### 1. Action Logger (`meta/action-logger.js`)
- Records every task execution to `logs/actions.jsonl`
- Append-only JSONL format
- Tracks: taskType, steps, lookups, resets, corrections, timestamps

#### 2. Value Tracker (`meta/value-tracker.js`)
- Monitors: `did_this_change_the_outcome` for each step
- Reduces priority after 3 consecutive non-changes
- Stores config in `config/meta-config.json`
- Executor can query priority before running steps

#### 3. Pattern Detector (`meta/pattern-detector.js`)
- Analyzes action log for repeated successful patterns
- Threshold: ≥3 occurrences of same pattern
- Criteria: Same task type, 70%+ step overlap, 100% success rate

#### 4. Playbook Generator (`meta/playbook-generator.js`)
- Creates human-readable JSON drafts
- **NOT executable code** - documented patterns only
- Stores in `playbooks/drafts/`
- Manual promotion to `playbooks/active/`

#### 5. MetaLoop Orchestrator (`meta/metaloop.js`)
- Singleton coordinator
- Called by kernel via `afterActionReview()`
- Non-blocking: errors don't crash kernel

### Integration Point

**File**: `core/kernel.js`  
**Location**: After Remember, before Reset

```javascript
// (f) Remember
await this.remember(...);

// (f.1) MetaLoop - After Action Review (Observer only)
const MetaLoop = require('../meta/MetaLoop');
await MetaLoop.afterActionReview(result, metrics);

// (g) Reset if needed
```

**Impact**: Zero modification to execution flow. Pure observation.

### CLI Command

```bash
ALIVE> debug meta
```

**Output**:
- Recent actions (last 5)
- Playbook drafts created
- Low-value steps (priority reduced)
- Value statistics

### Constraint Compliance

✅ **Does NOT alter execution flow, triage, or kernel decisions**  
✅ **Only outputs**: logs, configs, playbook drafts  
✅ **No embeddings, no self-modifying code, no schedulers**  
✅ **Playbooks are human-readable drafts, not code**  
✅ **Promotion rule**: repeat + success + no user correction  
✅ **Kernel files untouched except for single afterActionReview() call**

### Example 1: Playbook Creation

**Scenario**: User asks for butter substitute 3 times

**Run 1-3**: Same task type, same successful steps
```
substitute → identify_function → suggest_substitute
```

**Trigger**: On 3rd occurrence, pattern detected

**Output**: `playbooks/drafts/pattern_substitute_butter.json`

```json
{
  "meta": {
    "name": "substitute-butter",
    "status": "DRAFT",
    "confidence": 0.80,
    "uses": 3
  },
  "description": "Automated workflow for substitute tasks involving: butter",
  "workflow": {
    "steps": [
      { "order": 1, "action": "identify_function", "required": true },
      { "order": 2, "action": "suggest_substitute", "required": true }
    ]
  },
  "notes": [
    "This playbook was automatically generated from repeated successful patterns.",
    "Review before promoting to active status."
  ]
}
```

**Next run**: System recognizes pattern exists (not yet using it - that's Phase 2)

### Example 2: Low-Value Reduction

**Scenario**: User asks for recipe comparison but ignores "bloat detection" 3 times

**Run 1-3**: Task succeeds, but `detect_bloat` output never used

**Tracking**:
```
detect_bloat:
  - totalUses: 3
  - changedOutcome: 0 (user ignored it every time)
  - consecutiveNonChanges: 3
```

**Trigger**: After 3rd non-use, priority reduced

**Action**: Priority: 5 → 2 (written to `config/meta-config.json`)

**Output**:
```
📉 MetaLoop: Reduced priority for "detect_bloat" from 5 to 2
   Reason: 3 consecutive non-changes
```

**Next run**: Executor can check priority and skip low-value steps when budget is tight

### Data Persistence

#### `logs/actions.jsonl`
```jsonl
{"taskId":"task_123","taskType":"substitute","steps":["identify_function","suggest_substitute"],"success":true,"timeSpent":150,"timestamp":1704726000000}
{"taskId":"task_124","taskType":"substitute","steps":["identify_function","suggest_substitute"],"success":true,"timeSpent":145,"timestamp":1704726120000}
```

#### `config/meta-config.json`
```json
{
  "stepValues": {
    "detect_bloat": {
      "totalUses": 3,
      "changedOutcome": 0,
      "consecutiveNonChanges": 3,
      "priority": 2,
      "valueScore": 0.0,
      "reductionReason": "3 consecutive times did not change outcome"
    }
  }
}
```

#### `playbooks/drafts/*.json`
Human-readable pattern documentation (see Example 1)

### Future Enhancements (Phase 2+)

- **Executor integration**: Actually use playbook shortcuts
- **User correction tracking**: Improve `did_this_change_the_outcome` detection
- **Pattern refinement**: Update playbooks based on new data
- **Active playbook execution**: Fast-path for known patterns
- **Budget integration**: Skip low-priority steps proactively

### Development Guidelines

1. **Non-invasive**: MetaLoop must never block or modify kernel behavior
2. **Fail-safe**: All MetaLoop errors are caught and logged, never crash kernel
3. **Human-in-loop**: Playbooks are drafts requiring manual review
4. **Data-driven**: Decisions based on recorded evidence, not heuristics
5. **Reversible**: All changes (priority, playbooks) can be manually overridden

### Testing

**Test playbook creation**:
```bash
# Run same task 3 times
ALIVE> substitute for butter
ALIVE> replace butter with oil
ALIVE> butter alternative

# Check for draft
ALIVE> debug meta
```

**Test low-value reduction**:
```bash
# Run task that includes detect_bloat 3 times, ignore its output
ALIVE> compare recipes for pasta
ALIVE> compare recipes for pizza  
ALIVE> compare recipes for soup

# Check priority reduction
ALIVE> debug meta
```

### Status

**Complete**: ✅  
**Tested**: Awaiting demonstration  
**Integrated**: ✅  
**Documented**: ✅

---

**Built**: 2026-01-08  
**Klein Approval**: Granted with constraints  
**Constraints Met**: All verified
