// cli_meta.js
// Debug utility for MetaLoop

// Prefer canonical MetaLoop export, but fall back to legacy path if present.
let MetaLoop;
try {
  ({ MetaLoop } = require("../meta/MetaLoop"));
} catch {
  ({ MetaLoop } = require("../meta/metaloop"));
}

function debugMeta() {
  const meta = new MetaLoop();
  // MetaLoop API changed from `debug()` to `debugSnapshot()`.
  const snapshot = typeof meta.debugSnapshot === 'function'
    ? meta.debugSnapshot(10)
    : (typeof meta.debug === 'function' ? meta.debug(10) : null);

  const runs = snapshot?.lastRuns || snapshot || [];
  
  console.log("\n=== META LOOP DEBUG ===\n");
  
  if (!runs || runs.length === 0) {
    console.log("No runs logged yet.");
    console.log(`Log file: ${meta.runlogPath}`);
    return;
  }
  
  console.table(runs.map(r => ({
    Time: new Date(r.ts).toLocaleTimeString(),
    Domain: r.domain,
    Task: r.taskType,
    Status: r.outcome.status,
    Steps: r.metrics.stepCount,
    Lookup: r.metrics.lookupUsed ? 'Yes' : 'No',
    Stakes: r.assessment.stakes
  })));
  
  console.log(`\nLookup Bias:`);
  console.log(meta.state.lookupBias);
  
  const draftedKeys = meta.state.draftedKeys || meta.state.drafted || {};
  console.log(`\nDrafted Playbooks: ${Object.keys(draftedKeys).length}`);
  console.log(`\nLog file: ${meta.runlogPath}`);
  console.log(`State file: ${meta.metaStatePath || meta.statePath}\n`);
}

module.exports = { debugMeta };
