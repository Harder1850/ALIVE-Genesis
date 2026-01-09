// tests/test-playbook-decay.js
// Test playbook staleness detection (observer only)

const { MetaLoop } = require('../meta/MetaLoop');
const fs = require('fs');

console.log('🧪 Testing Playbook Decay/Staleness Detection\n');

// Helper to create test run
function createTestRun(querySummary, taskType = 'compare') {
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
      timeMs: 50,
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

console.log('TEST 1: Freshly used playbook is NOT stale');
console.log('═'.repeat(60));

const meta1 = new MetaLoop();
meta1.recordAndReview(createTestRun("compare recipes for brownies"));

const isStale1 = meta1.isPlaybookStale('pb_cooking_compare_3c090840a1339477');
console.log(`Playbook just used, isStale: ${isStale1}`);

if (!isStale1) {
  console.log('✅ TEST 1 PASSED: Fresh playbook not stale');
} else {
  console.log('❌ TEST 1 FAILED: Fresh playbook marked as stale');
}
console.log();

console.log('TEST 2: Playbook with old lastUsedAt IS stale');
console.log('═'.repeat(60));

const meta2 = new MetaLoop();
// Simulate playbook used 40 days ago
const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
meta2.state.activeUsedCountById['pb_cooking_compare_3c090840a1339477'] = 10;
meta2.state.firstUsedAtById['pb_cooking_compare_3c090840a1339477'] = fortyDaysAgo;
meta2.state.lastUsedAtById['pb_cooking_compare_3c090840a1339477'] = fortyDaysAgo;

const isStale2 = meta2.isPlaybookStale('pb_cooking_compare_3c090840a1339477');
console.log(`Playbook last used 40 days ago, isStale: ${isStale2}`);
console.log(`  Threshold: ${meta2.stalenessThresholdDays} days`);

if (isStale2) {
  console.log('✅ TEST 2 PASSED: Old playbook marked as stale');
} else {
  console.log('❌ TEST 2 FAILED: Old playbook not detected as stale');
}
console.log();

console.log('TEST 3: Playbook at exact threshold is NOT stale');
console.log('═'.repeat(60));

const meta3 = new MetaLoop();
// Simulate playbook used exactly 30 days ago (threshold)
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
meta3.state.activeUsedCountById['pb_cooking_compare_3c090840a1339477'] = 10;
meta3.state.firstUsedAtById['pb_cooking_compare_3c090840a1339477'] = thirtyDaysAgo;
meta3.state.lastUsedAtById['pb_cooking_compare_3c090840a1339477'] = thirtyDaysAgo;

const isStale3 = meta3.isPlaybookStale('pb_cooking_compare_3c090840a1339477');
console.log(`Playbook last used exactly 30 days ago, isStale: ${isStale3}`);

if (!isStale3) {
  console.log('✅ TEST 3 PASSED: Threshold boundary correct (not stale at exactly 30 days)');
} else {
  console.log('❌ TEST 3 FAILED: Threshold boundary incorrect');
}
console.log();

console.log('TEST 4: Configurable staleness threshold');
console.log('═'.repeat(60));

const meta4 = new MetaLoop({ stalenessThresholdDays: 7 });
// Simulate playbook used 10 days ago
const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
meta4.state.activeUsedCountById['pb_cooking_compare_3c090840a1339477'] = 10;
meta4.state.firstUsedAtById['pb_cooking_compare_3c090840a1339477'] = tenDaysAgo;
meta4.state.lastUsedAtById['pb_cooking_compare_3c090840a1339477'] = tenDaysAgo;

const isStale4 = meta4.isPlaybookStale('pb_cooking_compare_3c090840a1339477');
console.log(`Custom threshold: ${meta4.stalenessThresholdDays} days`);
console.log(`Playbook last used 10 days ago, isStale: ${isStale4}`);

if (isStale4) {
  console.log('✅ TEST 4 PASSED: Custom threshold works');
} else {
  console.log('❌ TEST 4 FAILED: Custom threshold not respected');
}
console.log();

console.log('TEST 5: Non-existent playbook is NOT stale');
console.log('═'.repeat(60));

const meta5 = new MetaLoop();
const isStale5 = meta5.isPlaybookStale('pb_nonexistent_12345');
console.log(`Non-existent playbook, isStale: ${isStale5}`);

if (!isStale5) {
  console.log('✅ TEST 5 PASSED: Non-existent playbook returns false');
} else {
  console.log('❌ TEST 5 FAILED: Non-existent playbook should return false');
}
console.log();

console.log('TEST 6: Staleness is observer-only (no behavior changes)');
console.log('═'.repeat(60));

const meta6 = new MetaLoop();
// Create stale playbook
const fiftyDaysAgo = new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString();
meta6.state.activeUsedCountById['pb_cooking_compare_3c090840a1339477'] = 10;
meta6.state.firstUsedAtById['pb_cooking_compare_3c090840a1339477'] = fiftyDaysAgo;
meta6.state.lastUsedAtById['pb_cooking_compare_3c090840a1339477'] = fiftyDaysAgo;

const isStaleBeforeUse = meta6.isPlaybookStale('pb_cooking_compare_3c090840a1339477');
console.log(`Before check: isStale = ${isStaleBeforeUse}`);

// Use it anyway (matching should still work)
const result = meta6.recordAndReview(createTestRun("compare recipes for brownies"));
const matched = result.playbookMatch !== null;

const isStaleAfterUse = meta6.isPlaybookStale('pb_cooking_compare_3c090840a1339477');
console.log(`After use: matched = ${matched}, isStale = ${isStaleAfterUse}`);

if (matched && !isStaleAfterUse) {
  console.log('✅ TEST 6 PASSED: Staleness is observer-only, playbook still matches and updates');
} else {
  console.log('❌ TEST 6 FAILED: Staleness should not affect matching');
}
console.log();

// Summary
console.log('═'.repeat(60));
console.log('SUMMARY');
console.log('═'.repeat(60));

const allTests = [
  { name: 'Freshly used playbook not stale', pass: !isStale1 },
  { name: 'Old playbook marked as stale', pass: isStale2 },
  { name: 'Threshold boundary correct', pass: !isStale3 },
  { name: 'Custom threshold works', pass: isStale4 },
  { name: 'Non-existent playbook returns false', pass: !isStale5 },
  { name: 'Staleness is observer-only', pass: matched && !isStaleAfterUse }
];

const passed = allTests.filter(t => t.pass).length;
const total = allTests.length;

allTests.forEach(test => {
  console.log(`${test.pass ? '✅' : '❌'} ${test.name}`);
});

console.log();
console.log(`Tests Passed: ${passed}/${total}`);

if (passed === total) {
  console.log('\n🎉 ALL TESTS PASSED\n');
  process.exit(0);
} else {
  console.log('\n❌ SOME TESTS FAILED\n');
  process.exit(1);
}
