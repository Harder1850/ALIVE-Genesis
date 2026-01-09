#!/usr/bin/env node
/**
 * ALIVE CLI - Global Command Interface
 * 
 * Unified CLI for all ALIVE Bot functionality:
 * - Core organism operations
 * - Hardware integration
 * - Meta-loop debugging
 */

const args = process.argv.slice(2);
const command = args[0];
const subcommand = args[1];

function showHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           ALIVE Bot - Command Line Interface              ║
╚═══════════════════════════════════════════════════════════╝

Usage: ALIVE <command> [subcommand] [options]

CORE COMMANDS:
  start              Start ALIVE organism (cooking CLI)
  status             Show system status
  help               Show this help message

HARDWARE COMMANDS:
  hardware status    Show hardware system status
  hardware demo      Run vehicle integration demo
  hardware observe   Start device observation
  hardware help      Show hardware-specific help

DEBUG COMMANDS:
  debug meta         Debug ALIVE meta loop
  debug kernel       Debug kernel operations

EXAMPLES:
  ALIVE start                    # Start cooking CLI
  ALIVE hardware status          # Check hardware status
  ALIVE hardware demo            # Run hardware demo
  ALIVE debug meta               # Debug meta loop

For more information, visit: docs/hardware-integration-guide.md
`);
}

async function main() {
  try {
    switch (command) {
      case 'start':
        // Start core ALIVE organism
        require('../ui/cli.js');
        break;
        
      case 'hardware':
        // Delegate to hardware CLI
        process.argv = ['node', 'hardware/cli.js', ...args.slice(1)];
        require('../hardware/cli.js');
        break;
        
      case 'debug':
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
        
      case 'status':
        // Show overall system status
        console.log('📊 ALIVE Bot System Status\n');
        console.log('Core Organism: ✓ Operational');
        
        // Try to get hardware status
        try {
          const ALIVEHardware = require('../hardware');
          const hw = new ALIVEHardware({ safetyEnabled: true });
          const status = hw.getStatus();
          console.log(`Hardware Layer: ${status.hal.devices.length} devices connected`);
          await hw.shutdown();
        } catch (error) {
          console.log('Hardware Layer: Not initialized');
        }
        
        console.log('\nUse "ALIVE help" for available commands');
        break;
        
      case 'help':
      case '--help':
      case '-h':
      case undefined:
        showHelp();
        break;
        
      default:
        console.log(`❌ Unknown command: ${command}\n`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
