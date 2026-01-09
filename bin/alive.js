#!/usr/bin/env node
/**
 * ALIVE Bot - Core Freeze v1 CLI (Authoritative Entrypoint)
 * 
 * Contract-compliant CLI for ALIVE organism
 * Serves as BOTH 'alive' and 'ALIVE' commands
 */

const fs = require('fs');
const path = require('path');
const { safeWriteStdout } = require('../utils/checkpoint-writer');

// Parse arguments
const args = process.argv.slice(2);
const command = args[0];

// Check if this is being called as ALIVE (uppercase) for legacy commands
const isUppercase = process.argv[1].includes('ALIVE');

const options = {
  bot: 'alive-bot',
  specialty: null,
  state: path.join(__dirname, '../data'),
  json: true, // JSON is default for contract compliance
  debug: false
};

// Parse options
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--bot' && args[i + 1]) {
    options.bot = args[i + 1];
    i++;
  } else if (args[i] === '--specialty' && args[i + 1]) {
    options.specialty = args[i + 1];
    i++;
  } else if (args[i] === '--state' && args[i + 1]) {
    options.state = args[i + 1];
    i++;
  } else if (args[i] === '--json') {
    options.json = true;
  } else if (args[i] === '--no-json') {
    options.json = false;
  } else if (args[i] === '--debug') {
    options.debug = true;
  }
}

// Ensure data directory exists
if (!fs.existsSync(options.state)) {
  fs.mkdirSync(options.state, { recursive: true });
}

/**
 * Get or create bot session state
 */
function getState() {
  const statePath = path.join(options.state, 'alive-state.json');
  let state = {
    botId: options.bot,
    isActive: false,
    sessionCount: 0,
    totalInteractions: 0,
    health: 1.0,
    lastActivity: null
  };
  
  if (fs.existsSync(statePath)) {
    try {
      state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    } catch (error) {
      // Use default state if corrupted
    }
  }
  
  return { state, statePath };
}

/**
 * Save state
 */
function saveState(state, statePath) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

/**
 * Run a task through ALIVE kernel (REAL IMPLEMENTATION)
 */
async function runTask(taskText) {
  const startTime = Date.now();
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const { state, statePath } = getState();
  
  let output;
  let exitCode;
  
  try {
    if (!taskText) {
      output = {
        ok: false,
        botId: options.bot,
        taskId: taskId,
        input: "",
        response: "Task text is required",
        confidence: 0,
        timingMs: Date.now() - startTime,
        statePath: statePath,
        errors: ["Task text is required"]
      };
      exitCode = 1; // Task failure
    } else {
      // Update state
      state.isActive = true;
      state.sessionCount += 1;
      state.totalInteractions += 1;
      state.lastActivity = new Date().toISOString();
      saveState(state, statePath);
      
      // Load kernel and execute
      const kernel = require('../core/kernel');
      
      // Call kernel with task
      let response = "";
      let confidence = 0.5;
      let errors = [];
      
      try {
        // Simple kernel invocation - may need to be adapted based on actual kernel API
        const result = await kernel.activate({
          taskInput: taskText,
          specialty: options.specialty,
          debug: options.debug
        });
        
        response = result?.response || result?.output || JSON.stringify(result);
        confidence = result?.confidence || 0.8;
        
      } catch (kernelError) {
        response = `Kernel error: ${kernelError.message}`;
        confidence = 0;
        errors.push(kernelError.message);
      }
      
      const timingMs = Date.now() - startTime;
      
      output = {
        ok: errors.length === 0,
        botId: options.bot,
        taskId: taskId,
        input: taskText,
        response: response,
        confidence: confidence,
        timingMs: timingMs,
        statePath: statePath,
        errors: errors
      };
      
      // Exit code based on ok status
      exitCode = output.ok ? 0 : 1;
    }
    
  } catch (error) {
    output = {
      ok: false,
      botId: options.bot,
      taskId: taskId,
      input: taskText || "",
      response: "",
      confidence: 0,
      timingMs: Date.now() - startTime,
      statePath: statePath,
      errors: [error.message]
    };
    exitCode = 2; // Boot/contract failure
  }
  
  // Single exit point - use safe writer to prevent empty content blocks
  safeWriteStdout(output, { taskName: taskId });
  process.exit(exitCode);
}

/**
 * Show organism status (EXACT CONTRACT)
 */
async function showStatus() {
  try {
    const { state, statePath } = getState();
    
    const output = {
      ok: true,
      botId: state.botId,
      isActive: state.isActive,
      sessionCount: state.sessionCount,
      totalInteractions: state.totalInteractions,
      health: state.health,
      lastActivity: state.lastActivity
    };
    
    safeWriteStdout(output, { taskName: 'status', validateResponse: false });
    process.exit(0);
    
  } catch (error) {
    const output = {
      ok: false,
      botId: options.bot,
      isActive: false,
      sessionCount: 0,
      totalInteractions: 0,
      health: 0,
      lastActivity: null
    };
    
    safeWriteStdout(output, { taskName: 'status-error', validateResponse: false });
    process.exit(2);
  }
}

/**
 * Stop the organism (EXACT CONTRACT, IDEMPOTENT)
 */
async function stopOrganism() {
  try {
    const { state, statePath } = getState();
    
    // Idempotent: always returns ok:true
    state.isActive = false;
    state.lastActivity = new Date().toISOString();
    saveState(state, statePath);
    
    const output = {
      ok: true,
      botId: state.botId,
      stopped: true,
      statePath: statePath,
      errors: []
    };
    
    safeWriteStdout(output, { taskName: 'stop', validateResponse: false });
    process.exit(0);
    
  } catch (error) {
    const output = {
      ok: false,
      botId: options.bot,
      stopped: false,
      statePath: options.state,
      errors: [error.message]
    };
    
    safeWriteStdout(output, { taskName: 'stop-error', validateResponse: false });
    process.exit(2);
  }
}

/**
 * Show help
 */
function showHelp() {
  console.log(`
ALIVE Bot - Core Freeze v1 CLI

Usage: alive <command> [options]

Commands:
  run "<taskText>"    Execute a task through ALIVE kernel
  status              Show organism status
  stop                Stop the organism (idempotent)
  help                Show this help message

Options:
  --bot <name>        Bot instance name (default: alive-bot)
  --specialty <name>  Domain specialty filter
  --state <path>      State directory path (default: ./data)
  --json              Force JSON output (default)
  --no-json           Disable JSON output
  --debug             Enable debug output

Contract JSON Output:
  All commands return JSON with exact contract-compliant keys.
  
Examples:
  alive run "hello"
  alive status
  alive stop
  alive stop  # Idempotent - returns ok:true

Exit Codes:
  0 - Success (ok:true)
  1 - Task failure (ok:false)
  2 - Boot/contract failure

Legacy Commands (via ALIVE):
  ALIVE start         Start cooking CLI
  ALIVE hardware      Hardware commands
  ALIVE debug meta    Debug meta loop
`);
  process.exit(0);
}

/**
 * Legacy ALIVE command support
 */
async function handleLegacyCommands() {
  switch (command) {
    case 'start':
      require('../ui/cli.js');
      break;
      
    case 'hardware':
      process.argv = ['node', 'hardware/cli.js', ...args.slice(1)];
      require('../hardware/cli.js');
      break;
      
    case 'debug':
      const subcommand = args[1];
      if (subcommand === 'meta') {
        console.log('🛠️  Debugging ALIVE Meta Loop...');
        const { debugMeta } = require('../ui/cli_meta.js');
        debugMeta();
      } else if (subcommand === 'kernel') {
        console.log('🛠️  Debugging ALIVE Kernel...');
        require('../core/kernel.js');
      } else {
        console.log('Available debug commands: meta, kernel');
      }
      break;
      
    default:
      return false;
  }
  return true;
}

/**
 * Main entry point
 */
(async () => {
  try {
    // Handle legacy ALIVE commands first (uppercase)
    if (isUppercase && !['run', 'status', 'stop', 'help'].includes(command)) {
      const handled = await handleLegacyCommands();
      if (handled) return;
    }
    
    // Handle contract commands
    switch (command) {
      case 'run':
        const taskText = args[1];
        await runTask(taskText);
        break;
        
      case 'status':
        await showStatus();
        break;
        
      case 'stop':
        await stopOrganism();
        break;
        
      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;
        
      default:
        const output = {
          ok: false,
          botId: options.bot,
          error: `Unknown command: ${command || '(none)'}`,
          available_commands: ['run', 'status', 'stop', 'help'],
          errors: [`Unknown command: ${command || '(none)'}`]
        };
        safeWriteStdout(output, { taskName: 'unknown-command', validateResponse: false });
        process.exit(2);
    }
  } catch (error) {
    const output = {
      ok: false,
      botId: options.bot,
      error: 'Boot/contract failure',
      message: error.message,
      errors: [error.message]
    };
    safeWriteStdout(output, { taskName: 'boot-failure', validateResponse: false });
    process.exit(2);
  }
})();
