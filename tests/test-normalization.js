// tests/test-normalization.js
// Test MetaLoop normalization: same intent with different wording should match

const { MetaLoop } = require('../meta/MetaLoop');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing MetaLoop Normalization v1\n');

// Clean up test data before starting
const testDataDir = path.join(process.cwd(), 'data');
const testRunlogPath = path.join(testDataDir, 'runlog.jsonl');
const testMetaStatePath = path.join(testDataDir, 'meta_state.json');

// Backup existing files if they exist
let backupRunlog, backupMetaState;
if (fs.existsSync(testRunlogPath)) {
  backupRunlog = fs.readFileSync(testRunlogPath, 'utf8');
}
if (fs.existsSync(testMetaStatePath)) {
  backupMetaState = fs.readFileSync(testMetaStatePath, 'utf8');
}

// Clear for clean test
if (fs.existsSync(testRunlogPath)) fs.unlinkSync(testRunlogPath);
if (fs.existsSync(testMetaStatePath)) fs.unlinkSync(testMetaStatePath);

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

// TEST 1: Same intent, different wording should produce SAME patternKey
console.log('TEST 1: Same intent normalization');
console.log('═'.repeat(60));

const queries = [
  "compare recipes for brownies",
  "which brownie recipe is better",
  "brownies recipe comparison"
];

const patternKeys = [];

queries.forEach((query, i) => {
  const run = createTestRun(query);
  const key = meta._patternKey(run);
  patternKeys.push(key);
  console.log(`Query ${i + 1}: "${query}"`);
  console.log(`  Pattern Key: ${key}`);
  console.log();
});

// Verify all three produce the same key
const allSame = patternKeys.every(k => k === patternKeys[0]);

if (allSame) {
  console.log('✅ TEST 1 PASSED: All 3 queries produce SAME patternKey');
  console.log(`   Shared Key: ${patternKeys[0]}`);
} else {
  console.log('❌ TEST 1 FAILED: Keys do not match');
  console.log(`   Keys: ${JSON.stringify(patternKeys)}`);
}
console.log();

// TEST 2: Different taskType should produce DIFFERENT patternKey
console.log('TEST 2: Different taskType produces different key');
console.log('═'.repeat(60));

const run1 = createTestRun("brownies recipe comparison", "compare");
const run2 = createTestRun("brownies recipe comparison", "howto");

const key1 = meta._patternKey(run1);
const key2 = meta._patternKey(run2);

console.log(`Same text, taskType="compare": ${key1}`);
console.log(`Same text, taskType="howto":   ${key2}`);

if (key1 !== key2) {
  console.log('✅ TEST 2 PASSED: Different taskTypes produce different keys');
} else {
  console.log('❌ TEST 2 FAILED: Same key for different taskTypes');
}
console.log();

// TEST 3: Different domain should produce DIFFERENT patternKey
console.log('TEST 3: Different domain produces different key');
console.log('═'.repeat(60));

const run3 = { ...createTestRun("compare recipes for brownies"), domain: 'cooking' };
const run4 = { ...createTestRun("compare recipes for brownies"), domain: 'finance' };

const key3 = meta._patternKey(run3);
const key4 = meta._patternKey(run4);

console.log(`Domain="cooking": ${key3}`);
console.log(`Domain="finance": ${key4}`);

if (key3 !== key4) {
  console.log('✅ TEST 3 PASSED: Different domains produce different keys');
} else {
  console.log('❌ TEST 3 FAILED: Same key for different domains');
}
console.log();

// TEST 4: Verify normalization details
console.log('TEST 4: Normalization internals');
console.log('═'.repeat(60));

const testRun = createTestRun("Compare recipes for brownies!!!");
const normalized = meta._normalizeIntent(testRun);

console.log('Input: "Compare recipes for brownies!!!"');
console.log('Normalized:');
console.log(`  domain: "${normalized.domain}"`);
console.log(`  taskType: "${normalized.taskType}"`);
console.log(`  queryNorm: "${normalized.intent.queryNorm}"`);
console.log(`  entities: [${normalized.intent.entities.map(e => `"${e}"`).join(', ')}]`);
console.log(`  assessment: ${JSON.stringify(normalized.assessment)}`);
console.log();

// Verify normalization properties
const checks = [
  { name: 'Domain lowercased', pass: normalized.domain === 'cooking' },
  { name: 'TaskType normalized', pass: normalized.taskType === 'compare' },
  { name: 'Query punctuation removed', pass: !normalized.intent.queryNorm.includes('!') },
  { name: 'Query lowercased', pass: normalized.intent.queryNorm === normalized.intent.queryNorm.toLowerCase() },
  { name: 'Entities extracted', pass: normalized.intent.entities.length > 0 },
  { name: 'Assessment bucketed', pass: ['low', 'med', 'high'].includes(normalized.assessment.stakes) }
];

checks.forEach(check => {
  console.log(`  ${check.pass ? '✅' : '❌'} ${check.name}`);
});
console.log();

// TEST 5: Synonym map works
console.log('TEST 5: TaskType synonym mapping');
console.log('═'.repeat(60));

const synonymTests = [
  { input: 'vs', expected: 'compare' },
  { input: 'difference', expected: 'compare' },
  { input: 'which is better', expected: 'compare' },
  { input: 'how to', expected: 'howto' },
  { input: 'steps', expected: 'howto' },
  { input: 'unknown', expected: 'unknown' }
];

synonymTests.forEach(test => {
  const result = meta._normalizeTaskType(test.input);
  const pass = result === test.expected;
  console.log(`  ${pass ? '✅' : '❌'} "${test.input}" → "${result}" (expected: "${test.expected}")`);
});
console.log();

// TEST 6: Promotion still works with normalized keys
console.log('TEST 6: Promotion with normalized keys');
console.log('═'.repeat(60));

// Record 3 variations that should match
queries.forEach((query, i) => {
  console.log(`Recording run ${i + 1}: "${query}"`);
  const result = meta.recordAndReview(createTestRun(query));
  console.log(`  Promotions: ${result.candidatePromotions.length}`);
});

const state = meta.state;
const draftedCount = Object.keys(state.draftedKeys).length;

console.log();
console.log(`Drafted playbooks: ${draftedCount}`);

if (draftedCount === 1) {
  console.log('✅ TEST 6 PASSED: Promotion triggered after 3 normalized matches');
  const draftKey = Object.keys(state.draftedKeys)[0];
  console.log(`   Draft Key: ${draftKey}`);
  console.log(`   Path: ${state.draftedKeys[draftKey].draftPath}`);
} else {
  console.log(`❌ TEST 6 FAILED: Expected 1 draft, got ${draftedCount}`);
}
console.log();

// Summary
console.log('═'.repeat(60));
console.log('SUMMARY');
console.log('═'.repeat(60));

const allTests = [
  { name: 'Same intent produces same key', pass: allSame },
  { name: 'Different taskType produces different key', pass: key1 !== key2 },
  { name: 'Different domain produces different key', pass: key3 !== key4 },
  { name: 'Normalization properties', pass: checks.every(c => c.pass) },
  { name: 'Synonym mapping', pass: synonymTests.every(t => meta._normalizeTaskType(t.input) === t.expected) },
  { name: 'Promotion with normalized keys', pass: draftedCount === 1 }
];

const passed = allTests.filter(t => t.pass).length;
const total = allTests.length;

allTests.forEach(test => {
  console.log(`${test.pass ? '✅' : '❌'} ${test.name}`);
});

console.log();
console.log(`Tests Passed: ${passed}/${total}`);

// Restore backups
if (backupRunlog) {
  fs.writeFileSync(testRunlogPath, backupRunlog, 'utf8');
}
if (backupMetaState) {
  fs.writeFileSync(testMetaStatePath, backupMetaState, 'utf8');
}

if (passed === total) {
  console.log('\n🎉 ALL TESTS PASSED\n');
  process.exit(0);
} else {
  console.log('\n❌ SOME TESTS FAILED\n');
  process.exit(1);
}
