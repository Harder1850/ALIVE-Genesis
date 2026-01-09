// Quick test to verify MetaLoop promotion works
const { MetaLoop } = require('./meta/MetaLoop');

console.log('🧪 Testing MetaLoop v0...\n');

const meta = new MetaLoop();

// Simulate 3 identical successful runs
for (let i = 1; i <= 3; i++) {
  console.log(`Run ${i}: compare recipes for brownies`);
  
  const result = meta.recordAndReview({
    domain: 'cooking',
    taskType: 'compare',
    assessment: {
      urgency: 'LATER',
      stakes: 'low',
      difficulty: 'moderate',
      precision: 'flexible'
    },
    metrics: {
      timeMs: 50 + Math.random() * 20,
      stepCount: 1,
      lookupUsed: false,
      lookupChangedOutcome: false,
      resetTriggered: false
    },
    outcome: {
      status: 'success',
      userCorrections: 0
    },
    inputs: {
      querySummary: 'compare recipes for brownies'
    }
  });
  
  console.log(`  Waste: ${result.wasteFlags.join(', ') || 'none'}`);
  console.log(`  Adjustments: ${result.policyAdjustments.length || 0}`);
  console.log(`  Promotions: ${result.candidatePromotions.length || 0}`);
  console.log();
}

console.log('📊 Final State:');
console.log('─'.repeat(60));

const debug = meta.debugSnapshot(10);
console.log(`Logged runs: ${debug.lastRuns.length}`);

console.log(`\nLookup Bias:`);
console.log(meta.state.lookupBias);

console.log(`\nDrafted Playbooks: ${Object.keys(meta.state.draftedKeys).length}`);
console.log(meta.state.draftedKeys);

console.log('\n📁 Files Created:');
console.log(`  ${meta.runlogPath}`);
console.log(`  ${meta.statePath}`);

if (Object.keys(meta.state.draftedKeys).length > 0) {
  console.log(`\n✅ SUCCESS: Playbook promotion working!`);
  console.log(`\nCheck: playbooks/drafts/playbook_*.json`);
} else {
  console.log(`\n❌ FAIL: No playbook was drafted after 3 runs`);
}
