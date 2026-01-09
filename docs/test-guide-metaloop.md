# MetaLoop v0 - Test Guide & Stability Verification

## Improvements Made

### 1. **Hysteresis + Minimum Samples**
- No priority changes until ≥3 observations
- Requires 3 consecutive low-value observations before reducing priority
- Prevents single bad run from affecting policy

### 2. **EMA (Exponential Moving Average) for Value Score**
- `valueScore = 0.3 * currentValue + 0.7 * previousScore`
- Smooth transitions, no sharp jumps
- New steps start optimistic (1.0) and adjust gradually

### 3. **Relative Budget Pressure**
```javascript
budgetPressure = remainingBudgetMs / estimatedStepCostMs
budgetTight = budgetPressure < 1.0
```
- Dynamic calculation based on actual step costs
- Learns step costs via EMA: `avgCostMs = 0.3 * newCost + 0.7 * oldCost`

### 4. **Stability Guarantees**
- Priority only reduces if BOTH:
  - `consecutiveLowValue >= 3` (stays below threshold)
  - `consecutiveNonChanges >= 3` (actually unused)
- Fail-safe: policy read errors don't skip steps

---

## Test Sequence: 4-Run Proof

### Run 1: Baseline (detect_bloat runs normally)
```bash
ALIVE> compare recipes for pasta
```

**Expected**:
- All steps execute including `detect_bloat`
- MetaLoop tracks: `detect_bloat` totalUses=1, valueScore=1.0 (optimistic start)

### Run 2: Build evidence
```bash
ALIVE> compare recipes for pizza
```

**Expected**:
- `detect_bloat` runs again
- MetaLoop tracks: `detect_bloat` totalUses=2, valueScore=0.85 (slightly lower via EMA)

### Run 3: Trigger policy change
```bash
ALIVE> compare recipes for spaghetti
```

**Expected**:
- `detect_bloat` runs (3rd observation needed)
- After run, MetaLoop detects: consecutiveLowValue=3, consecutiveNonChanges=3
- Console shows: `📉 MetaLoop: Reduced priority for "detect_bloat" from 5 to 2`
- File updated: `config/meta-config.json`

### Run 4: Policy-influenced skip
```bash
ALIVE> compare recipes for soup
```

**Expected**:
- Stakes: low (recipe comparison)
- Budget pressure calculated: remainingBudget / detect_bloat.avgCostMs
- Executor checks policy: priority=2, valueScore<0.3, budgetTight OR lowStakes
- Console shows: `⏭️ detect_bloat SKIPPED (MetaLoop policy: low priority + tight budget/low stakes)`

### Run 5: High-stakes override
```bash
ALIVE> compare recipes for food safety chicken preparation
```

**Expected**:
- Stakes: high (contains "safety")
- Policy says skip, BUT executor overrides: `if (isHighStakes) return false`
- Console shows: `✓ detect_bloat: XXms` (runs despite policy)

---

## Expected meta-config.json After Run 3

```json
{
  "stepValues": {
    "detect_bloat": {
      "totalUses": 3,
      "changedOutcome": 0,
      "consecutiveNonChanges": 3,
      "consecutiveLowValue": 3,
      "priority": 2,
      "lastUsed": 1704729600000,
      "valueScore": 0.213,
      "emaAlpha": 0.3,
      "history": [
        { "timestamp": 1704729400000, "didChangeOutcome": false },
        { "timestamp": 1704729500000, "didChangeOutcome": false },
        { "timestamp": 1704729600000, "didChangeOutcome": false }
      ],
      "avgCostMs": 85,
      "priorityReductions": 1,
      "lastReduction": 1704729600000,
      "reductionReason": "3 consecutive times did not change outcome"
    }
  },
  "thresholds": {
    "lowValueTrigger": 3,
    "minValueScore": 0.3,
    "priorityReduction": 3
  },
  "lastUpdated": 1704729600000
}
```

**Key Fields**:
- `priority`: 2 (reduced from 5)
- `valueScore`: 0.213 (EMA-smoothed, below 0.3 threshold)
- `consecutiveLowValue`: 3 (triggered reduction)
- `avgCostMs`: 85 (learned from actual runs)

---

## Stability Verification (10 runs)

### Test Scenario: Repeat same low-stakes task 10 times

```bash
ALIVE> compare recipes for pasta
ALIVE> compare recipes for pizza
ALIVE> compare recipes for lasagna
ALIVE> compare recipes for carbonara
ALIVE> compare recipes for bolognese
ALIVE> compare recipes for marinara
ALIVE> compare recipes for alfredo
ALIVE> compare recipes for pesto
ALIVE> compare recipes for arrabiata
ALIVE> compare recipes for primavera
```

### What to Verify:

#### 1. **No Thrashing** (priority doesn't flip-flop)
- Check `config/meta-config.json` after each run
- Priority should move: 5 → 2 (after run 3)
- Then STAY at 2 (no oscillation)

#### 2. **Stable Value Score** (EMA prevents jumps)
- Run 1: valueScore ≈ 1.0 (start optimistic)
- Run 2: valueScore ≈ 0.7 (one bad value)
- Run 3: valueScore ≈ 0.49 (two bad values)
- Runs 4-10: valueScore ≈ 0.15-0.25 (stable low)

#### 3. **Consistent Skip Behavior** (Runs 4-10)
- If stakes=low: detect_bloat should SKIP
- If stakes=high: detect_bloat should RUN

#### 4. **Cost Estimate Convergence**
- `avgCostMs` starts at 100 (default)
- Converges to actual average (e.g., 85ms)
- Should stabilize by run 5

---

## How to Run Tests

### Option A: Automated Test Script
```bash
# Create test script (future enhancement)
npm run test:metaloop
```

### Option B: Manual CLI Testing
```bash
# Start CLI
npm start

# Run sequence manually
ALIVE> compare recipes for pasta
ALIVE> compare recipes for pizza
ALIVE> compare recipes for spaghetti
# Check for priority reduction message

ALIVE> compare recipes for soup
# Look for SKIPPED message

# Check results
ALIVE> debug meta

# Exit and examine files
ALIVE> quit

# Check generated files
cat config/meta-config.json
cat logs/actions.jsonl | tail -n 4
```

---

## Success Criteria

✅ **Run 3**: Priority reduction occurs  
✅ **Run 4**: Step is skipped (low stakes)  
✅ **Run 5**: Step runs (high stakes override)  
✅ **Runs 4-10**: No thrashing, stable valueScore  
✅ **meta-config.json**: Shows EMA values, cost estimates, stable priority  

---

## Troubleshooting

### If priority doesn't reduce after 3 runs:
- Check: `consecutiveNonChanges >= 3`
- Check: `consecutiveLowValue >= 3`
- Check: `valueScore < 0.3`
- Check: `totalUses >= 3` (hysteresis minimum)

### If step doesn't skip on Run 4:
- Check: `priority <= 2` (was reduced)
- Check: `valueScore < 0.3`
- Check: `budgetTight OR stakes=low`
- Check: `stakes !== 'high'` (no override)

### If value score oscillates:
- EMA alpha = 0.3 should smooth this
- Check history in meta-config.json
- Verify `didChangeOutcome` logic is consistent

---

## Next Steps

1. Run the 4-sequence test manually
2. Capture real console output
3. Save meta-config.json snapshot
4. Run 10-sequence stability test
5. Confirm no thrashing
6. Document actual results

**Status**: Implementation complete, ready for testing
