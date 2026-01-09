/**
 * Hardware Domain Configuration
 * 
 * Configuration for ALIVE's hardware integration domain.
 */

module.exports = {
  // Domain identification
  name: 'hardware',
  version: '1.0.0',
  specialty: 'hardware-integration',
  description: 'Physical hardware integration and control for vehicles, robots, and IoT devices',
  
  // Memory configuration
  memoryPrefix: 'hw_',
  maxMemory: 50 * 1024 * 1024, // 50MB limit
  
  // Operational settings
  pollingInterval: 1000, // Check hardware status every second
  priority: 'high', // Hardware operations are high priority
  
  // Safety settings
  safetyEnabled: true,
  requiresApproval: true, // All hardware control requires approval
  
  // Capabilities
  capabilities: [
    'device_detection',
    'passive_observation',
    'digital_twin_simulation',
    'staged_execution'
  ],
  
  // Resource limits
  maxConcurrentDevices: 5,
  maxObservationDuration: 3600000, // 1 hour
  
  // Integration points
  requiresModules: ['HAL', 'Detection', 'Observation', 'Simulation', 'Execution'],
  exportsEndpoints: ['hardware:connect', 'hardware:observe', 'hardware:simulate', 'hardware:execute'],
  
  // Logging
  logLevel: 'info',
  auditLogging: true
};
