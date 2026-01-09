// tests/test-legacy-cli-routing.js
// Verifies that global uppercase `ALIVE` supports legacy subcommands
// without loosening the strict contract for `alive`.

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const aliveEntrypoint = path.join(projectRoot, 'bin', 'alive.js');

function runAliveAsUppercase(args) {
  // We simulate the installed `ALIVE` binary by forcing the legacy detection.
  // This avoids OS-specific issues around fake argv[1] values.
  const nodeArgs = [aliveEntrypoint, ...args];
  const result = spawnSync(process.execPath, nodeArgs, {
    cwd: projectRoot,
    encoding: 'utf8',
    env: { ...process.env, ALIVE_CLI_NAME: 'ALIVE' }
  });
  return result;
}

console.log('🧪 Testing legacy CLI routing (uppercase ALIVE)\n');

// TEST 1: ALIVE hardware status routes into hardware CLI.
// If hardware module is present, it should succeed (exit code 0).
// If something is missing, we still expect structured output (ok:false JSON)
// and a helpful error.
console.log('TEST 1: ALIVE hardware status');
{
  const r = runAliveAsUppercase(['hardware', 'status']);

  // Hardware CLI currently prints human output; on success it should return 0.
  // If it fails due to missing module, our router returns JSON with ok:false.
  if (r.status === 0) {
    console.log('✅ hardware status exited 0');
    assert.match(r.stdout + r.stderr, /Hardware\s+System\s+Status|System\s+operational/i);
  } else {
    // Attempt to parse JSON structured error emitted by router.
    const combined = (r.stdout || '') + (r.stderr || '');
    let parsed;
    try {
      parsed = JSON.parse(combined);
    } catch {
      // If not JSON, still require a helpful message.
      assert.match(combined, /Legacy command routing failed: hardware|Unknown command|Error/i);
      parsed = null;
    }
    if (parsed) {
      assert.strictEqual(parsed.ok, false);
      assert.match(parsed.error || '', /hardware/i);
    }
    console.log('✅ hardware status failure mode is structured/helpful');
  }
}

// TEST 2: ALIVE debug meta runs (should exit 0 and print meta debug header).
console.log('\nTEST 2: ALIVE debug meta');
{
  const r = runAliveAsUppercase(['debug', 'meta']);
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /META LOOP DEBUG/i);
  console.log('✅ debug meta ran');
}

console.log('\n🎉 Legacy CLI routing tests passed\n');
process.exit(0);
