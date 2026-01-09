#!/usr/bin/env node
/**
 * Contract Conformance Test
 * 
 * Validates that alive CLI outputs exact JSON contract
 */

const { execSync } = require('child_process');
const path = require('path');

const cliPath = path.join(__dirname, 'alive.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   ${error.message}`);
    failed++;
  }
}

function execCli(args) {
  try {
    const result = execSync(`node "${cliPath}" ${args}`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { stdout: result, exitCode: 0 };
  } catch (error) {
    // execSync throws on non-zero exit, capture the actual exit code
    return { 
      stdout: error.stdout || '', 
      exitCode: error.status !== undefined ? error.status : 1,
      stderr: error.stderr || ''
    };
  }
}

function assertKeys(obj, requiredKeys, testName) {
  const objKeys = Object.keys(obj);
  for (const key of requiredKeys) {
    if (!(key in obj)) {
      throw new Error(`Missing required key: ${key}`);
    }
  }
}

function assertType(obj, key, type) {
  const actualType = Array.isArray(obj[key]) ? 'array' : typeof obj[key];
  if (actualType !== type && !(type === 'string' && obj[key] === null)) {
    throw new Error(`Key "${key}" has wrong type. Expected ${type}, got ${actualType}`);
  }
}

console.log('🧪 Running Contract Conformance Tests\n');

// Test 1: alive status
test('alive status returns correct JSON shape', () => {
  const { stdout, exitCode } = execCli('status');
  const json = JSON.parse(stdout);
  
  assertKeys(json, ['ok', 'botId', 'isActive', 'sessionCount', 'totalInteractions', 'health', 'lastActivity'], 'status');
  assertType(json, 'ok', 'boolean');
  assertType(json, 'botId', 'string');
  assertType(json, 'isActive', 'boolean');
  assertType(json, 'sessionCount', 'number');
  assertType(json, 'totalInteractions', 'number');
  assertType(json, 'health', 'number');
  
  if (json.ok !== true) {
    throw new Error('status should return ok:true');
  }
  if (exitCode !== 0) {
    throw new Error(`Expected exit code 0, got ${exitCode}`);
  }
});

// Test 2: alive run "hello"
test('alive run "hello" returns correct JSON shape', () => {
  const { stdout, exitCode } = execCli('run "hello"');
  const json = JSON.parse(stdout);
  
  assertKeys(json, ['ok', 'botId', 'taskId', 'input', 'response', 'confidence', 'timingMs', 'statePath', 'errors'], 'run');
  assertType(json, 'ok', 'boolean');
  assertType(json, 'botId', 'string');
  assertType(json, 'taskId', 'string');
  assertType(json, 'input', 'string');
  assertType(json, 'response', 'string');
  assertType(json, 'confidence', 'number');
  assertType(json, 'timingMs', 'number');
  assertType(json, 'statePath', 'string');
  assertType(json, 'errors', 'array');
  
  if (json.input !== 'hello') {
    throw new Error(`Expected input "hello", got "${json.input}"`);
  }
  
  if (json.ok && exitCode !== 0) {
    throw new Error(`Expected exit code 0 for ok:true, got ${exitCode}`);
  }
  if (!json.ok && exitCode === 0) {
    throw new Error(`Expected exit code 1 for ok:false, got ${exitCode}`);
  }
});

// Test 3: alive stop (first time)
test('alive stop returns correct JSON shape', () => {
  const { stdout, exitCode } = execCli('stop');
  const json = JSON.parse(stdout);
  
  assertKeys(json, ['ok', 'botId', 'stopped', 'statePath', 'errors'], 'stop');
  assertType(json, 'ok', 'boolean');
  assertType(json, 'botId', 'string');
  assertType(json, 'stopped', 'boolean');
  assertType(json, 'statePath', 'string');
  assertType(json, 'errors', 'array');
  
  if (json.ok !== true) {
    throw new Error('stop should return ok:true');
  }
  if (json.stopped !== true) {
    throw new Error('stop should return stopped:true');
  }
  if (exitCode !== 0) {
    throw new Error(`Expected exit code 0, got ${exitCode}`);
  }
});

// Test 4: alive stop (idempotent - second time)
test('alive stop is idempotent (returns ok:true twice)', () => {
  const { stdout, exitCode } = execCli('stop');
  const json = JSON.parse(stdout);
  
  if (json.ok !== true) {
    throw new Error('stop should return ok:true on second call (idempotent)');
  }
  if (json.stopped !== true) {
    throw new Error('stop should return stopped:true on second call');
  }
  if (exitCode !== 0) {
    throw new Error(`Expected exit code 0, got ${exitCode}`);
  }
});

// Test 5: alive run without taskText
test('alive run without taskText returns error with exit code 1', () => {
  const { stdout, exitCode } = execCli('run');
  const json = JSON.parse(stdout);
  
  if (json.ok !== false) {
    throw new Error('run without taskText should return ok:false');
  }
  if (exitCode !== 1) {
    throw new Error(`Expected exit code 1, got ${exitCode}`);
  }
  if (!json.errors || json.errors.length === 0) {
    throw new Error('Should have errors array with at least one error');
  }
});

// Test 6: invalid command returns exit code 2
test('invalid command returns exit code 2', () => {
  const { exitCode } = execCli('invalid-command');
  
  if (exitCode !== 2) {
    throw new Error(`Expected exit code 2 for invalid command, got ${exitCode}`);
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(`Tests Passed: ${passed}`);
console.log(`Tests Failed: ${failed}`);
console.log('='.repeat(50));

if (failed > 0) {
  console.log('\n❌ Contract conformance test FAILED');
  process.exit(1);
} else {
  console.log('\n✅ Contract conformance test PASSED');
  process.exit(0);
}
