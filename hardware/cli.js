#!/usr/bin/env node
/**
 * ALIVE Hardware CLI
 * 
 * Command-line interface for hardware integration system.
 * Usage: node hardware/cli.js <command> [options]
 */

const ALIVEHardware = require('./index');

const commands = {
  status: 'Show hardware system status',
  demo: 'Run vehicle integration demo',
  observe: 'Start device observation',
  simulate: 'Run simulation on observed device',
  help: 'Show this help message'
};

async function showStatus() {
  console.log('🔍 ALIVE Hardware System Status\n');
  
  const hardware = new ALIVEHardware({ safetyEnabled: true });
  
  try {
    const status = hardware.getStatus();
    
    console.log('Hardware Abstraction Layer:');
    console.log(`  Loaded bridges: ${status.hal.bridges.length || 0}`);
    console.log(`  Connected devices: ${status.hal.devices.length}`);
    console.log(`  Safety enabled: ${status.hal.safety.enabled}`);
    console.log(`  Emergency stop: ${status.hal.safety.emergencyStop ? '⚠️  ACTIVE' : '✓ Normal'}`);
    console.log(`  User override: ${status.hal.safety.userOverride ? '⚠️  ACTIVE' : '✓ Normal'}`);
    
    console.log('\nActive Operations:');
    console.log(`  Observations: ${status.observations.length}`);
    console.log(`  Pending approvals: ${status.pendingApprovals.length}`);
    
    if (status.hal.devices.length > 0) {
      console.log('\nConnected Devices:');
      for (const device of status.hal.devices) {
        console.log(`  - ${device.id}`);
        console.log(`    Type: ${device.type}`);
        console.log(`    Bridge: ${device.bridge}`);
        console.log(`    Capabilities: ${device.capabilities.length}`);
      }
    }
    
    console.log('\n✓ System operational');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function runDemo() {
  console.log('🚗 Running Hardware Integration Demo...\n');
  
  try {
    const demo = require('./examples/vehicle-integration-demo');
    await demo();
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

async function observeDevice(deviceUrl) {
  console.log('👀 Starting Device Observation\n');
  
  const hardware = new ALIVEHardware({ safetyEnabled: true });
  
  try {
    // Load API bridge
    await hardware.hal.loadPlugin('api', {
      baseUrl: deviceUrl || 'http://localhost:3000',
      name: 'Observed Device'
    });
    
    console.log('✓ Bridge loaded');
    
    // Detect devices
    const devices = await hardware.detection.detectAndProfile();
    
    if (devices.length === 0) {
      console.log('❌ No devices detected');
      await hardware.shutdown();
      return;
    }
    
    const device = devices[0];
    console.log(`✓ Detected: ${device.id}\n`);
    
    // Start observation
    console.log('Observing for 60 seconds (Ctrl+C to stop)...\n');
    
    let count = 0;
    await hardware.observation.startObservation(device.id, {
      duration: 60000,
      interval: 1000,
      onData: (data) => {
        count++;
        if (count % 10 === 0) {
          console.log(`  [${new Date().toISOString()}] ${count} data points collected`);
        }
      }
    });
    
    // Wait for completion
    await new Promise(resolve => {
      const check = setInterval(() => {
        if (!hardware.observation.activeObservations.has(device.id)) {
          clearInterval(check);
          resolve();
        }
      }, 1000);
      
      // Handle Ctrl+C
      process.on('SIGINT', () => {
        console.log('\n\n⚠️  Stopping observation...');
        hardware.observation.stopObservation(device.id).then(() => {
          clearInterval(check);
          resolve();
        });
      });
    });
    
    // Get report
    const report = hardware.observation.getReport(device.id);
    
    console.log('\n📊 Observation Report:');
    console.log(`  Duration: ${(report.duration / 1000).toFixed(1)}s`);
    console.log(`  Data points: ${report.dataPoints}`);
    console.log(`  Anomalies: ${report.anomalies.length}`);
    
    if (report.statistics) {
      console.log('\n  Statistics:');
      for (const [metric, stats] of Object.entries(report.statistics)) {
        console.log(`    ${metric}: avg=${stats.mean.toFixed(2)}, range=[${stats.min.toFixed(2)}, ${stats.max.toFixed(2)}]`);
      }
    }
    
    await hardware.shutdown();
    console.log('\n✓ Observation complete');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await hardware.shutdown();
    process.exit(1);
  }
}

function showHelp() {
  console.log('ALIVE Hardware Integration CLI\n');
  console.log('Usage: node hardware/cli.js <command> [options]\n');
  console.log('Commands:');
  
  for (const [cmd, desc] of Object.entries(commands)) {
    console.log(`  ${cmd.padEnd(12)} ${desc}`);
  }
  
  console.log('\nExamples:');
  console.log('  node hardware/cli.js status');
  console.log('  node hardware/cli.js demo');
  console.log('  node hardware/cli.js observe http://localhost:3000');
  console.log('\nNPM Scripts:');
  console.log('  npm run hardware:demo');
  console.log('  npm run hardware:status');
}

// Parse command line
const args = process.argv.slice(2);
const command = args[0];

(async () => {
  switch (command) {
    case 'status':
      await showStatus();
      break;
      
    case 'demo':
      await runDemo();
      break;
      
    case 'observe':
      await observeDevice(args[1]);
      break;
      
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
      
    default:
      if (!command) {
        showHelp();
      } else {
        console.error(`❌ Unknown command: ${command}\n`);
        showHelp();
        process.exit(1);
      }
  }
})().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
