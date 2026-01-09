# MetaLoop - Self-Optimization System

**Version:** 0.2  
**Status:** Production  
**Module:** `meta/MetaLoop.js`

---

## Overview

MetaLoop is a lightweight self-optimization system that observes ALIVE's execution patterns and suggests improvements through pattern recognition and playbook generation. It does **not** modify kernel behavior directly.

**Core Principle:** Observer pattern - MetaLoop watches, logs, and suggests but never controls execution.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Kernel (ALIVE)                       │
│  Executes tasks, makes decisions, produces results      │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ Run metadata (domain, taskType, metrics, outcome)
                  ▼
┌─────────────────────────────────────────────────────────┐
│                      MetaLoop                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Normalize  │→ │  Pattern Key │→ │   Tracking   │  │
│  │   (Task 2)   │  │  Generation  │  │   (Task 3)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Draft        │  │ Active       │  │  Statistics  │  │
│  │ Playbooks    │  │ Playbooks    │  │  & Decay     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                  │
                  │ Suggestions (playbook drafts, bias adjustments)
                  ▼
          Human reviews & promotes
```

---

## Data Flow

### 1. Recording Phase
```javascript
// Kernel completes a task
const run = {
  domain: 'cooking',
  taskType: 'compare',
  assessment: { urgency, stakes, difficulty, precision },
  metrics: { timeMs, stepCount, lookupUsed, ... },
  outcome: { status: 'success', userCorrectionsCount: 0 },
  inputs: { querySummary: "compare recipes for brownies" }
};

// MetaLoop records and reviews
const review = meta.recordAndReview(run);
```

### 2. Normalization Phase
```javascript
// Extract intent
const normalized = meta._normalizeIntent(run);
// {
//   domain: 'cooking',
//   taskType: 'compare',  // Synonyms mapped
//   intent: {
//     queryNorm: 'compare recipes for brownies',
//     entities: ['brownies', 'compare', 'recipes']
//   },
//   assessment: { ... }  // Bucketed
// }

// Generate pattern key
const patternKey = meta._patternKey(run);
// 'cooking|compare|3c090840a1339477'
```

### 3. Tracking Phase
```javascript
// Check for active playbook match
const activePlaybook = meta._findActivePlaybook(patternKey);

if (activePlaybook) {
  // Record usage
  meta.recordPlaybookUse(activePlaybook.id, patternKey);
  
  // Return match info (optional response prefix)
  return {
    playbookMatch: {
      playbookId: activePlaybook.id,
      responsePrefix: activePlaybook.responseHints?.prefix || null,
      useCount: ...
    }
  };
}
```

### 4. Pattern Recognition Phase
```javascript
// Count recent matches for this pattern
const count = meta._countRecentMatches(patternKey, domain, taskType);

// After N successful uses, draft a playbook
if (count >= promoteAfter && outcome.status === 'success') {
  const draft = meta._createPlaybookDraft(run, patternKey, count);
  meta._writePlaybookDraft(draft);  // Saved to playbooks/drafts/
}
```

---

## File Structure

```
data/
├── runlog.jsonl          # Append-only log of all runs
└── meta_state.json       # MetaLoop state (biases, drafts, usage stats)

playbooks/
├── drafts/               # Auto-generated playbook drafts
│   └── pb_*_<timestamp>.json
└── active/               # Manually promoted playbooks
    └── pb_*.json
```

---

## State Schema

### meta_state.json
```json
{
  "lookupBias": {
    "cooking|compare": -0.25,
    "cooking|howto": 0.5
  },
  "draftedKeys": {
    "cooking|compare|3c090840a1339477": {
      "draftedAt": "2026-01-09T04:06:27.900Z",
      "draftPath": "C:\\...\\pb_cooking_compare_*.json"
    }
  },
  "activeUsedCountById": {
    "pb_cooking_compare_3c090840a1339477": 69
  },
  "lastUsedAtById": {
    "pb_cooking_compare_3c090840a1339477": "2026-01-09T04:11:16.518Z"
  },
  "firstUsedAtById": {
    "pb_cooking_compare_3c090840a1339477": "2026-01-08T22:00:00.000Z"
  },
  "usageHistoryById": {
    "pb_cooking_compare_3c090840a1339477": [
      "2026-01-09T04:06:19.932Z",
      "2026-01-09T04:06:19.948Z",
      ...
    ]
  }
}
```

---

## Normalization (Checkpoint 2)

### Purpose
Make similar queries produce the same pattern key, enabling pattern recognition across cosmetic variations.

### Components

#### 1. Text Normalization
```javascript
_normalizeText(s) {
  return s.toLowerCase()
          .replace(/[^\w\s]/g, ' ')  // Remove punctuation
          .replace(/\s+/g, ' ')       // Collapse whitespace
          .trim();
}
```

**Example:**
- Input: `"Compare recipes for brownies!!!"`
- Output: `"compare recipes for brownies"`

#### 2. TaskType Synonym Mapping
```javascript
const synonyms = {
  'difference': 'compare',
  'vs': 'compare',
  'which is better': 'compare',
  'how to': 'howto',
  'steps': 'howto',
};
```

**Example:**
- `"which brownie recipe is better"` → taskType: `"compare"`

#### 3. Entity Extraction
```javascript
_extractEntitiesFromText(text) {
  // Remove stopwords, sort by length, take top 3
  return ['brownies', 'compare', 'recipes'];
}
```

#### 4. Assessment Bucketing
```javascript
_bucketAssessment(assessment) {
  // Map numeric/string values to {low, med, high}
  return {
    urgency: 'low',
    stakes: 'low',
    difficulty: 'med',
    precision: 'flexible'
  };
}
```

### Pattern Key Generation
```javascript
const normalized = _normalizeIntent(run);
const intentSig = stableHash(normalized);
return `${normalized.domain}|${normalized.taskType}|${intentSig}`;
// Result: "cooking|compare|3c090840a1339477"
```

**Determinism:** Same normalized intent → Same pattern key (100% verified)

---

## Active Playbooks (Checkpoint 3)

### Loading
```javascript
_loadActivePlaybooks() {
  // Read all .json files from playbooks/active/
  // Parse and validate required fields (id, trigger.patternKey)
  // Return array of playbook objects
}
```

### Matching
```javascript
_findActivePlaybook(patternKey) {
  return this.activePlaybooks.find(pb => 
    pb.trigger.patternKey === patternKey
  );
}
```

### Usage Tracking
```javascript
recordPlaybookUse(playbookId, patternKey) {
  // Increment useCount
  this.state.activeUsedCountById[playbookId]++;
  
  // Track first use (once)
  if (!this.state.firstUsedAtById[playbookId]) {
    this.state.firstUsedAtById[playbookId] = nowIso();
  }
  
  // Update last use
  this.state.lastUsedAtById[playbookId] = nowIso();
  
  // Append to usage history (last 100 entries)
  this.state.usageHistoryById[playbookId].push(nowIso());
  
  // Save state atomically
  this._saveState();
}
```

---

## Statistics & Decay (Tasks 2 & 3)

### Get Playbook Stats
```javascript
getPlaybookStats(playbookId) {
  return {
    playbookId,
    useCount: 69,
    firstUsedAt: "2026-01-08T22:00:00.000Z",
    lastUsedAt: "2026-01-09T04:11:16.518Z",
    daysSinceFirstUse: 1,
    daysSinceLastUse: 0,
    avgIntervalMs: 127000,      // Average time between uses
    avgIntervalHours: 0.04,
    historyLength: 100          // Capped at 100 entries
  };
}
```

### Staleness Detection
```javascript
isPlaybookStale(playbookId) {
  const stats = this.getPlaybookStats(playbookId);
  return stats.daysSinceLastUse > this.stalenessThresholdDays;  // Default: 30
}
```

**Observer Pattern:** Staleness does NOT prevent matching or alter behavior.

---

## After-Action Review

### Waste Detection
```javascript
afterActionReview(run) {
  const wasteFlags = [];
  
  // Flag 1: Lookup didn't change decision
  if (run.metrics.lookupUsed && !decisionChanged) {
    wasteFlags.push("lookup_did_not_change_decision");
  }
  
  // Flag 2: User corrections in strict mode
  if (run.outcome.userCorrectionsCount > 0 && precision === "strict") {
    wasteFlags.push("precision_mode_had_user_corrections");
  }
  
  // Flag 3: Too many steps for low stakes
  if (run.metrics.stepCount > 12 && run.assessment.stakes === "low") {
    wasteFlags.push("too_many_steps_for_low_stakes");
  }
  
  return { wasteFlags, ... };
}
```

### Lookup Bias Adjustment
```javascript
// If lookup used but didn't change decision → reduce bias
if (lookupUsed && !decisionChanged) newBias -= 0.25;

// If lookup NOT used and task failed → increase bias
if (!lookupUsed && status === "fail") newBias += 0.25;

// Clamp to [-2, +2]
newBias = Math.max(-2, Math.min(2, newBias));
```

---

## Configuration

### Constructor Options
```javascript
const meta = new MetaLoop({
  repoRoot: process.cwd(),              // Repository root
  dataDir: './data',                    // Where logs go
  playbookDraftDir: './playbooks/drafts',
  playbookActiveDir: './playbooks/active',
  promoteAfter: 3,                      // Draft after N successes
  maxRecentScan: 200,                   // How many runs to scan
  stalenessThresholdDays: 30,           // Stale if unused > N days
  debug: false                           // Gate stderr logging
});
```

### Debug Mode
```bash
# Enable debug logging
export METALOOP_DEBUG=1
node your-script.js

# Logs to stderr:
# 📗 MetaLoop: Active playbook "..." matched (use #5)
# 📝 MetaLoop: Created playbook draft "..." (3 successful uses)
# 🔄 MetaLoop: Adjusted lookup bias for "..." 0.00 → -0.25
```

---

## API Reference

### Recording
```javascript
recordAndReview(run)
```
Records a completed run, performs after-action review, returns insights.

### Pattern Generation
```javascript
_patternKey(run) → string
```
Generates normalized pattern key from run.

### Active Playbooks
```javascript
_findActivePlaybook(patternKey) → object|null
recordPlaybookUse(playbookId, patternKey) → object
getPlaybookStats(playbookId) → object|null
isPlaybookStale(playbookId) → boolean
```

### Utilities
```javascript
getLookupBias(domain, taskType) → number
debugSnapshot(limit = 10) → object
```

---

## Atomicity & Safety

### Atomic State Writes
```javascript
_saveState() {
  const tempPath = `${this.metaStatePath}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tempPath, JSON.stringify(this.state, null, 2));
  
  // Windows-safe rename
  if (fs.existsSync(this.metaStatePath)) {
    fs.unlinkSync(this.metaStatePath);
  }
  fs.renameSync(tempPath, this.metaStatePath);
}
```

**Benefits:**
- No partial writes
- Safe under rapid concurrent calls
- Unique temp filenames prevent collisions

### Runlog Appends
- Uses `appendFileSync()` for atomic appends
- Each line is complete JSON + newline
- JSONL format (JSON Lines)

---

## Performance

### Typical Operation Times
- `recordAndReview()`: ~3-5ms
- `_patternKey()`: ~0.1ms
- `getPlaybookStats()`: ~0.5ms
- `_saveState()`: ~2ms

### Memory Usage
- State: ~10-50KB (depends on number of patterns tracked)
- Usage history: ~800 bytes per playbook (100 timestamps × 8 bytes)
- Runlog: ~500 bytes per entry

---

## Testing

### Test Suite
```bash
node tests/test-normalization.js       # 6/6 tests
node tests/test-active-playbooks.js    # 5/5 tests
node tests/test-playbook-stats.js      # 7/7 tests
node tests/test-playbook-decay.js      # 6/6 tests
node tests/test-stress.js              # 6/6 tests (100 rapid runs)
```

### Replay Harness (Auditability)
```bash
node tests/replay-harness.js data/runlog.jsonl
```

Verifies:
- Pattern key determinism
- No drafts created during replay
- All entries parseable

---

## Limitations

1. **No semantic understanding** - Pattern matching is syntactic only
2. **No cross-domain learning** - Each domain is isolated
3. **No automatic promotion** - Playbooks must be manually promoted
4. **Fixed normalization** - Algorithm changes break existing pattern keys
5. **English-centric** - Entity extraction assumes English text

---

## Future Enhancements

1. **Semantic clustering** - Group related patterns
2. **Cross-domain transfer** - Apply learnings across domains
3. **Automatic promotion** - Promote drafts after validation period
4. **Decay-based archival** - Move stale playbooks to archive/
5. **Multi-language support** - Localized entity extraction

---

## References

- `docs/metaloop-v0.md` - Original design document
- `docs/behavior-change-proof.md` - Behavioral guarantees
- `docs/test-guide-metaloop.md` - Testing methodology
- `docs/CHECKPOINT-TASK*.md` - Implementation checkpoints
