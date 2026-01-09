// tests/test-empty-checkpoint.js
// Test that empty content blocks are prevented by checkpoint writer

const { validateContent, safeWriteStdout, safeWriteFile, safeLog } = require('../utils/checkpoint-writer');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Empty Checkpoint Prevention\n');

let testsPassed = 0;
let testsFailed = 0;

/**
 * Helper to run a test
 */
function runTest(testName, testFn) {
  try {
    const result = testFn();
    if (result) {
      console.log(`✅ ${testName}`);
      testsPassed++;
    } else {
      console.log(`❌ ${testName}`);
      testsFailed++;
    }
  } catch (error) {
    console.log(`❌ ${testName} - Error: ${error.message}`);
    testsFailed++;
  }
}

console.log('TEST 1: validateContent catches null/undefined');
console.log('═'.repeat(60));
runTest('Null content is replaced with fallback', () => {
  const result = validateContent(null, { taskName: 'test-null' });
  return result.includes('[EMPTY CHECKPOINT BLOCK PREVENTED]') && 
         result.includes('test-null') &&
         result.includes('null/undefined');
});

runTest('Undefined content is replaced with fallback', () => {
  const result = validateContent(undefined, { taskName: 'test-undefined' });
  return result.includes('[EMPTY CHECKPOINT BLOCK PREVENTED]') && 
         result.includes('test-undefined');
});

console.log();

console.log('TEST 2: validateContent catches empty strings');
console.log('═'.repeat(60));
runTest('Empty string is replaced with fallback', () => {
  const result = validateContent('', { taskName: 'test-empty' });
  return result.includes('[EMPTY CHECKPOINT BLOCK PREVENTED]') && 
         result.includes('test-empty');
});

runTest('Whitespace-only string is replaced with fallback', () => {
  const result = validateContent('   \n\t  ', { taskName: 'test-whitespace' });
  return result.includes('[EMPTY CHECKPOINT BLOCK PREVENTED]') && 
         result.includes('test-whitespace');
});

console.log();

console.log('TEST 3: validateContent catches empty patterns');
console.log('═'.repeat(60));
runTest('String "null" is replaced with fallback', () => {
  const result = validateContent('null', { taskName: 'test-null-string' });
  return result.includes('[EMPTY CHECKPOINT BLOCK PREVENTED]');
});

runTest('Empty object "{}" is replaced with fallback', () => {
  const result = validateContent('{}', { taskName: 'test-empty-object' });
  return result.includes('[EMPTY CHECKPOINT BLOCK PREVENTED]');
});

runTest('Empty array "[]" is replaced with fallback', () => {
  const result = validateContent('[]', { taskName: 'test-empty-array' });
  return result.includes('[EMPTY CHECKPOINT BLOCK PREVENTED]');
});

console.log();

console.log('TEST 4: validateContent allows valid content');
console.log('═'.repeat(60));
runTest('Valid string passes through', () => {
  const result = validateContent('Hello, world!', { taskName: 'test-valid' });
  return result === 'Hello, world!';
});

runTest('Valid JSON object passes through', () => {
  const obj = { message: 'test', value: 42 };
  const result = validateContent(obj, { taskName: 'test-valid-obj' });
  const parsed = JSON.parse(result);
  return parsed.message === 'test' && parsed.value === 42;
});

console.log();

console.log('TEST 5: safeWriteStdout validates response field');
console.log('═'.repeat(60));

// Capture stdout
let stdoutData = '';
const originalWrite = process.stdout.write;
process.stdout.write = (chunk) => {
  stdoutData += chunk;
  return true;
};

runTest('Empty response field is replaced with fallback', () => {
  stdoutData = '';
  safeWriteStdout({ ok: true, response: '' }, { taskName: 'test-empty-response' });
  const output = JSON.parse(stdoutData);
  return output.response.includes('[EMPTY CHECKPOINT BLOCK PREVENTED]');
});

runTest('Null response field is replaced with fallback', () => {
  stdoutData = '';
  safeWriteStdout({ ok: true, response: null }, { taskName: 'test-null-response' });
  const output = JSON.parse(stdoutData);
  return output.response.includes('[EMPTY CHECKPOINT BLOCK PREVENTED]');
});

runTest('Valid response field passes through', () => {
  stdoutData = '';
  safeWriteStdout({ ok: true, response: 'Valid response' }, { taskName: 'test-valid-response' });
  const output = JSON.parse(stdoutData);
  return output.response === 'Valid response';
});

// Restore stdout
process.stdout.write = originalWrite;

console.log();

console.log('TEST 6: safeWriteFile validates content');
console.log('═'.repeat(60));

const testDir = path.join(__dirname, '../data/test-checkpoint');
const testFile = path.join(testDir, 'test.txt');

runTest('Empty content is replaced with fallback in file', () => {
  const result = safeWriteFile(testFile, '', { taskName: 'test-file-empty' });
  const content = fs.readFileSync(testFile, 'utf8');
  return content.includes('[EMPTY CHECKPOINT BLOCK PREVENTED]') && 
         content.includes('test-file-empty');
});

runTest('Valid content is written to file', () => {
  const result = safeWriteFile(testFile, 'Valid file content', { taskName: 'test-file-valid' });
  const content = fs.readFileSync(testFile, 'utf8');
  return content === 'Valid file content';
});

// Cleanup
if (fs.existsSync(testDir)) {
  fs.rmSync(testDir, { recursive: true });
}

console.log();

console.log('TEST 7: Fallback includes timestamp and task name');
console.log('═'.repeat(60));

runTest('Fallback message includes timestamp', () => {
  const result = validateContent('', { taskName: 'test-timestamp' });
  // Check for ISO timestamp pattern
  return /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(result);
});

runTest('Fallback message includes task name', () => {
  const result = validateContent('', { taskName: 'my-special-task' });
  return result.includes('my-special-task');
});

runTest('Fallback message includes reason', () => {
  const result = validateContent(null, { taskName: 'test-reason' });
  return result.includes('Reason:');
});

console.log();

// Summary
console.log('═'.repeat(60));
console.log('SUMMARY');
console.log('═'.repeat(60));
console.log(`Tests Passed: ${testsPassed}`);
console.log(`Tests Failed: ${testsFailed}`);
console.log(`Total Tests: ${testsPassed + testsFailed}`);
console.log();

if (testsFailed === 0) {
  console.log('🎉 ALL TESTS PASSED\n');
  console.log('✅ Autonomous stability patch successfully prevents empty content blocks');
  console.log('✅ The system will no longer crash with "messages.N content is empty" errors');
  process.exit(0);
} else {
  console.log('❌ SOME TESTS FAILED\n');
  process.exit(1);
}
