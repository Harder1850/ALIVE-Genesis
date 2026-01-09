/**
 * Vehicle Integration Demo
 * 
 * Complete example showing ALIVE Bot integrating with a vehicle:
 * 1. Detection - Identify vehicle capabilities
 * 2. Observation - Monitor performance (read-only)
 * 3. Simulation - Test improvements in virtual sandbox
 * 4. Execution - Apply improvements with safety controls
 */

const ALIVEHardware = require('../index');

async function vehicleIntegrationDemo() {
  console.log('🚗 ALIVE Bot Vehicle Integration Demo\n');
  console.log('=' .repeat(60));
  
  // Initialize hardware system
  const hardware = new ALIVEHardware({
    safetyEnabled: true
  });
  
  // Setup event listeners
  hardware.on('log', (log) => {
    if (log.level === 'error' || log.level === 'warn') {
      console.log(`[${log.level.toUpperCase()}] ${log.message}`);
    }
  });
  
  hardware.on('observation:anomaly', (data) => {
    console.log(`⚠️  Anomaly detected: ${data.anomaly.channel} = ${data.anomaly.value}`);
  });
  
  hardware.on('execution:approval_requested', (request) => {
    console.log('\n📋 Approval Requested:');
    console.log(`   Strategy: ${request.strategy.type}`);
    console.log(`   Improvements:`, request.comparison.improvements);
    console.log(`   Overall Score: ${request.comparison.overallScore.toFixed(2)}%`);
  });
  
  try {
    console.log('\n📡 Step 1: Loading API bridge and detecting vehicle...');
    
    // Load API bridge (simulated vehicle API endpoint)
    await hardware.hal.loadPlugin('api', {
      baseUrl: 'http://localhost:3000/vehicle',
      auth: { apiKey: 'demo-key' },
      name: 'Demo Vehicle'
    });
    
    console.log('✅ API bridge loaded');
    
    // Detect devices
    console.log('\n🔍 Step 2: Detecting and profiling vehicle...');
    const devices = await hardware.detection.detectAndProfile();
    
    if (devices.length === 0) {
      console.log('❌ No devices detected. Make sure demo server is running.');
      console.log('   Run: node hardware/examples/mock-vehicle-server.js');
      return;
    }
    
    const vehicle = devices[0];
    console.log(`✅ Detected: ${vehicle.name || vehicle.id}`);
    console.log(`   Type: ${vehicle.type || 'unknown'}`);
    console.log(`   Capabilities: ${vehicle.capabilities.length} available`);
    
    // Step 3: Passive observation
    console.log('\n👀 Step 3: Starting passive observation (30 seconds)...');
    console.log('   Monitoring vehicle performance without any control...');
    
    let dataPointCount = 0;
    await hardware.observation.startObservation(vehicle.id, {
      duration: 30000, // 30 seconds
      interval: 1000,  // Sample every second
      onData: (data) => {
        dataPointCount++;
        if (dataPointCount % 5 === 0) {
          console.log(`   Data points collected: ${dataPointCount}`);
        }
      }
    });
    
    // Wait for observation to complete
    await new Promise(resolve => {
      const check = setInterval(() => {
        if (!hardware.observation.activeObservations.has(vehicle.id)) {
          clearInterval(check);
          resolve();
        }
      }, 1000);
    });
    
    const observationReport = hardware.observation.getReport(vehicle.id);
    console.log('✅ Observation complete');
    console.log(`   Duration: ${(observationReport.duration / 1000).toFixed(1)}s`);
    console.log(`   Data points: ${observationReport.dataPoints}`);
    console.log(`   Anomalies: ${observationReport.anomalies.length}`);
    
    // Display baseline metrics
    if (observationReport.statistics) {
      console.log('\n📊 Baseline Performance Metrics:');
      for (const [metric, stats] of Object.entries(observationReport.statistics)) {
        console.log(`   ${metric}: avg=${stats.mean.toFixed(2)}, range=[${stats.min.toFixed(2)}, ${stats.max.toFixed(2)}]`);
      }
    }
    
    // Step 4: Create digital twin and simulate
    console.log('\n🤖 Step 4: Creating digital twin and simulating improvements...');
    
    const twin = hardware.simulation.createDigitalTwin(vehicle.id, observationReport);
    console.log(`✅ Digital twin created (fidelity: ${(twin.fidelity * 100).toFixed(0)}%)`);
    
    // Run efficiency optimization simulation
    const strategy = {
      type: 'efficiency-optimization',
      params: {
        targetReduction: 0.10, // Target 10% energy reduction
        gradualFactor: 0.8
      },
      shadowDuration: 10000
    };
    
    console.log(`   Running ${strategy.type} simulation...`);
    const simulation = await hardware.simulation.simulate(vehicle.id, strategy, {
      duration: 10000,
      steps: 100
    });
    
    console.log('✅ Simulation complete');
    console.log(`   Safe: ${simulation.comparison.safe ? 'Yes ✓' : 'No ✗'}`);
    console.log(`   Overall Score: ${simulation.comparison.overallScore.toFixed(2)}%`);
    
    if (simulation.comparison.improvements.length > 0) {
      console.log('\n📈 Predicted Improvements:');
      for (const improvement of simulation.comparison.improvements) {
        console.log(`   ${improvement.metric}: ${improvement.changePercent} improvement`);
      }
    }
    
    if (simulation.comparison.degradations.length > 0) {
      console.log('\n📉 Potential Degradations:');
      for (const degradation of simulation.comparison.degradations) {
        console.log(`   ${degradation.metric}: ${degradation.changePercent} worse`);
      }
    }
    
    // Step 5: Request approval and execute
    if (simulation.comparison.overallScore > 0 && simulation.comparison.safe) {
      console.log('\n✅ Step 5: Simulation shows improvement - requesting approval...');
      
      const approvalRequest = hardware.execution.requestApproval(
        vehicle.id,
        simulation
      );
      
      console.log(`   Approval request ID: ${approvalRequest.id}`);
      console.log('   Status: Pending user approval');
      
      // In a real scenario, wait for user to approve via UI
      // For demo, we'll auto-approve after showing the request
      console.log('\n🤖 Auto-approving for demo...');
      
      hardware.execution.approveExecution(approvalRequest.id, {
        userId: 'demo-user',
        notes: 'Approved for demonstration'
      });
      
      console.log('\n🚀 Step 6: Executing with safety controls...');
      console.log('   Phase 1: Shadow mode (computing commands, not sending)');
      
      const execution = await hardware.execution.execute(approvalRequest.id, {
        stopAtShadow: true // Only run shadow mode for safety in demo
      });
      
      console.log(`✅ Execution complete: ${execution.status}`);
      console.log(`   Phase: ${execution.phase}`);
      
      if (execution.results.shadow) {
        console.log(`   Shadow mode: ${execution.results.shadow.commandsComputed} commands computed`);
        console.log(`   Deviations: ${execution.results.shadow.deviations.length}`);
        console.log(`   Safe: ${execution.results.shadow.safe ? 'Yes ✓' : 'No ✗'}`);
      }
      
      console.log('\n💡 Next steps (in production):');
      console.log('   1. Review shadow mode results');
      console.log('   2. Enable limited mode for bounded testing');
      console.log('   3. Gradually expand to full deployment');
      console.log('   4. Monitor continuously with instant override capability');
      
    } else {
      console.log('\n⚠️  Step 5: No improvement detected or simulation unsafe');
      console.log('   Execution not recommended at this time.');
    }
    
    // Final status
    console.log('\n' + '='.repeat(60));
    console.log('📊 Final System Status:');
    const status = hardware.getStatus();
    console.log(`   Connected devices: ${status.hal.devices.length}`);
    console.log(`   Active observations: ${status.observations.length}`);
    console.log(`   Pending approvals: ${status.pendingApprovals.length}`);
    console.log(`   Safety enabled: ${status.hal.safety.enabled}`);
    console.log(`   Emergency stop: ${status.hal.safety.emergencyStop ? 'ACTIVE' : 'Normal'}`);
    
    // Cleanup
    console.log('\n🧹 Shutting down...');
    await hardware.shutdown();
    console.log('✅ Demo complete!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    
    // Emergency cleanup
    try {
      await hardware.shutdown();
    } catch (shutdownError) {
      console.error('Shutdown error:', shutdownError.message);
    }
  }
}

// Run demo if executed directly
if (require.main === module) {
  vehicleIntegrationDemo().catch(console.error);
}

module.exports = vehicleIntegrationDemo;
