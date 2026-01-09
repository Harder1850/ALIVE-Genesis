// tests/test-response-prefix.js
// Test that response prefix from active playbooks is properly returned

const { MetaLoop } = require('../meta/MetaLoop');

console.log('🧪 Testing Response Prefix from Active Playbooks\n');

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

console.log('TEST 1: Response prefix returned when playbook matches');
console.log('═'.repeat(60));

const result1 = meta.recordAndReview(createTestRun("compare recipes for brownies"));

console.log(`Query: "compare recipes for brownies"`);
console.log(`Playbook matched: ${result1.playbookMatch !== null && result1.playbookMatch !== undefined}`);

if (result1.playbookMatch) {
  console.log(`  Playbook ID: ${result1.playbookMatch.playbookId}`);
  console.log(`  Response prefix: "${result1.playbookMatch.responsePrefix}"`);
  
  const expectedPrefix = "[Using proven recipe comparison playbook] ";
  if (result1.playbookMatch.responsePrefix === expectedPrefix) {
    console.log('✅ TEST 1 PASSED: Correct response prefix returned');
  } else {
    console.log(`❌ TEST 1 FAILED: Expected "${expectedPrefix}", got "${result1.playbookMatch.responsePrefix}"`);
  }
} else {
  console.log('❌ TEST 1 FAILED: No playbook match found');
}
console.log();

console.log('TEST 2: No prefix when playbook has no responseHints');
console.log('═'.repeat(60));

const result2 = meta.recordAndReview(createTestRun("how to make pasta", "howto"));

console.log(`Query: "how to make pasta"`);
console.log(`Playbook matched: ${result2.playbookMatch !== null && result2.playbookMatch !== undefined}`);

if (result2.playbookMatch && result2.playbookMatch.responsePrefix) {
  console.log(`❌ TEST 2 FAILED: Unexpected prefix: "${result2.playbookMatch.responsePrefix}"`);
} else {
  console.log('✅ TEST 2 PASSED: No unexpected prefix returned');
}
console.log();

console.log('TEST 3: Prefix is deterministic (same query = same prefix)');
console.log('═'.repeat(60));

const result3a = meta.recordAndReview(createTestRun("compare recipes for brownies"));
const result3b = meta.recordAndReview(createTestRun("compare recipes for brownies"));

const prefix3a = result3a.playbookMatch?.responsePrefix || null;
const prefix3b = result3b.playbookMatch?.responsePrefix || null;

console.log(`First call prefix: "${prefix3a}"`);
console.log(`Second call prefix: "${prefix3b}"`);

if (prefix3a === prefix3b && prefix3a !== null) {
  console.log('✅ TEST 3 PASSED: Prefix is deterministic');
} else {
  console.log('❌ TEST 3 FAILED: Prefix is not consistent');
}
console.log();

console.log('TEST 4: Normalized queries get same prefix');
console.log('═'.repeat(60));

const result4a = meta.recordAndReview(createTestRun("compare recipes for brownies"));
const result4b = meta.recordAndReview(createTestRun("which brownie recipe is better"));

const prefix4a = result4a.playbookMatch?.responsePrefix || null;
const prefix4b = result4b.playbookMatch?.responsePrefix || null;

console.log(`Query 1: "compare recipes for brownies" → "${prefix4a}"`);
console.log(`Query 2: "which brownie recipe is better" → "${prefix4b}"`);

if (prefix4a === prefix4b && prefix4a !== null) {
  console.log('✅ TEST 4 PASSED: Normalized queries match same playbook');
} else {
  console.log('❌ TEST 4 FAILED: Normalized queries should match same playbook');
}
console.log();

// Summary
console.log('═'.repeat(60));
console.log('SUMMARY');
console.log('═'.repeat(60));

const allTests = [
  { name: 'Response prefix returned when playbook matches', pass: result1.playbookMatch?.responsePrefix === "[Using proven recipe comparison playbook] " },
  { name: 'No prefix when playbook lacks responseHints', pass: !result2.playbookMatch || !result2.playbookMatch.responsePrefix },
  { name: 'Prefix is deterministic', pass: prefix3a === prefix3b && prefix3a !== null },
  { name: 'Normalized queries get same prefix', pass: prefix4a === prefix4b && prefix4a !== null }
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
