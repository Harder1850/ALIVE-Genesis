// tests/replay-harness.js
// Deterministic Replay Harness - Verify runlog entries produce consistent pattern keys
// This is an auditability tool with NO production code impact

const { MetaLoop } = require('../meta/MetaLoop');
const fs = require('fs');
const path = require('path');

/**
 * Replay runlog entries to verify determinism
 * @param {string} runlogPath - path to runlog.jsonl
 * @param {object} opts - options
 * @returns {object} replay results
 */
function replayRunlog(runlogPath, opts = {}) {
  const {
    limit = null,  // Limit number of entries to replay
    skipDrafting = true,  // Don't create new drafts during replay
    verbose = false,
  } = opts;

  if (!fs.existsSync(runlogPath)) {
    throw new Error(`Runlog not found: ${runlogPath}`);
  }

  // Read runlog
  const content = fs.readFileSync(runlogPath, 'utf8');
  const lines = content.trim().split('\n').filter(Boolean);
  
  let entries = lines.map((line, idx) => {
    try {
      return { idx, run: JSON.parse(line) };
    } catch (err) {
      return { idx, run: null, parseError: err.message };
    }
  });

  if (limit) {
    entries = entries.slice(0, limit);
  }

  // Create MetaLoop instance for replay
  const meta = new MetaLoop({
    promoteAfter: 999999,  // Effectively disable drafting during replay
  });

  const results = {
    total: entries.length,
    parsed: 0,
    failed: 0,
    patternKeys: [],
    duplicateKeys: new Map(),  // Track how many times each key appears
    errors: [],
  };

  // Replay each entry
  for (const entry of entries) {
    if (!entry.run) {
      results.failed++;
      results.errors.push({
        idx: entry.idx,
        error: entry.parseError || 'Failed to parse'
      });
      continue;
    }

    try {
      // Generate pattern key (this is the determinism test)
      const patternKey = meta._patternKey(entry.run);
      
      results.parsed++;
      results.patternKeys.push({
        idx: entry.idx,
        domain: entry.run.domain,
        taskType: entry.run.taskType,
        patternKey,
      });

      // Track duplicates
      const count = results.duplicateKeys.get(patternKey) || 0;
      results.duplicateKeys.set(patternKey, count + 1);

      if (verbose) {
        console.log(`[${entry.idx}] ${entry.run.domain}|${entry.run.taskType} → ${patternKey}`);
      }
    } catch (err) {
      results.failed++;
      results.errors.push({
        idx: entry.idx,
        error: err.message
      });
    }
  }

  return results;
}

/**
 * Verify that replaying the same entry produces the same pattern key
 */
function verifyDeterminism(run, iterations = 10) {
  const meta = new MetaLoop();
  const keys = [];

  for (let i = 0; i < iterations; i++) {
    const key = meta._patternKey(run);
    keys.push(key);
  }

  // All keys should be identical
  const unique = [...new Set(keys)];
  return {
    deterministic: unique.length === 1,
    uniqueKeys: unique,
    iterations,
  };
}

/**
 * Find repeated patterns in runlog
 */
function findRepeatedPatterns(runlogPath, minCount = 2) {
  const results = replayRunlog(runlogPath);
  const repeated = [];

  for (const [key, count] of results.duplicateKeys.entries()) {
    if (count >= minCount) {
      repeated.push({ patternKey: key, count });
    }
  }

  // Sort by count descending
  repeated.sort((a, b) => b.count - a.count);

  return {
    total: results.total,
    uniquePatterns: results.duplicateKeys.size,
    repeatedPatterns: repeated,
  };
}

module.exports = {
  replayRunlog,
  verifyDeterminism,
  findRepeatedPatterns,
};

// CLI mode
if (require.main === module) {
  const runlogPath = process.argv[2] || path.join(__dirname, '..', 'data', 'runlog.jsonl');
  
  console.log('🔄 Replay Harness - Deterministic Pattern Key Verification\n');
  console.log(`Reading: ${runlogPath}\n`);

  try {
    // Test 1: Replay all entries
    console.log('TEST 1: Replaying runlog entries');
    console.log('═'.repeat(60));
    
    const results = replayRunlog(runlogPath);
    
    console.log(`Total entries: ${results.total}`);
    console.log(`Parsed successfully: ${results.parsed}`);
    console.log(`Failed to parse: ${results.failed}`);
    console.log(`Unique pattern keys: ${results.duplicateKeys.size}`);
    
    if (results.errors.length > 0) {
      console.log(`\nErrors:`);
      results.errors.slice(0, 5).forEach(e => {
        console.log(`  Line ${e.idx}: ${e.error}`);
      });
      if (results.errors.length > 5) {
        console.log(`  ... and ${results.errors.length - 5} more`);
      }
    }
    console.log();

    // Test 2: Find repeated patterns
    console.log('TEST 2: Finding repeated patterns');
    console.log('═'.repeat(60));
    
    const patterns = findRepeatedPatterns(runlogPath, 2);
    console.log(`Total patterns: ${patterns.uniquePatterns}`);
    console.log(`Repeated patterns (≥2 uses): ${patterns.repeatedPatterns.length}`);
    
    if (patterns.repeatedPatterns.length > 0) {
      console.log(`\nTop repeated patterns:`);
      patterns.repeatedPatterns.slice(0, 10).forEach(p => {
        console.log(`  ${p.patternKey}: ${p.count} times`);
      });
    }
    console.log();

    // Test 3: Verify determinism on first entry
    if (results.patternKeys.length > 0) {
      console.log('TEST 3: Verifying determinism');
      console.log('═'.repeat(60));
      
      const firstEntry = results.patternKeys[0];
      const meta = new MetaLoop();
      const testRun = {
        domain: firstEntry.domain,
        taskType: firstEntry.taskType,
        assessment: {},
        inputs: { querySummary: 'test' },
      };
      
      const det = verifyDeterminism(testRun, 100);
      console.log(`Iterations: ${det.iterations}`);
      console.log(`Deterministic: ${det.deterministic}`);
      console.log(`Unique keys generated: ${det.uniqueKeys.length}`);
      
      if (det.deterministic) {
        console.log('✅ Pattern key generation is deterministic');
      } else {
        console.log('❌ Pattern key generation is NOT deterministic');
        console.log('  Keys:', det.uniqueKeys);
      }
    }
    console.log();

    console.log('═'.repeat(60));
    console.log('SUMMARY');
    console.log('═'.repeat(60));
    console.log(`✅ Replay completed: ${results.parsed}/${results.total} entries`);
    console.log(`✅ No new drafts created (replay is read-only)`);
    console.log(`✅ ${patterns.repeatedPatterns.length} patterns used multiple times`);
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
