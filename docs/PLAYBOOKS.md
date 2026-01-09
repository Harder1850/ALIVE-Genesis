# Playbooks - Pattern-Based Workflows

**Version:** 0.1  
**Status:** Production  
**Introduced:** Checkpoint 3

---

## Overview

Playbooks are reusable workflow patterns that MetaLoop identifies through repeated successful executions. They capture "what works" for specific types of tasks without prescribing how to execute them.

**Key Principle:** Playbooks are **metadata**, not executable code. They describe patterns but don't control kernel behavior.

---

## Lifecycle

```
1. Pattern Emerges
   └─> User asks similar questions repeatedly
       └─> All complete successfully

2. Draft Created (Auto)
   └─> MetaLoop detects ≥3 successful runs with same pattern key
       └─> Writes draft to playbooks/drafts/

3. Human Review
   └─> Engineer reviews draft playbook
       └─> Validates trigger conditions
       └─> Verifies steps make sense

4. Promotion (Manual)
   └─> Copy draft from drafts/ to active/
       └─> MetaLoop loads on next run
       └─> Starts tracking usage

5. Tracking & Decay
   └─> MetaLoop records every use
       └─> Calculates statistics
       └─> Flags if stale (unused >30 days)

6. Archival (Manual)
   └─> Human decides to archive stale playbooks
       └─> Move to playbooks/archive/ (optional)
```

---

## Directory Structure

```
playbooks/
├── drafts/                    # Auto-generated (MetaLoop)
│   ├── pb_cooking_compare_3c090840a1339477_1767931587899.json
│   ├── pb_cooking_howto_69c11839f2b5d04d_1767931876242.json
│   └── ...
│
├── active/                    # Manually promoted
│   ├── pb_cooking_compare_brownies.json
│   └── ...
│
└── archive/                   # Manually archived (optional)
    └── pb_stale_example.json
```

---

## Playbook Schema

### Minimum Required Fields
```json
{
  "id": "pb_cooking_compare_3c090840a1339477",
  "version": "0.1",
  "trigger": {
    "patternKey": "cooking|compare|3c090840a1339477"
  }
}
```

### Full Example
```json
{
  "id": "pb_cooking_compare_3c090840a1339477",
  "version": "0.1",
  "createdAt": "2026-01-08T22:00:00.000Z",
  
  "domain": "cooking",
  "taskType": "compare",
  
  "trigger": {
    "description": "Compare brownie recipes",
    "patternKey": "cooking|compare|3c090840a1339477",
    "minSuccessCount": 3,
    "inputsExample": {
      "querySummary": "compare recipes for brownies"
    }
  },
  
  "steps": [
    { "name": "Orient", "notes": "Classify request - brownie recipe comparison" },
    { "name": "Triage", "notes": "Gather 2-3 candidate recipes" },
    { "name": "Execute", "notes": "Extract core ingredients and steps" },
    { "name": "Validate", "notes": "Present comparison table" }
  ],
  
  "validation": {
    "precision": "flexible",
    "successCriteria": [
      "Outcome status == success",
      "Comparison table with key differences"
    ]
  },
  
  "responseHints": {
    "prefix": "[Using proven recipe comparison playbook] "
  },
  
  "notes": {
    "whyPromoted": "Manually promoted for testing - matches normalized brownie comparison queries"
  }
}
```

---

## Field Reference

### id (required)
- **Type:** string
- **Format:** `pb_{domain}_{taskType}_{intentHash}`
- **Example:** `"pb_cooking_compare_3c090840a1339477"`
- **Purpose:** Unique identifier for tracking usage

### version
- **Type:** string
- **Example:** `"0.1"`
- **Purpose:** Schema versioning for future compatibility

### createdAt
- **Type:** ISO8601 timestamp
- **Example:** `"2026-01-08T22:00:00.000Z"`
- **Purpose:** When playbook was drafted or promoted

### domain
- **Type:** string
- **Example:** `"cooking"`
- **Purpose:** Task domain (for filtering/organization)

### taskType
- **Type:** string
- **Example:** `"compare"`, `"howto"`, `"substitute"`
- **Purpose:** Type of task (for filtering/organization)

### trigger.patternKey (required)
- **Type:** string
- **Format:** `{domain}|{taskType}|{intentHash}`
- **Example:** `"cooking|compare|3c090840a1339477"`
- **Purpose:** **Matching key** - must match normalized query pattern

### trigger.description
- **Type:** string
- **Purpose:** Human-readable description of when this playbook applies

### trigger.minSuccessCount
- **Type:** number
- **Example:** `3`
- **Purpose:** How many successful runs triggered drafting

### trigger.inputsExample
- **Type:** object
- **Purpose:** Example input that would match this playbook

### steps
- **Type:** array of objects
- **Format:** `[{ name, notes }, ...]`
- **Purpose:** Documented workflow steps (not executable)

### validation
- **Type:** object
- **Fields:** `precision`, `successCriteria`
- **Purpose:** How to validate successful execution

### responseHints.prefix
- **Type:** string (optional)
- **Example:** `"[Using proven recipe comparison playbook] "`
- **Purpose:** Prefix added to response when playbook matches
- **Note:** Kernel decides whether to use this

### notes
- **Type:** object
- **Purpose:** Human notes about promotion rationale, etc.

---

## Promotion Workflow

### 1. Check Drafts Directory
```bash
ls playbooks/drafts/
# Look for recently created playbooks
```

### 2. Review Draft Content
```bash
cat playbooks/drafts/pb_cooking_compare_*.json
```

**Review Checklist:**
- [ ] Pattern key makes sense for the task
- [ ] Steps are accurate and complete
- [ ] Success criteria are reasonable
- [ ] No sensitive data in examples
- [ ] Domain/taskType correct

### 3. Promote to Active
```bash
# Copy to active/ with simpler name
cp playbooks/drafts/pb_cooking_compare_3c090840a1339477_*.json \
   playbooks/active/pb_cooking_compare_brownies.json
```

### 4. (Optional) Add Response Hint
```json
{
  "responseHints": {
    "prefix": "[Using proven recipe comparison playbook] "
  }
}
```

### 5. Verify MetaLoop Loads It
```bash
# Run any ALIVE command
node bin/alive.js run "test query"

# Check that playbook is loaded (if debug enabled)
METALOOP_DEBUG=1 node bin/alive.js run "compare recipes for brownies"
# Should see: 📗 MetaLoop: Active playbook "..." matched
```

---

## Pattern Key Matching

### How Matching Works

**Query:** `"compare recipes for brownies"`

**Normalization:**
1. Text normalized: `"compare recipes for brownies"`
2. TaskType mapped: `"compare"`
3. Domain classified: `"cooking"`
4. Entities extracted: `["brownies", "compare", "recipes"]`
5. Hash generated: `"3c090840a1339477"`

**Pattern Key:** `"cooking|compare|3c090840a1339477"`

**Match Check:**
```javascript
const activePlaybook = meta._findActivePlaybook(patternKey);
if (activePlaybook) {
  // Playbook matched!
}
```

### Variations That Match

All these queries produce the **same pattern key**:
- `"compare recipes for brownies"`
- `"which brownie recipe is better"`
- `"brownies recipe comparison"`
- `"Compare recipes for brownies!!!"`  (punctuation removed)

### Variations That Don't Match

These produce **different pattern keys**:
- `"how to make brownies"` (different taskType: `howto`)
- `"substitute butter in brownies"` (different taskType: `substitute`)
- `"compare cookie recipes"` (different entity: `cookies` vs `brownies`)

---

## Usage Tracking

### What's Tracked

For each active playbook, MetaLoop tracks:

```javascript
{
  activeUsedCountById: {
    "pb_cooking_compare_3c090840a1339477": 69  // Total uses
  },
  
  firstUsedAtById: {
    "pb_cooking_compare_3c090840a1339477": "2026-01-08T22:00:00.000Z"
  },
  
  lastUsedAtById: {
    "pb_cooking_compare_3c090840a1339477": "2026-01-09T04:11:16.518Z"
  },
  
  usageHistoryById: {
    "pb_cooking_compare_3c090840a1339477": [
      "2026-01-09T04:06:19.932Z",
      "2026-01-09T04:06:19.948Z",
      // ... last 100 timestamps
    ]
  }
}
```

### Getting Statistics

```javascript
const stats = meta.getPlaybookStats('pb_cooking_compare_3c090840a1339477');
// {
//   playbookId: "pb_cooking_compare_3c090840a1339477",
//   useCount: 69,
//   firstUsedAt: "2026-01-08T22:00:00.000Z",
//   lastUsedAt: "2026-01-09T04:11:16.518Z",
//   daysSinceFirstUse: 1,
//   daysSinceLastUse: 0,
//   avgIntervalMs: 127000,
//   avgIntervalHours: 0.04,
//   historyLength: 100
// }
```

---

## Staleness Detection

### What is Staleness?

A playbook is "stale" if it hasn't been used for more than `stalenessThresholdDays` (default: 30).

### Checking Staleness

```javascript
const isStale = meta.isPlaybookStale('pb_cooking_compare_3c090840a1339477');
// false if used recently, true if unused >30 days
```

### What Staleness Does NOT Do

❌ **Does NOT** prevent playbook matching  
❌ **Does NOT** delete playbooks  
❌ **Does NOT** alter behavior  

**It only:** Provides metadata for human decision-making.

### Handling Stale Playbooks

**Option 1: Keep It**
- Playbook might be seasonal or infrequent
- No action needed

**Option 2: Archive It**
```bash
mv playbooks/active/pb_stale_example.json playbooks/archive/
```

**Option 3: Delete It**
```bash
rm playbooks/active/pb_stale_example.json
```

---

## Response Hints (Task 1)

### Purpose
Allow playbooks to optionally provide hints that kernels can use to modify responses.

### responseHints.prefix

**Schema:**
```json
{
  "responseHints": {
    "prefix": "[Using proven recipe comparison playbook] "
  }
}
```

**Usage:**
```javascript
const review = meta.recordAndReview(run);

if (review.playbookMatch && review.playbookMatch.responsePrefix) {
  const prefix = review.playbookMatch.responsePrefix;
  response = prefix + response;  // Kernel's decision to use it
}
```

**Determinism:** Same query → same prefix (or null)

---

## Best Practices

### 1. Promotion

**DO:**
- ✅ Review drafts before promoting
- ✅ Use descriptive filenames
- ✅ Add human-readable notes
- ✅ Test pattern matching works
- ✅ Verify no sensitive data

**DON'T:**
- ❌ Promote untested playbooks
- ❌ Include secrets or API keys
- ❌ Modify pattern keys manually
- ❌ Create playbooks by hand (without MetaLoop)

### 2. Naming

**Drafts (Auto-generated):**
- Format: `pb_{id}_{timestamp}.json`
- Example: `pb_cooking_compare_3c090840a1339477_1767931587899.json`

**Active (Human-named):**
- Format: `pb_{domain}_{descriptive_name}.json`
- Example: `pb_cooking_compare_brownies.json`
- Keep it readable and descriptive

### 3. Maintenance

**Monthly:**
- Review stale playbooks (`isPlaybookStale()`)
- Archive or delete unused playbooks
- Check usage statistics

**Quarterly:**
- Review all active playbooks
- Update validation criteria if needed
- Check for duplicate patterns

---

## Troubleshooting

### Playbook Not Matching

**Symptoms:** Query seems like it should match but doesn't.

**Debug Steps:**
1. Enable debug mode:
   ```bash
   METALOOP_DEBUG=1 node bin/alive.js run "your query"
   ```

2. Check pattern key manually:
   ```javascript
   const meta = new MetaLoop();
   const run = { domain: 'cooking', taskType: 'compare', inputs: { querySummary: 'your query' }, ... };
   console.log(meta._patternKey(run));
   ```

3. Compare with playbook's `trigger.patternKey`

4. Check normalization:
   ```javascript
   const normalized = meta._normalizeIntent(run);
   console.log(normalized);
   ```

### Playbook Not Loading

**Symptoms:** Playbook file exists but not being used.

**Debug Steps:**
1. Check file is in `playbooks/active/`
2. Verify JSON is valid: `cat playbooks/active/pb_*.json | python -m json.tool`
3. Check required fields present: `id`, `trigger.patternKey`
4. Restart MetaLoop (playbooks loaded at construction)

### Too Many Drafts

**Symptoms:** `playbooks/drafts/` filling up with duplicates.

**Cause:** Same pattern being re-drafted.

**Solution:**
- Promote successful playbooks to active/
- MetaLoop tracks `draftedKeys` to prevent re-drafting
- Delete obsolete drafts manually

---

## Security Considerations

### What NOT to Include

❌ **API Keys** - Never in examples or notes  
❌ **Passwords** - Never in any field  
❌ **Personal Data** - Anonymize examples  
❌ **Secrets** - No sensitive configuration  

### What's Safe

✅ **Public data** - Recipe names, general queries  
✅ **Pattern descriptions** - "Compare recipes"  
✅ **Step names** - "Orient", "Triage", etc.  
✅ **Statistics** - Usage counts, timestamps  

---

## Performance

### Load Time
- Loading 100 playbooks: ~50ms
- Pattern matching: ~0.1ms per check

### Memory
- ~1KB per playbook file
- ~800 bytes per playbook in tracking (100 timestamps)

### Disk Usage
- Drafts: ~1KB per file × N drafts
- Active: ~1KB per file × N active
- State: ~10KB for tracking data

---

## Future Enhancements

1. **Playbook versioning** - Track changes over time
2. **Playbook inheritance** - Base playbooks with variants
3. **Conditional steps** - Different steps based on context
4. **Playbook composition** - Chain multiple playbooks
5. **Automatic archival** - Move stale playbooks after threshold

---

## References

- `docs/META_LOOP.md` - MetaLoop system documentation
- `docs/CHECKPOINT-TASK1-response-prefix.md` - Response hints
- `docs/CHECKPOINT-TASK3-playbook-decay.md` - Staleness detection
- `meta/MetaLoop.js` - Implementation
