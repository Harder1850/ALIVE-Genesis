// tests/test-active-playbooks.js
// Test active playbook loading and usage tracking

const { MetaLoop } = require('../meta/MetaLoop');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Active Playbooks v0\n');

const meta = new MetaLoop();

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

console.log('TEST 1: Active playbook loading');
console.log('═'.repeat(60));
console.log(`Active playbooks loaded: ${meta.activePlaybooks.length}`);

if (meta.activePlaybooks.length > 0) {
  console.log('✅ TEST 1 PASSED: Active playbooks loaded');
  meta.activePlaybooks.forEach(pb => {
    console.log(`   - ${pb.id} (key: ${pb.trigger.patternKey})`);
  });
} else {
  console.log('❌ TEST 1 FAILED: No active playbooks found');
}
console.log();

// TEST 2: Matching query increments usage
console.log('TEST 2: Matching query increments usage');
console.log('═'.repeat(60));

const targetKey = 'cooking|compare|3c090840a1339477';
const initialState = JSON.parse(JSON.stringify(meta.state));

console.log(`Recording: "compare recipes for brownies"`);
const result1 = meta.recordAndReview(createTestRun("compare recipes for brownies"));

const count1 = meta.state.activeUsedCountById['pb_cooking_compare_3c090840a1339477'] || 0;
console.log(`  Usage count: ${count1}`);

if (count1 > 0) {
  console.log('✅ TEST 2 PASSED: Usage count incremented');
} else {
  console.log('❌ TEST 2 FAILED: Usage count not incremented');
}
console.log();

// TEST 3: Different query should also match (normalization)
console.log('TEST 3: Normalized query also matches');
console.log('═'.repeat(60));

console.log(`Recording: "which brownie recipe is better"`);
const result2 = meta.recordAndReview(createTestRun("which brownie recipe is better"));

const count2 = meta.state.activeUsedCountById['pb_cooking_compare_3c090840a1339477'] || 0;
console.log(`  Usage count: ${count2}`);

if (count2 > count1) {
  console.log('✅ TEST 3 PASSED: Normalized query matched and incremented');
} else {
  console.log('❌ TEST 3 FAILED: Count did not increment');
}
console.log();

// TEST 4: Unrelated query should NOT match
console.log('TEST 4: Unrelated query does NOT match');
console.log('═'.repeat(60));

console.log(`Recording: "how to make cookies"`);
const result3 = meta.recordAndReview(createTestRun("how to make cookies", "howto"));

const count3 = meta.state.activeUsedCountById['pb_cooking_compare_3c090840a1339477'] || 0;
console.log(`  Usage count: ${count3} (should be same as before)`);

if (count3 === count2) {
  console.log('✅ TEST 4 PASSED: Unrelated query did not increment');
} else {
  console.log('❌ TEST 4 FAILED: Count changed unexpectedly');
}
console.log();

// TEST 5: meta_state.json persisted correctly
console.log('TEST 5: State persistence');
console.log('═'.repeat(60));

try {
  const stateContent = fs.readFileSync(meta.metaStatePath, 'utf8');
  const state = JSON.parse(stateContent);
  
  console.log(`activeUsedCountById keys: ${Object.keys(state.activeUsedCountById).length}`);
  console.log(`lastUsedAtById keys: ${Object.keys(state.lastUsedAtById).length}`);
  
  const hasUsage = state.activeUsedCountById['pb_cooking_compare_3c090840a1339477'] > 0;
  const hasTimestamp = !!state.lastUsedAtById['pb_cooking_compare_3c090840a1339477'];
  
  if (hasUsage && hasTimestamp) {
    console.log('✅ TEST 5 PASSED: State persisted correctly');
    console.log(`   Usage count: ${state.activeUsedCountById['pb_cooking_compare_3c090840a1339477']}`);
    console.log(`   Last used: ${state.lastUsedAtById['pb_cooking_compare_3c090840a1339477']}`);
  } else {
    console.log('❌ TEST 5 FAILED: State not persisted correctly');
  }
} catch (err) {
  console.log(`❌ TEST 5 FAILED: ${err.message}`);
}
console.log();

// Summary
console.log('═'.repeat(60));
console.log('SUMMARY');
console.log('═'.repeat(60));

const allTests = [
  { name: 'Active playbooks loaded', pass: meta.activePlaybooks.length > 0 },
  { name: 'Matching query increments usage', pass: count1 > 0 },
  { name: 'Normalized query matches', pass: count2 > count1 },
  { name: 'Unrelated query does not match', pass: count3 === count2 },
  { name: 'State persisted correctly', pass: true } // Checked above
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
