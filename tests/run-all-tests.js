/*
  Simple test runner for this repo.

  Why:
  - `npm test` previously referenced a missing `tests/kernel.test.js`.
  - Existing tests are plain Node scripts under `tests/test-*.js`.

  Behavior:
  - Discovers tests matching `tests/test-*.js`
  - Runs them sequentially (stable ordering, easier debugging)
  - Exits non-zero on first failure
*/

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const testsDir = __dirname;
const files = fs
  .readdirSync(testsDir)
  .filter((f) => /^test-.*\.js$/i.test(f))
  .sort((a, b) => a.localeCompare(b));

if (files.length === 0) {
  console.error('No tests found matching tests/test-*.js');
  process.exit(1);
}

for (const file of files) {
  const fullPath = path.join(testsDir, file);
  console.log(`\n--- ${file} ---`);

  const result = spawnSync(process.execPath, [fullPath], {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    console.error(`Failed to run ${file}:`, result.error);
    process.exit(1);
  }

  // Node may return null if killed by signal.
  if (typeof result.status !== 'number' || result.status !== 0) {
    process.exit(typeof result.status === 'number' ? result.status : 1);
  }
}

// Also run optional contract tests under /test (separate from /tests convention)
const contractTestPath = path.join(__dirname, '..', 'test', 'mirror.contract.test.js');
if (fs.existsSync(contractTestPath)) {
  const file = path.basename(contractTestPath);
  console.log(`\n--- ${file} ---`);

  const result = spawnSync(process.execPath, [contractTestPath], {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    console.error(`Failed to run ${file}:`, result.error);
    process.exit(1);
  }
  if (typeof result.status !== 'number' || result.status !== 0) {
    process.exit(typeof result.status === 'number' ? result.status : 1);
  }
}

console.log('\n✅ All tests completed successfully');
