/**
 * Permissioned Execution & Safety Controls Module
 * 
 * Governs rollout of changes to actual hardware through multiple gated phases.
 * Requires explicit permission and layered safeguards before any live modification.
 */

class ExecutionModule {
  constructor(hal) {
    this.hal = hal;
    this.executions = new Map(); // executionId -> execution data
    this.approvals = new Map(); // executionId -> approval status
    this.executionModes = ['shadow', 'limited', 'full'];
  }
  
  /**
   * Request user approval for executing a strategy
   * @param {string} deviceId - Device ID
   * @param {Object} simulation - Simulation results
   * @param {Object} options - Execution options
   * @returns {Object} Approval request
   */
  requestApproval(deviceId, simulation, options = {}) {
    const requestId = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const request = {
      id: requestId,
      deviceId,
      simulationId: simulation.id,
      strategy: simulation.strategy,
      comparison: simulation.comparison,
      requestedAt: Date.now(),
      status: 'pending',
      options
    };
    
    this.approvals.set(requestId, request);
    
    // Emit event for UI to handle
    this.hal.emit('execution:approval_requested', request);
    
    return request;
  }
  
  /**
   * User approves execution
   * @param {string} requestId - Approval request ID
   * @param {Object} approvalData - Approval details
   */
  approveExecution(requestId, approvalData = {}) {
    const request = this.approvals.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }
    
    request.status = 'approved';
    request.approvedAt = Date.now();
    request.approvedBy = approvalData.userId || 'user';
    request.notes = approvalData.notes || '';
    
    this.hal.emit('execution:approved', request);
    
    return request;
  }
  
  /**
   * User rejects execution
   * @param {string} requestId - Approval request ID
   * @param {string} reason - Rejection reason
   */
  rejectExecution(requestId, reason = '') {
    const request = this.approvals.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }
    
    request.status = 'rejected';
    request.rejectedAt = Date.now();
    request.rejectionReason = reason;
    
    this.hal.emit('execution:rejected', request);
    
    return request;
  }
  
  /**
   * Execute approved strategy with safety controls
   * @param {string} requestId - Approval request ID
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution results
   */
  async execute(requestId, options = {}) {
    const request = this.approvals.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }
    
    if (request.status !== 'approved') {
      throw new Error(`Execution not approved. Status: ${request.status}`);
    }
    
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const execution = {
      id: executionId,
      requestId,
      deviceId: request.deviceId,
      strategy: request.strategy,
      startTime: Date.now(),
      endTime: null,
      phase: 'initializing',
      mode: options.startMode || 'shadow',
      results: {
        shadow: null,
        limited: null,
        full: null
      },
      status: 'running',
      safetyEvents: []
    };
    
    this.executions.set(executionId, execution);
    
    try {
      // Phase 1: Shadow mode
      execution.phase = 'shadow';
      this.hal.emit('execution:phase_change', { executionId, phase: 'shadow' });
      
      execution.results.shadow = await this._executeShadowMode(execution);
      
      if (!execution.results.shadow.safe) {
        throw new Error('Shadow mode detected unsafe conditions');
      }
      
      // Check if we should proceed to limited mode
      if (options.stopAtShadow) {
        execution.status = 'completed';
        execution.phase = 'complete';
        execution.endTime = Date.now();
        return execution;
      }
      
      // Phase 2: Limited scope test
      execution.phase = 'limited';
      this.hal.emit('execution:phase_change', { executionId, phase: 'limited' });
      
      execution.results.limited = await this._executeLimitedMode(execution, options);
      
      if (!execution.results.limited.safe) {
        throw new Error('Limited mode detected unsafe conditions');
      }
      
      // Check if we should proceed to full mode
      if (options.stopAtLimited) {
        execution.status = 'completed';
        execution.phase = 'complete';
        execution.endTime = Date.now();
        return execution;
      }
      
      // Phase 3: Full deployment (if requested)
      if (options.enableFull) {
        execution.phase = 'full';
        this.hal.emit('execution:phase_change', { executionId, phase: 'full' });
        
        execution.results.full = await this._executeFullMode(execution, options);
      }
      
      execution.status = 'completed';
      execution.phase = 'complete';
      execution.endTime = Date.now();
      
      this.hal.emit('execution:complete', execution);
      
      return execution;
      
    } catch (error) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.endTime = Date.now();
      
      // Attempt safe shutdown
      await this._emergencyShutdown(execution);
      
      this.hal.emit('execution:failed', { executionId, error: error.message });
      
      throw error;
    }
  }
  
  /**
   * Execute shadow mode - compute commands but don't send
   * @param {Object} execution - Execution object
   * @returns {Promise<Object>} Shadow mode results
   */
  async _executeShadowMode(execution) {
    const results = {
      duration: 0,
      commandsComputed: 0,
      deviations: [],
      safe: true
    };
    
    const startTime = Date.now();
    const duration = execution.strategy.shadowDuration || 10000; // 10 seconds
    
    const interval = setInterval(async () => {
      try {
        // Read current state
        const state = await this.hal.read(execution.deviceId);
        
        // Compute what command we would send
        const command = this._computeStrategyCommand(execution.strategy, state);
        results.commandsComputed++;
        
        // Compare to what system is actually doing (if observable)
        if (state.actualCommand) {
          const deviation = this._computeDeviation(command, state.actualCommand);
          if (deviation > 0.1) { // 10% deviation threshold
            results.deviations.push({
              timestamp: Date.now(),
              proposed: command,
              actual: state.actualCommand,
              deviation
            });
          }
        }
        
        // Check if duration exceeded
        if (Date.now() - startTime >= duration) {
          clearInterval(interval);
          results.duration = Date.now() - startTime;
          
          // Analyze deviations for safety
          if (results.deviations.length > results.commandsComputed * 0.5) {
            results.safe = false;
            results.warning = 'Too many large deviations from current behavior';
          }
        }
      } catch (error) {
        clearInterval(interval);
        results.safe = false;
        results.error = error.message;
      }
    }, 100); // Check every 100ms
    
    // Wait for shadow mode to complete
    await new Promise(resolve => {
      const checkComplete = setInterval(() => {
        if (results.duration > 0 || results.error) {
          clearInterval(checkComplete);
          resolve();
        }
      }, 100);
    });
    
    return results;
  }
  
  /**
   * Execute limited mode - apply changes in bounded scope
   * @param {Object} execution - Execution object
   * @param {Object} options - Options
   * @returns {Promise<Object>} Limited mode results
   */
  async _executeLimitedMode(execution, options) {
    const results = {
      duration: 0,
      commandsSent: 0,
      responses: [],
      safe: true
    };
    
    const startTime = Date.now();
    const duration = options.limitedDuration || 5000; // 5 seconds
    const limitedScope = options.limitedScope || { maxCommands: 10 };
    
    let commandCount = 0;
    
    const interval = setInterval(async () => {
      try {
        // Check safety state
        if (this.hal.safetyState.userOverride || this.hal.safetyState.emergencyStop) {
          clearInterval(interval);
          results.safe = false;
          results.warning = 'Safety override activated';
          return;
        }
        
        // Read current state
        const state = await this.hal.read(execution.deviceId);
        
        // Compute and SEND command
        const command = this._computeStrategyCommand(execution.strategy, state);
        
        // Check if within limited scope
        if (commandCount >= limitedScope.maxCommands) {
          clearInterval(interval);
          results.duration = Date.now() - startTime;
          return;
        }
        
        // Send command with safety approval
        const response = await this.hal.write(
          execution.deviceId,
          command,
          { 
            approved: true, 
            requiresApproval: false, // Already approved at higher level
            executionId: execution.id
          }
        );
        
        commandCount++;
        results.commandsSent++;
        results.responses.push({
          timestamp: Date.now(),
          command,
          response
        });
        
        // Check if duration exceeded
        if (Date.now() - startTime >= duration) {
          clearInterval(interval);
          results.duration = Date.now() - startTime;
        }
      } catch (error) {
        clearInterval(interval);
        results.safe = false;
        results.error = error.message;
      }
    }, 500); // Send commands every 500ms in limited mode
    
    // Wait for limited mode to complete
    await new Promise(resolve => {
      const checkComplete = setInterval(() => {
        if (results.duration > 0 || results.error) {
          clearInterval(checkComplete);
          resolve();
        }
      }, 100);
    });
    
    return results;
  }
  
  /**
   * Execute full mode - unrestricted deployment
   * @param {Object} execution - Execution object
   * @param {Object} options - Options
   * @returns {Promise<Object>} Full mode results
   */
  async _executeFullMode(execution, options) {
    const results = {
      duration: 0,
      active: true,
      commandsSent: 0,
      safe: true
    };
    
    // Note: Full mode would typically run indefinitely until stopped
    // This is a placeholder implementation
    
    results.warning = 'Full mode execution requires explicit stop command';
    results.duration = 0;
    
    return results;
  }
  
  /**
   * Compute command based on strategy
   * @param {Object} strategy - Strategy configuration
   * @param {Object} state - Current state
   * @returns {Object} Command to execute
   */
  _computeStrategyCommand(strategy, state) {
    // This is a simplified version - real implementation would be more complex
    const command = {};
    
    switch (strategy.type) {
      case 'efficiency-optimization':
        command.type = 'throttle_adjust';
        command.value = state.throttle * 0.9; // Reduce by 10%
        break;
        
      case 'smoothness-optimization':
        command.type = 'acceleration_limit';
        command.value = 0.7; // Limit acceleration to 70% max
        break;
        
      default:
        command.type = 'no-op';
    }
    
    return command;
  }
  
  /**
   * Compute deviation between two commands
   */
  _computeDeviation(proposed, actual) {
    // Simple deviation calculation
    if (typeof proposed === 'number' && typeof actual === 'number') {
      return Math.abs((proposed - actual) / actual);
    }
    return 0;
  }
  
  /**
   * Emergency shutdown of execution
   * @param {Object} execution - Execution object
   */
  async _emergencyShutdown(execution) {
    try {
      // Attempt to restore safe defaults
      this.hal.setUserOverride(true);
      
      // Log safety event
      execution.safetyEvents.push({
        timestamp: Date.now(),
        type: 'emergency_shutdown',
        reason: 'Execution failed or unsafe condition detected'
      });
      
    } catch (error) {
      console.error('Emergency shutdown failed:', error);
    }
  }
  
  /**
   * Stop an active execution
   * @param {string} executionId - Execution ID
   */
  async stopExecution(executionId) {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }
    
    if (execution.status !== 'running') {
      throw new Error(`Execution ${executionId} is not running`);
    }
    
    await this._emergencyShutdown(execution);
    
    execution.status = 'stopped';
    execution.endTime = Date.now();
    
    this.hal.emit('execution:stopped', { executionId });
    
    return execution;
  }
  
  /**
   * Get execution status
   * @param {string} executionId - Execution ID
   * @returns {Object|null} Execution object
   */
  getExecution(executionId) {
    return this.executions.get(executionId);
  }
  
  /**
   * Get all executions for a device
   * @param {string} deviceId - Device ID
   * @returns {Array} List of executions
   */
  getDeviceExecutions(deviceId) {
    return Array.from(this.executions.values())
      .filter(exec => exec.deviceId === deviceId);
  }
  
  /**
   * Get pending approvals
   * @returns {Array} List of pending approval requests
   */
  getPendingApprovals() {
    return Array.from(this.approvals.values())
      .filter(req => req.status === 'pending');
  }
}

module.exports = ExecutionModule;
