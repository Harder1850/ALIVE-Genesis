// tests/test-stress.js
// Stress test: 100 rapid runs to verify no corruption

const { MetaLoop } = require('../meta/MetaLoop');
const fs = require('fs');
const path = require('path');

console.log('🧪 MetaLoop Stress Test - 100 Rapid Runs\n');

const meta = new MetaLoop();

// Helper to create test run
function createTestRun(querySummary, taskType = 'compare', runId = 0) {
  return {
    domain: 'cooking',
    taskType,
    assessment: {
      urgency: 'LATER',
      stakes: 'low',
      difficulty: 'moderate',
      precision: 'flexible'
    },
    metrics: {
      timeMs: 50 + runId, // Unique timing to help track
      stepCount: 1,
      lookupUsed: false,
      lookupChangedOutcome: false,
      resetTriggered: false
    },
    outcome: {
      status: 'success',
      userCorrectionsCount: 0
    },
    inputs: {
      querySummary
    }
  };
}

console.log('Setup: Recording initial state...');
const initialRunlogLines = fs.existsSync(meta.runlogPath) 
  ? fs.readFileSync(meta.runlogPath, 'utf8').trim().split('\n').filter(Boolean).length
  : 0;

const initialState = JSON.parse(JSON.stringify(meta.state));
const initialActiveCount = meta.state.activeUsedCountById['pb_cooking_compare_3c090840a1339477'] || 0;

console.log(`  Initial runlog lines: ${initialRunlogLines}`);
console.log(`  Initial active playbook usage: ${initialActiveCount}`);
console.log();

// TEST 1: 100 sequential rapid runs
console.log('TEST 1: 100 Sequential Rapid Runs');
console.log('═'.repeat(60));

const startTime = Date.now();
let matchCount = 0;
let nonMatchCount = 0;

for (let i = 0; i < 100; i++) {
  if (i % 2 === 0) {
    // Even runs: match the active playbook
    meta.recordAndReview(createTestRun("compare recipes for brownies", "compare", i));
    matchCount++;
  } else {
    // Odd runs: non-matching queries
    meta.recordAndReview(createTestRun("how to make pasta", "howto", i));
    nonMatchCount++;
  }
  
  // Show progress every 20 runs
  if ((i + 1) % 20 === 0) {
    process.stdout.write(`  Progress: ${i + 1}/100 runs completed\n`);
  }
}

const elapsed = Date.now() - startTime;
console.log(`✅ Completed 100 runs in ${elapsed}ms (${(elapsed/100).toFixed(2)}ms avg per run)`);
console.log();

// Verify meta_state.json is valid JSON
console.log('TEST 2: Verify meta_state.json integrity');
console.log('═'.repeat(60));

let stateValid = false;
let finalState = null;

try {
  const stateContent = fs.readFileSync(meta.metaStatePath, 'utf8');
  finalState = JSON.parse(stateContent);
  stateValid = true;
  console.log('✅ meta_state.json is valid JSON');
} catch (err) {
  console.log(`❌ meta_state.json is CORRUPTED: ${err.message}`);
}
console.log();

// Verify runlog.jsonl integrity
console.log('TEST 3: Verify runlog.jsonl integrity');
console.log('═'.repeat(60));

let runlogValid = false;
let finalRunlogLines = 0;
let validJsonLines = 0;

try {
  const runlogContent = fs.readFileSync(meta.runlogPath, 'utf8');
  const lines = runlogContent.trim().split('\n').filter(Boolean);
  finalRunlogLines = lines.length;
  
  // Verify each line is valid JSON
  for (const line of lines) {
    try {
      JSON.parse(line);
      validJsonLines++;
    } catch {
      // Invalid line
    }
  }
  
  runlogValid = validJsonLines === finalRunlogLines;
  
  if (runlogValid) {
    console.log(`✅ runlog.jsonl is valid (${finalRunlogLines} lines, all parseable)`);
  } else {
    console.log(`❌ runlog.jsonl has ${finalRunlogLines - validJsonLines} corrupted lines`);
  }
  
  console.log(`   Added ${finalRunlogLines - initialRunlogLines} new lines (expected: 100)`);
} catch (err) {
  console.log(`❌ runlog.jsonl is CORRUPTED: ${err.message}`);
}
console.log();

// Verify active playbook usage count
console.log('TEST 4: Verify active playbook usage tracking');
console.log('═'.repeat(60));

const finalActiveCount = finalState?.activeUsedCountById['pb_cooking_compare_3c090840a1339477'] || 0;
const expectedCount = initialActiveCount + matchCount;
const countCorrect = finalActiveCount === expectedCount;

console.log(`  Initial count: ${initialActiveCount}`);
console.log(`  Matching runs: ${matchCount}`);
console.log(`  Expected final: ${expectedCount}`);
console.log(`  Actual final: ${finalActiveCount}`);

if (countCorrect) {
  console.log('✅ Usage count is CORRECT');
} else {
  console.log(`❌ Usage count MISMATCH (off by ${Math.abs(finalActiveCount - expectedCount)})`);
}
console.log();

// Verify no duplicate drafts created
console.log('TEST 5: Verify no duplicate drafts');
console.log('═'.repeat(60));

const draftCount = Object.keys(finalState?.draftedKeys || {}).length;
const initialDraftCount = Object.keys(initialState.draftedKeys).length;
const newDrafts = draftCount - initialDraftCount;

console.log(`  Initial drafts: ${initialDraftCount}`);
console.log(`  Final drafts: ${draftCount}`);
console.log(`  New drafts created: ${newDrafts}`);

if (newDrafts <= 2) { // Allow at most 2 new drafts during stress test
  console.log('✅ No excessive draft duplication');
} else {
  console.log(`❌ Too many drafts created: ${newDrafts}`);
}
console.log();

// Summary
console.log('═'.repeat(60));
console.log('SUMMARY');
console.log('═'.repeat(60));

const allTests = [
  { name: '100 sequential runs completed', pass: true },
  { name: 'meta_state.json integrity', pass: stateValid },
  { name: 'runlog.jsonl integrity', pass: runlogValid },
  { name: 'Runlog line count correct', pass: (finalRunlogLines - initialRunlogLines) === 100 },
  { name: 'Active playbook usage count correct', pass: countCorrect },
  { name: 'No excessive draft duplication', pass: newDrafts <= 2 }
];

const passed = allTests.filter(t => t.pass).length;
const total = allTests.length;

allTests.forEach(test => {
  console.log(`${test.pass ? '✅' : '❌'} ${test.name}`);
});

console.log();
console.log(`Tests Passed: ${passed}/${total}`);
console.log(`Performance: ${(elapsed/100).toFixed(2)}ms avg per run`);

if (passed === total) {
  console.log('\n🎉 STRESS TEST PASSED - No corruption detected!\n');
  process.exit(0);
} else {
  console.log('\n❌ STRESS TEST FAILED - Corruption or count mismatch detected\n');
  process.exit(1);
}
