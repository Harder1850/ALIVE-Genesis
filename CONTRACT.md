# ALIVE Bot CLI Contract v1

This document defines the immutable contract for the ALIVE Bot command-line interface.

## Commands

### `alive run "<taskText>"`

Execute a task through the ALIVE kernel.

**JSON Output:**
```json
{
  "ok": boolean,
  "botId": string,
  "taskId": string,
  "input": string,
  "response": string,
  "confidence": number (0-1),
  "timingMs": number,
  "statePath": string,
  "errors": string[]
}
```

**Exit Codes:**
- `0` - Success (ok: true)
- `1` - Task failure (ok: false)
- `2` - Boot/contract failure

**Example:**
```bash
$ alive run "hello"
{
  "ok": true,
  "botId": "alive-bot",
  "taskId": "task_1767919812269_zczzsowr3",
  "input": "hello",
  "response": "Hello! How can I help you?",
  "confidence": 0.8,
  "timingMs": 142,
  "statePath": "/path/to/alive-state.json",
  "errors": []
}
```

### `alive status`

Show organism status.

**JSON Output:**
```json
{
  "ok": boolean,
  "botId": string,
  "isActive": boolean,
  "sessionCount": number,
  "totalInteractions": number,
  "health": number (0-1),
  "lastActivity": string (ISO-8601) | null
}
```

**Exit Codes:**
- `0` - Success
- `2` - Boot/contract failure

**Example:**
```bash
$ alive status
{
  "ok": true,
  "botId": "alive-bot",
  "isActive": false,
  "sessionCount": 1,
  "totalInteractions": 5,
  "health": 1.0,
  "lastActivity": "2026-01-09T00:46:20.689Z"
}
```

### `alive stop`

Stop the organism (idempotent).

**JSON Output:**
```json
{
  "ok": boolean,
  "botId": string,
  "stopped": boolean,
  "statePath": string,
  "errors": string[]
}
```

**Exit Codes:**
- `0` - Success
- `2` - Boot/contract failure

**Idempotency:** Calling `stop` multiple times always returns `ok: true`.

**Example:**
```bash
$ alive stop
{
  "ok": true,
  "botId": "alive-bot",
  "stopped": true,
  "statePath": "/path/to/alive-state.json",
  "errors": []
}

$ alive stop  # Second call
{
  "ok": true,
  "botId": "alive-bot",
  "stopped": true,
  "statePath": "/path/to/alive-state.json",
  "errors": []
}
```

## Options

All commands support:
- `--bot <name>` - Bot instance name (default: "alive-bot")
- `--specialty <name>` - Domain specialty filter
- `--state <path>` - State directory path (default: ./data)
- `--json` - Force JSON output (default)
- `--no-json` - Disable JSON output
- `--debug` - Enable debug output

## Contract Guarantees

1. **Pure stdout**: Contract commands output ONLY JSON to stdout
2. **Deterministic**: Same input produces same JSON structure
3. **No side effects on read**: `status` never modifies state
4. **Idempotent stop**: `stop` can be called multiple times safely
5. **Clean exit**: CLI always exits, never hangs
6. **Stable keys**: JSON keys never change without major version bump

## Testing

Run contract conformance tests:
```bash
npm run test:contract
```

## Version

Contract Version: **v1**  
Frozen: **2026-01-09**
