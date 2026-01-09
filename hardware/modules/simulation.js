/**
 * Simulation & Dry-Run Module (Behavior Modeling)
 * 
 * Creates virtual sandbox for devices to test "what-if" scenarios safely
 * without affecting real systems. Runs digital twin simulations.
 */

class SimulationModule {
  constructor(hal) {
    this.hal = hal;
    this.simulations = new Map(); // simulationId -> simulation data
    this.digitalTwins = new Map(); // deviceId -> digital twin model
  }
  
  /**
   * Create a digital twin from observation data
   * @param {string} deviceId - Device ID
   * @param {Object} observationData - Data from observation module
   * @returns {Object} Digital twin model
   */
  createDigitalTwin(deviceId, observationData) {
    const device = this.hal.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }
    
    // Build model from observation statistics
    const twin = {
      deviceId,
      createdAt: Date.now(),
      baselineStats: observationData.statistics,
      baselinePerformance: observationData.performance,
      model: this._buildSystemModel(device, observationData),
      fidelity: this._estimateFidelity(observationData)
    };
    
    this.digitalTwins.set(deviceId, twin);
    
    return twin;
  }
  
  /**
   * Build system model from observation data
   * @param {Object} device - Device object
   * @param {Object} observationData - Observation data
   * @returns {Object} System model
   */
  _buildSystemModel(device, observationData) {
    const model = {
      type: 'empirical',
      parameters: {},
      dynamics: {}
    };
    
    // Extract system dynamics from data
    const { statistics, dataPoints } = observationData;
    
    // Build simple state-transition model
    for (const [channel, stats] of Object.entries(statistics)) {
      model.parameters[channel] = {
        min: stats.min,
        max: stats.max,
        typical: stats.mean,
        variance: Math.pow(stats.stdDev, 2)
      };
      
      // Compute auto-correlation (how value depends on previous value)
      if (dataPoints.length > 1) {
        model.dynamics[channel] = this._computeAutocorrelation(
          dataPoints.map(dp => dp.values[channel]).filter(v => v !== undefined)
        );
      }
    }
    
    return model;
  }
  
  /**
   * Compute autocorrelation for time series
   */
  _computeAutocorrelation(values) {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < values.length - 1; i++) {
      numerator += (values[i] - mean) * (values[i + 1] - mean);
    }
    
    for (let i = 0; i < values.length; i++) {
      denominator += Math.pow(values[i] - mean, 2);
    }
    
    return denominator > 0 ? numerator / denominator : 0;
  }
  
  /**
   * Estimate model fidelity
   */
  _estimateFidelity(observationData) {
    const dataPoints = observationData.dataPoints?.length || 0;
    const duration = observationData.duration || 0;
    const anomalies = observationData.anomalies?.length || 0;
    
    // Higher fidelity with more data, longer duration, fewer anomalies
    let fidelity = 0;
    
    if (dataPoints > 1000) fidelity += 0.4;
    else if (dataPoints > 100) fidelity += 0.2;
    else fidelity += 0.1;
    
    if (duration > 60000) fidelity += 0.3; // > 1 minute
    else if (duration > 10000) fidelity += 0.2;
    else fidelity += 0.1;
    
    if (anomalies / dataPoints < 0.01) fidelity += 0.3;
    else if (anomalies / dataPoints < 0.05) fidelity += 0.2;
    else fidelity += 0.1;
    
    return Math.min(fidelity, 1.0);
  }
  
  /**
   * Run simulation with alternative behavior strategy
   * @param {string} deviceId - Device ID
   * @param {Object} strategy - Alternative behavior strategy
   * @param {Object} options - Simulation options
   * @returns {Promise<Object>} Simulation results
   */
  async simulate(deviceId, strategy, options = {}) {
    const twin = this.digitalTwins.get(deviceId);
    if (!twin) {
      throw new Error(`No digital twin for device ${deviceId}. Create one first.`);
    }
    
    const simulationId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const simulation = {
      id: simulationId,
      deviceId,
      strategy,
      startTime: Date.now(),
      endTime: null,
      options,
      results: null,
      status: 'running'
    };
    
    this.simulations.set(simulationId, simulation);
    
    try {
      // Run the simulation
      const results = await this._runSimulation(twin, strategy, options);
      
      simulation.results = results;
      simulation.status = 'completed';
      simulation.endTime = Date.now();
      
      // Compare against baseline
      simulation.comparison = this._compareToBaseline(twin, results);
      
      return simulation;
      
    } catch (error) {
      simulation.status = 'failed';
      simulation.error = error.message;
      simulation.endTime = Date.now();
      throw error;
    }
  }
  
  /**
   * Run the actual simulation
   * @param {Object} twin - Digital twin
   * @param {Object} strategy - Strategy to test
   * @param {Object} options - Options
   * @returns {Object} Simulation results
   */
  async _runSimulation(twin, strategy, options) {
    const {
      duration = 10000, // 10 seconds default
      steps = 100, // Number of simulation steps
      initialState = null
    } = options;
    
    const results = {
      steps: [],
      metrics: {},
      safe: true,
      warnings: []
    };
    
    const dt = duration / steps;
    let state = initialState || this._getInitialState(twin);
    
    // Simulate each time step
    for (let i = 0; i < steps; i++) {
      // Apply strategy to get control inputs
      const controls = this._applyStrategy(strategy, state, twin);
      
      // Update state based on controls and model dynamics
      state = this._updateState(state, controls, twin.model, dt);
      
      // Check safety constraints
      const safetyCheck = this._checkSafety(state, twin);
      if (!safetyCheck.safe) {
        results.safe = false;
        results.warnings.push({
          step: i,
          issue: safetyCheck.issue
        });
      }
      
      results.steps.push({
        time: i * dt,
        state: { ...state },
        controls
      });
    }
    
    // Compute aggregate metrics
    results.metrics = this._computeSimulationMetrics(results.steps, twin);
    
    return results;
  }
  
  /**
   * Get initial state for simulation
   */
  _getInitialState(twin) {
    const state = {};
    
    for (const [channel, params] of Object.entries(twin.model.parameters)) {
      state[channel] = params.typical;
    }
    
    return state;
  }
  
  /**
   * Apply strategy to get control inputs
   * @param {Object} strategy - Strategy configuration
   * @param {Object} state - Current state
   * @param {Object} twin - Digital twin
   * @returns {Object} Control inputs
   */
  _applyStrategy(strategy, state, twin) {
    const controls = {};
    
    switch (strategy.type) {
      case 'efficiency-optimization':
        controls = this._efficiencyStrategy(state, strategy.params);
        break;
        
      case 'smoothness-optimization':
        controls = this._smoothnessStrategy(state, strategy.params);
        break;
        
      case 'custom':
        controls = strategy.computeControls(state, twin);
        break;
        
      default:
        // No change strategy (baseline)
        controls = {};
    }
    
    return controls;
  }
  
  /**
   * Efficiency optimization strategy
   */
  _efficiencyStrategy(state, params = {}) {
    const {
      targetReduction = 0.1, // 10% improvement target
      gradualFactor = 0.8 // Smooth transitions
    } = params;
    
    // Simple strategy: reduce energy consumption gradually
    return {
      energyMultiplier: 1 - targetReduction,
      smoothing: gradualFactor
    };
  }
  
  /**
   * Smoothness optimization strategy
   */
  _smoothnessStrategy(state, params = {}) {
    const {
      dampingFactor = 0.7,
      anticipationTime = 2000 // Look ahead 2 seconds
    } = params;
    
    return {
      damping: dampingFactor,
      anticipation: anticipationTime
    };
  }
  
  /**
   * Update state based on controls and dynamics
   * @param {Object} state - Current state
   * @param {Object} controls - Control inputs
   * @param {Object} model - System model
   * @param {number} dt - Time step
   * @returns {Object} New state
   */
  _updateState(state, controls, model, dt) {
    const newState = { ...state };
    
    // Apply control modifications
    for (const [key, value] of Object.entries(state)) {
      if (model.parameters[key]) {
        // Apply controls if applicable
        let modification = 0;
        
        if (controls.energyMultiplier && key === 'energy') {
          modification = (value * controls.energyMultiplier) - value;
        }
        
        // Apply dynamics (autocorrelation)
        const autocorr = model.dynamics[key] || 0;
        const noise = (Math.random() - 0.5) * model.parameters[key].variance;
        
        newState[key] = value * autocorr + modification + noise;
        
        // Clamp to valid range
        newState[key] = Math.max(
          model.parameters[key].min,
          Math.min(model.parameters[key].max, newState[key])
        );
      }
    }
    
    return newState;
  }
  
  /**
   * Check safety constraints
   */
  _checkSafety(state, twin) {
    // Check if state is within reasonable bounds
    for (const [key, value] of Object.entries(state)) {
      const params = twin.model.parameters[key];
      if (params) {
        // Check if value is way outside normal range
        const range = params.max - params.min;
        if (value < params.min - range * 0.5 || value > params.max + range * 0.5) {
          return {
            safe: false,
            issue: `${key} out of safe range: ${value}`
          };
        }
      }
    }
    
    return { safe: true };
  }
  
  /**
   * Compute metrics from simulation steps
   */
  _computeSimulationMetrics(steps, twin) {
    const metrics = {};
    
    // Compute average values
    for (const key of Object.keys(twin.model.parameters)) {
      const values = steps.map(s => s.state[key]).filter(v => v !== undefined);
      if (values.length > 0) {
        metrics[key] = {
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values)
        };
      }
    }
    
    return metrics;
  }
  
  /**
   * Compare simulation results to baseline
   * @param {Object} twin - Digital twin
   * @param {Object} results - Simulation results
   * @returns {Object} Comparison
   */
  _compareToBaseline(twin, results) {
    const comparison = {
      improvements: [],
      degradations: [],
      neutral: [],
      overallScore: 0
    };
    
    let totalScore = 0;
    let count = 0;
    
    for (const [key, simMetrics] of Object.entries(results.metrics)) {
      const baselineStats = twin.baselineStats[key];
      if (!baselineStats) continue;
      
      const diff = ((simMetrics.avg - baselineStats.mean) / baselineStats.mean) * 100;
      
      const item = {
        metric: key,
        baseline: baselineStats.mean,
        simulated: simMetrics.avg,
        change: diff,
        changePercent: Math.abs(diff).toFixed(2) + '%'
      };
      
      if (Math.abs(diff) < 1) {
        comparison.neutral.push(item);
      } else if (this._isImprovement(key, diff)) {
        comparison.improvements.push(item);
        totalScore += Math.abs(diff);
      } else {
        comparison.degradations.push(item);
        totalScore -= Math.abs(diff);
      }
      
      count++;
    }
    
    comparison.overallScore = count > 0 ? totalScore / count : 0;
    comparison.safe = results.safe;
    comparison.warnings = results.warnings;
    
    return comparison;
  }
  
  /**
   * Determine if a change is an improvement
   */
  _isImprovement(metric, percentChange) {
    // Metrics where lower is better
    const lowerIsBetter = ['energy', 'battery', 'jerkiness', 'variance'];
    
    if (lowerIsBetter.includes(metric)) {
      return percentChange < 0; // Decrease is good
    }
    
    // For most metrics, could be context-dependent
    return false; // Conservative: treat as neutral unless specified
  }
  
  /**
   * Get simulation results
   * @param {string} simulationId - Simulation ID
   * @returns {Object|null} Simulation object
   */
  getSimulation(simulationId) {
    return this.simulations.get(simulationId);
  }
  
  /**
   * Get all simulations for a device
   * @param {string} deviceId - Device ID
   * @returns {Array} List of simulations
   */
  getDeviceSimulations(deviceId) {
    return Array.from(this.simulations.values())
      .filter(sim => sim.deviceId === deviceId);
  }
  
  /**
   * Clear simulations
   */
  clearSimulations(deviceId = null) {
    if (deviceId) {
      for (const [id, sim] of this.simulations) {
        if (sim.deviceId === deviceId) {
          this.simulations.delete(id);
        }
      }
    } else {
      this.simulations.clear();
    }
  }
}

module.exports = SimulationModule;
