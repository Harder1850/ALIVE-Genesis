# ALIVE Hardware Integration Layer

**Peripheral Hardware Integration System for ALIVE Bots**

## Overview

The Hardware Integration Layer provides a safe, modular, and extensible interface for ALIVE Bot to connect with physical systems (vehicles, robots, IoT devices). The system follows a "safety-first" approach with multiple validation passes before any live hardware modification.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   ALIVE Core System                          │
│            (Kernel, Memory, Executor)                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│            Hardware Abstraction Layer (HAL)                  │
│  - Unified Device API                                        │
│  - Event Hub / Message Broker                               │
│  - Safety Controls & Permissions                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
│  Detection   │ │Observation│ │ Simulation  │
│   Module     │ │  Module   │ │   Module    │
└──────────────┘ └───────────┘ └─────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
│ CAN Bridge   │ │USB Bridge │ │  BLE Bridge │
└──────────────┘ └───────────┘ └─────────────┘
        │               │               │
┌───────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐
│ GPIO Bridge  │ │API Bridge │ │   Plugins   │
└──────────────┘ └───────────┘ └─────────────┘
```

## Core Principles

1. **Safety by Default**: No hardware modification without explicit user approval
2. **Multiple Validation Passes**: Simulate → Shadow → Limited Test → Gradual Rollout
3. **Plugin Architecture**: Hot-swappable device connectors
4. **Lightweight Footprint**: Runs on constrained hardware (Raspberry Pi, embedded systems)
5. **Passive Observation First**: Learn system behavior before any intervention

## Key Components

### 1. Hardware Abstraction Layer (hal.js)
- Unified device API
- Central event hub
- Plugin management
- Safety controls

### 2. Detection Module (detection.js)
- Bus scanning (CAN, USB, BLE)
- Capability querying
- Profile matching
- Dynamic module registration

### 3. Observation Module (observation.js)
- Passive data collection
- Performance profiling
- Anomaly detection
- System model learning

### 4. Simulation Module (simulation.js)
- Digital twin creation
- Behavior modeling
- Dry-run testing
- Outcome analysis

### 5. Execution Module (execution.js)
- User approval checkpoints
- Staged deployment (shadow → limited → full)
- Safety overrides
- Audit logging

### 6. Communication Bridges
- **CAN Bus** (bridges/can.js)
- **USB/Serial** (bridges/usb.js)
- **Bluetooth/BLE** (bridges/bluetooth.js)
- **GPIO/Direct IO** (bridges/gpio.js)
- **Web APIs** (bridges/api.js)

## Usage Example

```javascript
const HardwareLayer = require('./hardware/hal');

// Initialize hardware layer
const hal = new HardwareLayer();

// Load appropriate plugins
await hal.loadPlugin('can', { interface: 'can0' });
await hal.loadPlugin('api', { endpoint: 'https://api.device.com' });

// Detect connected devices
const devices = await hal.detectDevices();

// Start passive observation
await hal.observe(devices[0], { duration: 3600000 }); // 1 hour

// Simulate improvement
const simulation = await hal.simulate(devices[0], {
  strategy: 'efficiency-optimization'
});

// Request user approval
if (await getUserApproval(simulation.results)) {
  // Execute with safety controls
  await hal.execute(devices[0], simulation.strategy, {
    mode: 'shadow', // Start in shadow mode
    safetyChecks: true
  });
}
```

## Device Profiles

Device profiles define known hardware capabilities and communication protocols:

```json
{
  "deviceType": "tesla-model-3",
  "interfaces": ["can", "api"],
  "can": {
    "baudRate": 500000,
    "signals": {
      "speed": { "id": "0x257", "startBit": 16, "length": 16 },
      "steering": { "id": "0x045", "startBit": 0, "length": 16 }
    }
  },
  "capabilities": [
    "speed_monitoring",
    "steering_control",
    "battery_status",
    "autopilot_interface"
  ]
}
```

## Safety Guarantees

1. **Read-Only by Default**: Initial mode is passive observation only
2. **User Approval Required**: No control commands without explicit permission
3. **Shadow Mode**: Commands computed but not sent (dry-run validation)
4. **Limited Scope Testing**: Small, bounded tests before full deployment
5. **Instant Override**: User can take control at any moment
6. **Audit Logging**: All actions logged for transparency
7. **Failsafe Mechanisms**: Watchdog timers and dead-man switches

## Installation

```bash
npm install --save serialport node-can bluetooth-serial-port onoff axios
```

## Testing

```bash
# Run hardware integration tests
npm test -- hardware

# Test specific bridge
npm test -- hardware/bridges/can.test.js

# Run simulation tests (no hardware required)
npm test -- hardware/simulation.test.js
```

## Extending the System

### Adding a New Device Type

1. Create device profile in `profiles/`
2. Implement any custom logic in `plugins/`
3. Register with HAL
4. Test in simulation mode first

### Adding a New Bridge

1. Extend `BaseConnector` class
2. Implement required methods: `connect()`, `read()`, `write()`, `disconnect()`
3. Add to bridge registry
4. Update documentation

## Examples

See `examples/` directory for complete implementations:
- `vehicle-integration.js` - Tesla/vehicle integration
- `robot-integration.js` - Smart home robot integration
- `iot-device.js` - Generic IoT device integration

## License

Same as ALIVE-Genesis project

## Safety Warning

⚠️ **IMPORTANT**: This system interfaces with physical hardware that can cause harm if misused. Always:
- Test thoroughly in simulation first
- Start with read-only observation
- Use gradual rollout with safety checks
- Keep a manual override accessible
- Never disable built-in safety features
- Consult hardware documentation
- Follow all applicable safety regulations
