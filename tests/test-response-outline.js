// tests/test-response-outline.js
// Test responseOutline from playbooks (TASK 2 - 48h Roadmap)

const { MetaLoop } = require('../meta/MetaLoop');

console.log('🧪 Testing Response Outline (TASK 2)\n');

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

console.log('TEST 1: responseOutline returned when playbook matches');
console.log('═'.repeat(60));

const meta1 = new MetaLoop();
const result1 = meta1.recordAndReview(createTestRun("compare recipes for brownies"));

console.log(`Query: "compare recipes for brownies"`);
console.log(`Playbook matched: ${result1.playbookMatch !== null}`);

if (result1.playbookMatch) {
  console.log(`  responseOutline: ${JSON.stringify(result1.playbookMatch.responseOutline)}`);
  
  const hasOutline = result1.playbookMatch.responseOutline !== null;
  const isArray = Array.isArray(result1.playbookMatch.responseOutline);
  
  if (hasOutline && isArray) {
    console.log('✅ TEST 1 PASSED: Outline is array');
    console.log(`  Length: ${result1.playbookMatch.responseOutline.length}`);
  } else if (!hasOutline) {
    console.log('❌ TEST 1 FAILED: No outline returned');
  } else {
    console.log('❌ TEST 1 FAILED: Outline is not an array');
  }
} else {
  console.log('❌ TEST 1 FAILED: No playbook match');
}
console.log();

console.log('TEST 2: Outline contains expected sections');
console.log('═'.repeat(60));

const meta2 = new MetaLoop();
const result2 = meta2.recordAndReview(createTestRun("compare recipes for brownies"));

const expectedSections = [
  'Recipe Candidates',
  'Key Ingredients Comparison',
  'Method Differences',
  'Recommended Choice'
];

let allSectionsPresent = true;
if (result2.playbookMatch && result2.playbookMatch.responseOutline) {
  const outline = result2.playbookMatch.responseOutline;
  
  expectedSections.forEach((section, idx) => {
    if (outline[idx] !== section) {
      console.log(`❌ Section ${idx}: Expected "${section}", got "${outline[idx]}"`);
      allSectionsPresent = false;
    }
  });
  
  if (allSectionsPresent) {
    console.log('✅ TEST 2 PASSED: All expected sections present');
    expectedSections.forEach(s => console.log(`  - ${s}`));
  }
} else {
  console.log('❌ TEST 2 FAILED: No outline to check');
  allSectionsPresent = false;
}
console.log();

console.log('TEST 3: No outline when playbook lacks responseHints.outline');
console.log('═'.repeat(60));

const meta3 = new MetaLoop();
const result3 = meta3.recordAndReview(createTestRun("how to make pasta", "howto"));

console.log(`Query: "how to make pasta"`);
console.log(`Playbook matched: ${result3.playbookMatch !== null}`);

if (result3.playbookMatch && result3.playbookMatch.responseOutline) {
  console.log(`❌ TEST 3 FAILED: Unexpected outline: ${JSON.stringify(result3.playbookMatch.responseOutline)}`);
} else {
  console.log('✅ TEST 3 PASSED: No unexpected outline');
}
console.log();

console.log('TEST 4: Outline is deterministic (same query = same outline)');
console.log('═'.repeat(60));

const meta4 = new MetaLoop();
const result4a = meta4.recordAndReview(createTestRun("compare recipes for brownies"));
const result4b = meta4.recordAndReview(createTestRun("compare recipes for brownies"));

const outline4a = JSON.stringify(result4a.playbookMatch?.responseOutline);
const outline4b = JSON.stringify(result4b.playbookMatch?.responseOutline);

console.log(`First call: ${outline4a}`);
console.log(`Second call: ${outline4b}`);

const deterministic = outline4a === outline4b;

if (deterministic) {
  console.log('✅ TEST 4 PASSED: Outline is deterministic');
} else {
  console.log('❌ TEST 4 FAILED: Outline is not consistent');
}
console.log();

console.log('TEST 5: Outline and prefix can coexist');
console.log('═'.repeat(60));

const meta5 = new MetaLoop();
const result5 = meta5.recordAndReview(createTestRun("compare recipes for brownies"));

if (result5.playbookMatch) {
  const hasPrefix = result5.playbookMatch.responsePrefix !== null;
  const hasOutline = result5.playbookMatch.responseOutline !== null;
  
  console.log(`Has prefix: ${hasPrefix}`);
  console.log(`Has outline: ${hasOutline}`);
  
  if (hasPrefix && hasOutline) {
    console.log('✅ TEST 5 PASSED: Both prefix and outline present');
  } else {
    console.log('❌ TEST 5 FAILED: Missing prefix or outline');
  }
} else {
  console.log('❌ TEST 5 FAILED: No playbook match');
}
console.log();

console.log('TEST 6: Normalized queries get same outline');
console.log('═'.repeat(60));

const meta6 = new MetaLoop();
const result6a = meta6.recordAndReview(createTestRun("compare recipes for brownies"));
const result6b = meta6.recordAndReview(createTestRun("which brownie recipe is better"));

const outline6a = JSON.stringify(result6a.playbookMatch?.responseOutline);
const outline6b = JSON.stringify(result6b.playbookMatch?.responseOutline);

console.log(`Query 1: "compare recipes for brownies" → ${outline6a}`);
console.log(`Query 2: "which brownie recipe is better" → ${outline6b}`);

if (outline6a === outline6b && outline6a !== 'null') {
  console.log('✅ TEST 6 PASSED: Normalized queries match same outline');
} else {
  console.log('❌ TEST 6 FAILED: Outlines differ for same pattern');
}
console.log();

console.log('TEST 7: Outline does NOT execute steps');
console.log('═'.repeat(60));

const meta7 = new MetaLoop();
const result7 = meta7.recordAndReview(createTestRun("compare recipes for brownies"));

// Verify outline is just strings, not executable code
if (result7.playbookMatch && result7.playbookMatch.responseOutline) {
  const outline = result7.playbookMatch.responseOutline;
  const allStrings = outline.every(item => typeof item === 'string');
  
  console.log(`All outline items are strings: ${allStrings}`);
  console.log(`Outline is metadata only (no functions/code): true`);
  
  if (allStrings) {
    console.log('✅ TEST 7 PASSED: Outline is metadata only');
  } else {
    console.log('❌ TEST 7 FAILED: Outline contains non-string items');
  }
} else {
  console.log('⚠️  TEST 7 SKIPPED: No outline to check');
}
console.log();

// Summary
console.log('═'.repeat(60));
console.log('SUMMARY');
console.log('═'.repeat(60));

const allTests = [
  { name: 'Outline returned when playbook matches', pass: result1.playbookMatch?.responseOutline && Array.isArray(result1.playbookMatch.responseOutline) },
  { name: 'All expected sections present', pass: allSectionsPresent },
  { name: 'No outline when not defined', pass: !result3.playbookMatch || !result3.playbookMatch.responseOutline },
  { name: 'Outline is deterministic', pass: deterministic },
  { name: 'Prefix and outline can coexist', pass: result5.playbookMatch?.responsePrefix && result5.playbookMatch?.responseOutline },
  { name: 'Normalized queries get same outline', pass: outline6a === outline6b && outline6a !== 'null' },
  { name: 'Outline is metadata only', pass: result7.playbookMatch?.responseOutline ? result7.playbookMatch.responseOutline.every(i => typeof i === 'string') : true }
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
