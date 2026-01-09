// cli_meta.js
// Debug utility for MetaLoop

const { MetaLoop } = require("../meta/metaloop");

function debugMeta() {
  const meta = new MetaLoop();
  const runs = meta.debug(10);
  
  console.log("\n=== META LOOP DEBUG ===\n");
  
  if (runs.length === 0) {
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
  
  console.log(`\nDrafted Playbooks: ${Object.keys(meta.state.drafted).length}`);
  console.log(`\nLog file: ${meta.runlogPath}`);
  console.log(`State file: ${meta.statePath}\n`);
}

module.exports = { debugMeta };
