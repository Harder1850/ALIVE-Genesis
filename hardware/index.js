/**
 * ALIVE Hardware Integration Layer - Main Entry Point
 * 
 * Unified interface for hardware integration with safety controls.
 */

const HardwareAbstractionLayer = require('./hal');
const DetectionModule = require('./modules/detection');
const ObservationModule = require('./modules/observation');
const SimulationModule = require('./modules/simulation');
const ExecutionModule = require('./modules/execution');

class ALIVEHardware {
  constructor(options = {}) {
    // Initialize HAL
    this.hal = new HardwareAbstractionLayer(options);
    
    // Initialize modules
    this.detection = new DetectionModule(this.hal);
    this.observation = new ObservationModule(this.hal);
    this.simulation = new SimulationModule(this.hal);
    this.execution = new ExecutionModule(this.hal);
    
    // Wire up event forwarding
    this._setupEventForwarding();
  }
  
  /**
   * Setup event forwarding from modules
   */
  _setupEventForwarding() {
    // Forward HAL events
    this.hal.on('device:connected', (data) => this.emit('device:connected', data));
    this.hal.on('device:disconnected', (data) => this.emit('device:disconnected', data));
    this.hal.on('sensor:data', (data) => this.emit('sensor:data', data));
    this.hal.on('safety:alert', (data) => this.emit('safety:alert', data));
    this.hal.on('log', (data) => this.emit('log', data));
    
    // Forward observation events
    this.hal.on('observation:anomaly', (data) => this.emit('observation:anomaly', data));
    this.hal.on('observation:complete', (data) => this.emit('observation:complete', data));
    
    // Forward execution events
    this.hal.on('execution:approval_requested', (data) => this.emit('execution:approval_requested', data));
    this.hal.on('execution:approved', (data) => this.emit('execution:approved', data));
    this.hal.on('execution:phase_change', (data) => this.emit('execution:phase_change', data));
    this.hal.on('execution:complete', (data) => this.emit('execution:complete', data));
    this.hal.on('execution:failed', (data) => this.emit('execution:failed', data));
  }
  
  /**
   * Complete workflow: Detect → Observe → Simulate → Request Approval → Execute
   * @param {Object} options - Workflow options
   * @returns {Promise<Object>} Workflow results
   */
  async completeWorkflow(options = {}) {
    const workflow = {
      startTime: Date.now(),
      steps: [],
      deviceId: null,
      results: {}
    };
    
    try {
      // Step 1: Detect devices
      workflow.steps.push('detection');
      const devices = await this.detection.detectAndProfile();
      
      if (devices.length === 0) {
        throw new Error('No devices detected');
      }
      
      // Use first device or specified device
      const device = options.deviceId 
        ? devices.find(d => d.id === options.deviceId)
        : devices[0];
      
      if (!device) {
        throw new Error('Device not found');
      }
      
      workflow.deviceId = device.id;
      workflow.results.detection = { device };
      
      // Step 2: Observe device
      workflow.steps.push('observation');
      const observationDuration = options.observationDuration || 30000; // 30 seconds
      
      const observation = await this.observation.startObservation(device.id, {
        duration: observationDuration
      });
      
      // Wait for observation to complete
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (!this.observation.activeObservations.has(device.id)) {
            clearInterval(check);
            resolve();
          }
        }, 1000);
      });
      
      const observationReport = this.observation.getReport(device.id);
      workflow.results.observation = observationReport;
      
      // Step 3: Create digital twin and simulate
      workflow.steps.push('simulation');
      
      const twin = this.simulation.createDigitalTwin(device.id, observationReport);
      workflow.results.digitalTwin = { fidelity: twin.fidelity };
      
      const strategy = options.strategy || {
        type: 'efficiency-optimization',
        params: { targetReduction: 0.1 }
      };
      
      const simulation = await this.simulation.simulate(device.id, strategy);
      workflow.results.simulation = {
        id: simulation.id,
        comparison: simulation.comparison,
        safe: simulation.comparison.safe
      };
      
      // Step 4: Request approval (if simulation shows improvement)
      if (simulation.comparison.overallScore > 0 && simulation.comparison.safe) {
        workflow.steps.push('approval_request');
        
        const approvalRequest = this.execution.requestApproval(
          device.id,
          simulation,
          options.executionOptions || {}
        );
        
        workflow.results.approvalRequest = {
          id: approvalRequest.id,
          status: 'pending'
        };
        
        // In auto-approve mode (for testing)
        if (options.autoApprove) {
          this.execution.approveExecution(approvalRequest.id, {
            userId: 'auto',
            notes: 'Auto-approved for testing'
          });
          
          workflow.steps.push('execution');
          
          const execution = await this.execution.execute(approvalRequest.id, {
            stopAtShadow: options.stopAtShadow !== false, // Default: stop at shadow
            ...options.executionOptions
          });
          
          workflow.results.execution = {
            id: execution.id,
            phase: execution.phase,
            status: execution.status
          };
        }
      } else {
        workflow.results.recommendation = 'No improvement detected or unsafe - execution not recommended';
      }
      
      workflow.endTime = Date.now();
      workflow.duration = workflow.endTime - workflow.startTime;
      workflow.status = 'completed';
      
      return workflow;
      
    } catch (error) {
      workflow.error = error.message;
      workflow.status = 'failed';
      workflow.endTime = Date.now();
      throw error;
    }
  }
  
  /**
   * Shortcut: Just detect and observe (safe exploration)
   */
  async exploreDevice(deviceId, duration = 60000) {
    await this.hal.loadPlugin('api', { 
      baseUrl: 'http://localhost:3000' // Example
    });
    
    const devices = await this.detection.detectAndProfile();
    const device = deviceId ? devices.find(d => d.id === deviceId) : devices[0];
    
    if (!device) {
      throw new Error('Device not found');
    }
    
    const observation = await this.observation.startObservation(device.id, {
      duration,
      onData: (data) => {
        console.log(`[${new Date().toISOString()}]`, data);
      }
    });
    
    return { device, observation };
  }
  
  /**
   * Emergency stop all hardware operations
   */
  emergencyStop() {
    this.hal.emergencyStop();
  }
  
  /**
   * Get system status
   */
  getStatus() {
    return {
      hal: this.hal.getStatus(),
      observations: this.observation.getActiveObservations(),
      pendingApprovals: this.execution.getPendingApprovals(),
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Shutdown all hardware connections
   */
  async shutdown() {
    // Stop all observations
    for (const deviceId of this.observation.getActiveObservations()) {
      await this.observation.stopObservation(deviceId);
    }
    
    // Shutdown HAL
    await this.hal.shutdown();
  }
  
  // Event emitter pass-through
  on(...args) { return this.hal.on(...args); }
  once(...args) { return this.hal.once(...args); }
  emit(...args) { return this.hal.emit(...args); }
  removeListener(...args) { return this.hal.removeListener(...args); }
}

module.exports = ALIVEHardware;
