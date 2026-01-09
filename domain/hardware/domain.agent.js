/**
 * Hardware Domain Agent
 * 
 * Agent logic for hardware integration domain.
 * Handles hardware-related tasks and routes them to appropriate modules.
 */

const ALIVEHardware = require('../../hardware');

class HardwareAgent {
  constructor(config, bot) {
    this.config = config;
    this.bot = bot;
    this.hardware = new ALIVEHardware({
      safetyEnabled: config.safetyEnabled
    });
    
    this.activeOperations = new Map();
    this.metrics = {
      devicesConnected: 0,
      observationsCompleted: 0,
      simulationsRun: 0,
      executionsApproved: 0
    };
    
    console.log(`🔧 Hardware Agent initialized (${config.specialty})`);
  }
  
  /**
   * Process incoming task
   * @param {Object} task - Task to process
   * @returns {Promise<Object>} Task result
   */
  async processTask(task) {
    const operation = {
      id: `op_${Date.now()}`,
      task,
      startTime: Date.now(),
      status: 'running'
    };
    
    this.activeOperations.set(operation.id, operation);
    
    try {
      let result;
      
      switch (task.action) {
        case 'connect':
          result = await this._handleConnect(task);
          break;
          
        case 'observe':
          result = await this._handleObserve(task);
          break;
          
        case 'simulate':
          result = await this._handleSimulate(task);
          break;
          
        case 'execute':
          result = await this._handleExecute(task);
          break;
          
        case 'status':
          result = await this._handleStatus(task);
          break;
          
        default:
          result = {
            success: false,
            error: `Unknown action: ${task.action}`
          };
      }
      
      operation.status = 'completed';
      operation.endTime = Date.now();
      operation.result = result;
      
      return result;
      
    } catch (error) {
      operation.status = 'failed';
      operation.error = error.message;
      operation.endTime = Date.now();
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Handle device connection
   */
  async _handleConnect(task) {
    const { bridgeType, config } = task.params;
    
    await this.hardware.hal.loadPlugin(bridgeType, config);
    const devices = await this.hardware.detection.detectAndProfile();
    
    this.metrics.devicesConnected += devices.length;
    
    return {
      success: true,
      devices,
      count: devices.length
    };
  }
  
  /**
   * Handle device observation
   */
  async _handleObserve(task) {
    const { deviceId, duration, interval } = task.params;
    
    const observation = await this.hardware.observation.startObservation(deviceId, {
      duration: duration || 60000,
      interval: interval || 1000
    });
    
    // Wait for completion
    await new Promise(resolve => {
      const check = setInterval(() => {
        if (!this.hardware.observation.activeObservations.has(deviceId)) {
          clearInterval(check);
          resolve();
        }
      }, 1000);
    });
    
    const report = this.hardware.observation.getReport(deviceId);
    this.metrics.observationsCompleted++;
    
    return {
      success: true,
      report
    };
  }
  
  /**
   * Handle simulation
   */
  async _handleSimulate(task) {
    const { deviceId, strategy, observationData } = task.params;
    
    // Create digital twin
    const twin = this.hardware.simulation.createDigitalTwin(deviceId, observationData);
    
    // Run simulation
    const simulation = await this.hardware.simulation.simulate(deviceId, strategy);
    
    this.metrics.simulationsRun++;
    
    return {
      success: true,
      twinFidelity: twin.fidelity,
      simulation
    };
  }
  
  /**
   * Handle execution request
   */
  async _handleExecute(task) {
    const { deviceId, simulation, autoApprove } = task.params;
    
    // Request approval
    const request = this.hardware.execution.requestApproval(deviceId, simulation);
    
    // If auto-approve (for testing only)
    if (autoApprove) {
      this.hardware.execution.approveExecution(request.id);
      const execution = await this.hardware.execution.execute(request.id, {
        stopAtShadow: true // Safety: stop at shadow mode
      });
      
      this.metrics.executionsApproved++;
      
      return {
        success: true,
        execution
      };
    }
    
    return {
      success: true,
      approvalRequired: true,
      requestId: request.id
    };
  }
  
  /**
   * Handle status request
   */
  async _handleStatus(task) {
    const status = this.hardware.getStatus();
    
    return {
      success: true,
      status,
      metrics: this.metrics,
      activeOperations: this.activeOperations.size
    };
  }
  
  /**
   * Health check
   * @returns {boolean} Whether agent is healthy
   */
  async healthCheck() {
    try {
      const status = this.hardware.getStatus();
      return !status.hal.safety.emergencyStop;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('🔧 Hardware Agent cleaning up...');
    await this.hardware.shutdown();
  }
  
  /**
   * Get agent metrics
   * @returns {Object} Metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeOperations: this.activeOperations.size,
      uptime: Date.now() - (this.startTime || Date.now())
    };
  }
}

module.exports = HardwareAgent;
