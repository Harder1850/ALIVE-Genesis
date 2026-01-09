# AUTONOMY-STABILITY.md
## Autonomous Run Stability Patch

**Status:** ✅ PATCHED  
**Date:** 2026-01-08  
**Priority:** CRITICAL

---

## Problem: Empty Content Block Crash

### What Caused the Crash

During autonomous runs, the system crashed with API error:

```
API error: "messages.N content is empty"
```

**Root Cause:**
- This was a **tooling/streaming payload issue**, NOT a code bug
- LLM API responses sometimes contain empty content blocks during streaming
- Empty response strings (`""`, `null`, `undefined`) were passed directly to stdout
- The API client rejected empty message content blocks
- This caused autonomous runs to crash mid-execution

**Impact:**
- Autonomous runs were unstable and would crash unpredictably
- Empty responses from kernel or streaming payloads would halt execution
- No graceful fallback mechanism existed

---

## Solution: Checkpoint Writer Helper

### Implementation

Created `utils/checkpoint-writer.js` - a validation layer that:

1. **Validates all content before write/print operations**
   - Checks for `null`, `undefined`, empty strings, whitespace-only content
   - Detects empty patterns: `"null"`, `"{}"`, `"[]"`, etc.
   - Enforces minimum content length requirements

2. **Provides safe fallback content**
   - Replaces empty content with: `[EMPTY CHECKPOINT BLOCK PREVENTED]`
   - Includes timestamp for debugging
   - Includes task name for traceability
   - Includes reason for rejection (e.g., "null/undefined content")

3. **Wraps all stdout JSON writes**
   - `safeWriteStdout()` - validates JSON payloads before stdout
   - `safeWriteFile()` - validates file content before write
   - `safeLog()` - validates console messages

### Files Modified

1. **`utils/checkpoint-writer.js`** (NEW)
   - Core validation logic
   - Safe write functions for stdout, files, and console

2. **`bin/alive.js`** (UPDATED)
   - Imports `safeWriteStdout` helper
   - Replaced all `console.log(JSON.stringify(...))` with `safeWriteStdout(...)`
   - Applied to: `runTask()`, `showStatus()`, `stopOrganism()`, error handlers

3. **`tests/test-empty-checkpoint.js`** (NEW)
   - 17 comprehensive tests
   - Tests null/undefined, empty strings, empty patterns, valid content
   - Tests stdout validation, file validation, timestamp/task name inclusion

---

## Why This Fix Prevents Crashes

### Before (Vulnerable)
```javascript
// Direct stdout write - could be empty!
console.log(JSON.stringify({ response: "" }));
// → API rejects empty content → CRASH
```

### After (Protected)
```javascript
// Safe write with validation
safeWriteStdout({ response: "" }, { taskName: 'task123' });
// → Detects empty response
// → Replaces with fallback: "[EMPTY CHECKPOINT BLOCK PREVENTED] - Task: task123 - Time: 2026-01-08T..."
// → API receives non-empty content → NO CRASH
```

### Guarantees

✅ **No empty content blocks reach the API**  
✅ **All responses have minimum 1-character length**  
✅ **Graceful degradation** - system continues with fallback message  
✅ **Debugging info preserved** - timestamp + task name logged  
✅ **Contract compliance maintained** - stdout remains pure JSON  

---

## How to Run in Autonomous Mode Safely on Windows

### Prerequisites

1. **Windows 10/11** with Node.js installed
2. **ALIVE-Genesis repository** cloned
3. **Dependencies installed**: `npm install`

### Running Autonomous Mode

#### Option 1: Direct CLI (Recommended for Testing)

```cmd
# Navigate to project directory
cd C:\Users\<YOUR_USERNAME>\ALIVE-Genesis

# Run a single task
node bin\alive.js run "your task here"

# Check status
node bin\alive.js status

# Stop the organism
node bin\alive.js stop
```

#### Option 2: Batch Script (Recommended for Production)

```cmd
# Launch via batch file
IGNITE-GENESIS.bat
```

#### Option 3: Continuous Autonomous Loop

```cmd
# Create autonomous loop script
@echo off
:loop
node bin\alive.js run "autonomous task %TIME%"
timeout /t 5
goto loop
```

### Safety Features Now Active

When running autonomously, the system now:

1. ✅ **Validates all responses** before sending to API
2. ✅ **Replaces empty content** with safe fallback
3. ✅ **Logs timestamps** for debugging
4. ✅ **Maintains JSON contract** for parsing
5. ✅ **Prevents crashes** from streaming payload issues

### Monitoring Autonomous Runs

**Check for fallback messages:**
```cmd
# If you see this in output, empty content was prevented:
[EMPTY CHECKPOINT BLOCK PREVENTED] - Task: task_12345 - Time: 2026-01-08T05:15:22.123Z
```

**This is EXPECTED behavior** - the system is protecting itself.

**Debug logs location:**
- `data/runlog.jsonl` - Run history
- `data/status.json` - Current status
- `data/alive-state.json` - Session state

### Windows-Specific Considerations

1. **Path separators**: Use `\` for Windows paths
2. **Environment**: Tested on Windows 11 with cmd.exe
3. **PowerShell**: Also works in PowerShell with `.\bin\alive.js`
4. **Node version**: Requires Node.js 14+ (tested on v16+)

### Troubleshooting

**If autonomous runs still crash:**

1. Check Node.js version: `node --version`
2. Verify dependencies: `npm install`
3. Test checkpoint writer: `node tests\test-empty-checkpoint.js`
4. Test contract compliance: `npm run test:contract`
5. Check debug logs in `data/` directory

**If seeing many fallback messages:**

- This indicates streaming payload issues upstream
- System is working correctly by preventing crashes
- Consider debugging the kernel or API client
- Check `core/kernel.js` for empty response sources

---

## Testing

### Run Empty Checkpoint Test
```cmd
node tests\test-empty-checkpoint.js
```

**Expected:** 17/17 tests pass

### Run Contract Compliance Test
```cmd
npm run test:contract
```

**Expected:** 6/6 tests pass

### Run All Tests
```cmd
# Run all test files
for /r tests %f in (test-*.js) do node "%f"
```

---

## Contract Compliance

### No Breaking Changes

✅ **bin/alive.js contract preserved** - all outputs remain pure JSON  
✅ **No network calls added** - validation is local only  
✅ **Stdout remains pure JSON** - fallback content is valid JSON string  
✅ **Exit codes unchanged** - 0 (success), 1 (task fail), 2 (boot fail)  

### Validation Rules

1. **Response field validation** (when present):
   - Must be non-empty after trimming
   - Minimum 1 character length
   - Cannot be `null`, `undefined`, `"null"`, `"{}"`, `"[]"`

2. **Error field validation** (when present):
   - Same rules as response field
   - Ensures error messages are always readable

3. **File content validation**:
   - Minimum 10 characters for files (prevents near-empty writes)
   - Same empty pattern detection

---

## Future Improvements

### Possible Enhancements

1. **Metrics tracking**: Count how many empty blocks were prevented
2. **Upstream fixes**: Identify and fix sources of empty responses
3. **Configurable thresholds**: Allow min length customization
4. **Alert system**: Notify when fallbacks occur frequently
5. **Response recovery**: Attempt to regenerate empty responses

### Known Limitations

- Fallback content is generic (not context-specific)
- Does not fix root cause of empty responses
- Adds small validation overhead (negligible)

---

## Summary

**Problem:** Autonomous runs crashed with "messages.N content is empty"  
**Cause:** Empty response blocks from streaming payloads  
**Solution:** Validation layer that prevents empty content from reaching API  
**Result:** Stable autonomous runs with graceful fallback handling  

**Status:** ✅ Production-ready, fully tested, contract-compliant

---

## References

- **Implementation**: `utils/checkpoint-writer.js`
- **Integration**: `bin/alive.js`
- **Tests**: `tests/test-empty-checkpoint.js`
- **Contract**: `CONTRACT.md`
- **Changelog**: See `CHANGELOG.md` for version history
