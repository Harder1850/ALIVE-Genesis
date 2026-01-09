# ALIVE Hardware Integration Layer - Complete Guide

## Overview

The ALIVE Hardware Integration Layer provides a safe, modular, and extensible system for connecting ALIVE Bot to physical devices like vehicles, robots, and IoT devices. The system prioritizes safety through multiple validation passes before any hardware modification.

## Architecture

```
ALIVE Bot Core
      ↓
Hardware Integration Layer (hardware/index.js)
      ↓
Hardware Abstraction Layer (HAL)
      ↓
┌─────────────┬─────────────┬─────────────┬─────────────┐
│  Detection  │ Observation │ Simulation  │  Execution  │
│   Module    │   Module    │   Module    │   Module    │
└─────────────┴─────────────┴─────────────┴─────────────┘
      ↓
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ CAN Bridge  │ USB Bridge  │ BLE Bridge  │ API Bridge  │
└─────────────┴─────────────┴─────────────┴─────────────┘
      ↓
Physical Hardware (Vehicles, Robots, IoT Devices)
```

## Core Principles

1. **Safety by Default**: No hardware modification without explicit user approval
2. **Multiple Validation Passes**: Simulate → Shadow → Limited → Full deployment
3. **Plugin Architecture**: Hot-swappable device connectors
4. **Passive First**: Always start with read-only observation
5. **Instant Override**: User can take control at any moment

## Quick Start

### Basic Usage

```javascript
const ALIVEHardware = require('./hardware');

// Initialize
const hardware = new ALIVEHardware({
  safetyEnabled: true // Always true for production
});

// Load appropriate bridge
await hardware.hal.loadPlugin('api', {
  baseUrl: 'http://device.local',
  auth: { token: 'your-token' }
});

// Detect devices
const devices = await hardware.detection.detectAndProfile();

// Observe (read-only)
await hardware.observation.startObservation(devices[0].id, {
  duration: 60000 // 1 minute
});

// Get status
const status = hardware.getStatus();
console.log(status);
```

### Complete Workflow

```javascript
// Run complete workflow: Detect → Observe → Simulate → Execute
const result = await hardware.completeWorkflow({
  observationDuration: 30000,  // 30 seconds observation
  strategy: {
    type: 'efficiency-optimization',
    params: { targetReduction: 0.1 }
  },
  autoApprove: false,  // Wait for manual approval
  stopAtShadow: true   // Stop at shadow mode (safest)
});
```

## Modules

### 1. Detection Module

Automatically identifies device capabilities when connecting to new systems.

```javascript
const devices = await hardware.detection.detectAndProfile();

// Device object includes:
// - id: Unique identifier
// - type: Device type
// - capabilities: Array of capabilities
// - profile: Matched device profile
// - subModules: Functional sub-modules
```

### 2. Observation Module

Passively monitors device without sending control commands.

```javascript
const observation = await hardware.observation.startObservation(deviceId, {
  duration: 60000,     // Observation duration (null = indefinite)
  interval: 100,       // Sampling interval (ms)
  channels: [],        // Specific channels (empty = all)
  onData: (data) => {  // Real-time callback
    console.log('Data:', data);
  }
});

// Get report
const report = hardware.observation.getReport(deviceId);
console.log('Statistics:', report.statistics);
console.log('Performance:', report.performance);
console.log('Anomalies:', report.anomalies);
```

### 3. Simulation Module

Creates digital twin to test improvements safely.

```javascript
// Create digital twin from observation data
const twin = hardware.simulation.createDigitalTwin(deviceId, observationData);
console.log('Model fidelity:', twin.fidelity);

// Run simulation
const simulation = await hardware.simulation.simulate(deviceId, {
  type: 'efficiency-optimization',
  params: { targetReduction: 0.1 }
}, {
  duration: 10000,  // Simulation duration
  steps: 100        // Number of steps
});

console.log('Improvements:', simulation.comparison.improvements);
console.log('Safe:', simulation.comparison.safe);
console.log('Overall score:', simulation.comparison.overallScore);
```

### 4. Execution Module

Governs rollout with safety controls.

```javascript
// Request approval
const request = hardware.execution.requestApproval(deviceId, simulation);

// User approves (via UI)
hardware.execution.approveExecution(request.id, {
  userId: 'user123',
  notes: 'Approved after review'
});

// Execute with staged deployment
const execution = await hardware.execution.execute(request.id, {
  stopAtShadow: false,   // Continue to limited mode
  stopAtLimited: true,   // Stop at limited mode
  limitedDuration: 5000, // Limited mode duration
  limitedScope: { maxCommands: 10 }
});

console.log('Execution status:', execution.status);
console.log('Shadow results:', execution.results.shadow);
console.log('Limited results:', execution.results.limited);
```

## Safety Features

### Emergency Stop

```javascript
// Immediately halt all hardware operations
hardware.emergencyStop();

// Reset emergency stop
hardware.hal.resetEmergencyStop();
```

### User Override

```javascript
// Give control back to user
hardware.hal.setUserOverride(true);

// Resume ALIVE control
hardware.hal.setUserOverride(false);
```

### Audit Logging

```javascript
// Get audit log
const logs = hardware.hal.getAuditLog({
  level: 'audit',
  since: new Date(Date.now() - 3600000), // Last hour
  deviceId: 'specific-device'
});
```

## Communication Bridges

### API Bridge

For REST/HTTP devices (smart home, cloud services).

```javascript
await hardware.hal.loadPlugin('api', {
  baseUrl: 'https://api.device.com',
  auth: {
    token: 'bearer-token',
    // OR
    apiKey: 'api-key',
    // OR
    username: 'user',
    password: 'pass'
  },
  timeout: 5000,
  rateLimitDelay: 1000
});
```

### Creating Custom Bridges

Extend `BaseConnector`:

```javascript
const BaseConnector = require('./hardware/bridges/base-connector');

class MyBridge extends BaseConnector {
  async scan() {
    // Detect devices
    return [{ type: 'my-device', address: '...' }];
  }
  
  async connect(deviceInfo) {
    // Connect to device
    return device;
  }
  
  async read(device, options) {
    // Read data from device
    return data;
  }
  
  async write(device, data, options) {
    // Validate safety
    if (!this._validateSafetyConstraints(device, data, options)) {
      throw new Error('Unsafe');
    }
    // Write to device
  }
}
```

## Device Profiles

Create JSON profiles for known devices:

```json
{
  "deviceType": "my-vehicle",
  "description": "My custom vehicle",
  "interfaces": ["api", "can"],
  "capabilities": [
    "speed_monitoring",
    "energy_management"
  ],
  "modules": [
    {
      "name": "Drivetrain",
      "type": "powertrain",
      "dataChannels": ["speed", "energy"],
      "controlAPI": ["throttle"]
    }
  ],
  "safeCommands": [
    "throttle_adjust",
    "speed_limit"
  ]
}
```

## Events

Listen to hardware events:

```javascript
// Device events
hardware.on('device:connected', (device) => { });
hardware.on('device:disconnected', (device) => { });

// Data events
hardware.on('sensor:data', (data) => { });

// Safety events
hardware.on('safety:alert', (alert) => { });

// Observation events
hardware.on('observation:anomaly', (anomaly) => { });
hardware.on('observation:complete', (report) => { });

// Execution events
hardware.on('execution:approval_requested', (request) => { });
hardware.on('execution:phase_change', (phase) => { });
hardware.on('execution:complete', (result) => { });

// Logs
hardware.on('log', (entry) => { });
```

## Best Practices

1. **Always Start with Observation**: Never skip the passive monitoring phase
2. **Review Simulation Results**: Check that improvements are significant and safe
3. **Use Staged Deployment**: Progress through shadow → limited → full
4. **Monitor Continuously**: Watch for anomalies during execution
5. **Keep Override Accessible**: Ensure user can take control instantly
6. **Test in Simulation**: Thoroughly test in digital twin before live deployment
7. **Log Everything**: Maintain audit trail for accountability
8. **Respect Rate Limits**: Don't overwhelm device APIs
9. **Handle Errors Gracefully**: Always have fallback behavior
10. **Security First**: Secure API credentials and communication channels

## Deployment Phases

### Phase 1: Shadow Mode
- Compute commands but DON'T send them
- Compare to actual system behavior
- Validate strategy matches expectations
- Duration: 10-30 seconds
- **Zero risk** - no physical interaction

### Phase 2: Limited Mode
- Send commands in bounded scope
- Limit: Time duration or command count
- Continuous safety monitoring
- Instant abort on anomaly
- Duration: 5-10 seconds
- **Minimal risk** - highly controlled

### Phase 3: Full Mode
- Unrestricted deployment
- Requires explicit approval for each phase
- Continuous monitoring with instant override
- Audit logging of all actions
- Duration: Until manually stopped
- **Managed risk** - full monitoring + override

## Troubleshooting

### No Devices Detected
- Check bridge is loaded correctly
- Verify device is powered and accessible
- Check network connectivity for API devices
- Review bridge-specific requirements

### Observation Fails
- Ensure device is properly connected
- Check read permissions
- Verify data format compatibility
- Review device profile configuration

### Simulation Shows No Improvement
- Increase observation duration for better baseline
- Try different optimization strategies
- Check if device already operates optimally
- Review digital twin fidelity score

### Execution Blocked
- Verify user approval was granted
- Check safety state (emergency stop, override)
- Ensure simulation passed safety checks
- Review audit logs for specific errors

## Examples

See `hardware/examples/` for complete examples:
- `vehicle-integration-demo.js` - Full vehicle integration workflow
- More examples can be added for specific use cases

## Integration with ALIVE Core

The hardware layer can be integrated with ALIVE's kernel:

```javascript
const Kernel = require('./core/kernel');
const ALIVEHardware = require('./hardware');

const kernel = new Kernel();
const hardware = new ALIVEHardware();

// Use hardware in ALIVE tasks
kernel.on('task:hardware', async (task) => {
  if (task.action === 'optimize') {
    const result = await hardware.completeWorkflow({
      strategy: task.strategy,
      autoApprove: false
    });
    return result;
  }
});
```

## Security Considerations

1. **API Credentials**: Store in environment variables, never commit
2. **Network Security**: Use HTTPS/TLS for API bridges
3. **Access Control**: Implement user authentication for approvals
4. **Audit Logging**: Log all hardware interactions
5. **Rate Limiting**: Prevent abuse and respect device limits
6. **Input Validation**: Validate all data from devices
7. **Emergency Procedures**: Always have kill switch accessible

## Performance

- **Lightweight**: Designed for constrained hardware (Raspberry Pi)
- **Efficient**: Minimal overhead, binary protocols where possible
- **Real-time**: Low latency for safety-critical operations
- **Scalable**: Handles multiple devices simultaneously

## License

Same as ALIVE-Genesis project.

## Support

For issues or questions:
1. Check documentation and examples
2. Review audit logs for detailed error information
3. File issue in GitHub repository
4. Consult safety procedures before hardware testing

---

**⚠️ SAFETY WARNING**: This system interfaces with physical hardware. Always:
- Test in simulation first
- Start with read-only observation
- Use gradual rollout with safety checks
- Keep manual override accessible
- Never disable built-in safety features
- Follow all applicable safety regulations
- Consult hardware documentation
