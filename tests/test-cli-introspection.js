// tests/test-cli-introspection.js
// Test CLI introspection helpers (TASK 1 - 48h Roadmap)

const { MetaLoop } = require('../meta/MetaLoop');

console.log('🧪 Testing CLI Introspection Helpers\n');

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

console.log('TEST 1: getAllActivePlaybooksWithStats() returns array');
console.log('═'.repeat(60));

const meta1 = new MetaLoop();
const allActive = meta1.getAllActivePlaybooksWithStats();

console.log(`Active playbooks count: ${allActive.length}`);
console.log(`Is array: ${Array.isArray(allActive)}`);

if (Array.isArray(allActive)) {
  console.log('✅ TEST 1 PASSED: Returns array');
  
  if (allActive.length > 0) {
    const first = allActive[0];
    console.log(`\nFirst playbook structure:`);
    console.log(`  id: ${first.id}`);
    console.log(`  domain: ${first.domain}`);
    console.log(`  taskType: ${first.taskType}`);
    console.log(`  patternKey: ${first.patternKey}`);
    console.log(`  isStale: ${first.isStale}`);
    console.log(`  stats.useCount: ${first.stats?.useCount}`);
  }
} else {
  console.log('❌ TEST 1 FAILED: Not an array');
}
console.log();

console.log('TEST 2: getAllDraftPlaybooks() returns array');
console.log('═'.repeat(60));

const allDrafts = meta1.getAllDraftPlaybooks();

console.log(`Draft playbooks count: ${allDrafts.length}`);
console.log(`Is array: ${Array.isArray(allDrafts)}`);

if (Array.isArray(allDrafts)) {
  console.log('✅ TEST 2 PASSED: Returns array');
  
  if (allDrafts.length > 0) {
    const first = allDrafts[0];
    console.log(`\nFirst draft structure:`);
    console.log(`  id: ${first.id}`);
    console.log(`  domain: ${first.domain}`);
    console.log(`  patternKey: ${first.patternKey}`);
    console.log(`  minSuccessCount: ${first.minSuccessCount}`);
    console.log(`  filepath: ${first.filepath}`);
  }
} else {
  console.log('❌ TEST 2 FAILED: Not an array');
}
console.log();

console.log('TEST 3: getStalePlaybooks() returns array');
console.log('═'.repeat(60));

// Create a stale playbook by manipulating state
const meta3 = new MetaLoop();
const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
meta3.state.activeUsedCountById['pb_cooking_compare_3c090840a1339477'] = 10;
meta3.state.firstUsedAtById['pb_cooking_compare_3c090840a1339477'] = sixtyDaysAgo;
meta3.state.lastUsedAtById['pb_cooking_compare_3c090840a1339477'] = sixtyDaysAgo;

const stalePlaybooks = meta3.getStalePlaybooks();

console.log(`Stale playbooks count: ${stalePlaybooks.length}`);
console.log(`Is array: ${Array.isArray(stalePlaybooks)}`);

if (Array.isArray(stalePlaybooks)) {
  console.log('✅ TEST 3 PASSED: Returns array');
  
  if (stalePlaybooks.length > 0) {
    const first = stalePlaybooks[0];
    console.log(`\nFirst stale playbook:`);
    console.log(`  id: ${first.id}`);
    console.log(`  daysSinceLastUse: ${first.stats?.daysSinceLastUse}`);
  }
} else {
  console.log('❌ TEST 3 FAILED: Not an array');
}
console.log();

console.log('TEST 4: Determinism - same state produces same output');
console.log('═'.repeat(60));

const meta4a = new MetaLoop();
const meta4b = new MetaLoop();

const output4a = JSON.stringify(meta4a.getAllActivePlaybooksWithStats());
const output4b = JSON.stringify(meta4b.getAllActivePlaybooksWithStats());

const deterministic = output4a === output4b;

console.log(`First call output length: ${output4a.length}`);
console.log(`Second call output length: ${output4b.length}`);
console.log(`Outputs match: ${deterministic}`);

if (deterministic) {
  console.log('✅ TEST 4 PASSED: Deterministic output');
} else {
  console.log('❌ TEST 4 FAILED: Non-deterministic output');
}
console.log();

console.log('TEST 5: No side effects - helpers are read-only');
console.log('═'.repeat(60));

const meta5 = new MetaLoop();
const stateBefore = JSON.stringify(meta5.state);

// Call all helpers
meta5.getAllActivePlaybooksWithStats();
meta5.getAllDraftPlaybooks();
meta5.getStalePlaybooks();

const stateAfter = JSON.stringify(meta5.state);

const noSideEffects = stateBefore === stateAfter;

console.log(`State changed: ${!noSideEffects}`);

if (noSideEffects) {
  console.log('✅ TEST 5 PASSED: No side effects (read-only)');
} else {
  console.log('❌ TEST 5 FAILED: State was modified');
}
console.log();

console.log('TEST 6: getAllActivePlaybooksWithStats includes all required fields');
console.log('═'.repeat(60));

const meta6 = new MetaLoop();
const activeList = meta6.getAllActivePlaybooksWithStats();

let allFieldsPresent = true;
const requiredFields = ['id', 'domain', 'taskType', 'patternKey', 'stats', 'isStale'];

if (activeList.length > 0) {
  const sample = activeList[0];
  for (const field of requiredFields) {
    if (!(field in sample)) {
      console.log(`❌ Missing field: ${field}`);
      allFieldsPresent = false;
    }
  }
}

if (allFieldsPresent && activeList.length > 0) {
  console.log('✅ TEST 6 PASSED: All required fields present');
  console.log(`  Fields: ${requiredFields.join(', ')}`);
} else if (activeList.length === 0) {
  console.log('⚠️  TEST 6 SKIPPED: No active playbooks to check');
} else {
  console.log('❌ TEST 6 FAILED: Missing required fields');
}
console.log();

console.log('TEST 7: Performance - helpers complete quickly');
console.log('═'.repeat(60));

const meta7 = new MetaLoop();
const start = Date.now();

for (let i = 0; i < 100; i++) {
  meta7.getAllActivePlaybooksWithStats();
  meta7.getAllDraftPlaybooks();
  meta7.getStalePlaybooks();
}

const elapsed = Date.now() - start;
const avgPerCall = elapsed / 300; // 100 iterations × 3 calls

console.log(`300 calls completed in: ${elapsed}ms`);
console.log(`Average per call: ${avgPerCall.toFixed(2)}ms`);

if (avgPerCall < 10) {
  console.log('✅ TEST 7 PASSED: Fast performance (<10ms avg)');
} else {
  console.log('⚠️  TEST 7 WARNING: Slower than expected');
}
console.log();

// Summary
console.log('═'.repeat(60));
console.log('SUMMARY');
console.log('═'.repeat(60));

const allTests = [
  { name: 'getAllActivePlaybooksWithStats returns array', pass: Array.isArray(allActive) },
  { name: 'getAllDraftPlaybooks returns array', pass: Array.isArray(allDrafts) },
  { name: 'getStalePlaybooks returns array', pass: Array.isArray(stalePlaybooks) },
  { name: 'Deterministic output', pass: deterministic },
  { name: 'No side effects (read-only)', pass: noSideEffects },
  { name: 'All required fields present', pass: allFieldsPresent || activeList.length === 0 },
  { name: 'Fast performance', pass: avgPerCall < 10 }
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
