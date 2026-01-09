/**
 * Passive Observation & Analysis Module
 * 
 * Monitors sensor data and system performance without sending control commands.
 * This read-only, non-intrusive phase is critical for safety and baseline analysis.
 */

class ObservationModule {
  constructor(hal) {
    this.hal = hal;
    this.observations = new Map(); // deviceId -> observation data
    this.activeObservations = new Map(); // deviceId -> interval
  }
  
  /**
   * Start observing a device
   * @param {string} deviceId - Device to observe
   * @param {Object} options - Observation options
   */
  async startObservation(deviceId, options = {}) {
    const {
      duration = null, // null = indefinite
      interval = 100, // Sample every 100ms
      channels = [], // Empty = all channels
      onData = null, // Callback for each data point
      onComplete = null // Callback when observation completes
    } = options;
    
    const device = this.hal.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }
    
    // Initialize observation record
    const observation = {
      deviceId,
      startTime: Date.now(),
      endTime: null,
      duration,
      interval,
      channels,
      dataPoints: [],
      statistics: {},
      anomalies: []
    };
    
    this.observations.set(deviceId, observation);
    
    // Start data collection
    const intervalId = setInterval(async () => {
      try {
        const dataPoint = await this._collectDataPoint(device, channels);
        observation.dataPoints.push(dataPoint);
        
        // Callback
        if (onData) {
          onData(dataPoint);
        }
        
        // Check for anomalies in real-time
        const anomaly = this._detectAnomalies(observation, dataPoint);
        if (anomaly) {
          observation.anomalies.push(anomaly);
          this.hal.emit('observation:anomaly', { deviceId, anomaly });
        }
        
        // Check if duration exceeded
        if (duration && Date.now() - observation.startTime >= duration) {
          await this.stopObservation(deviceId);
          if (onComplete) {
            onComplete(observation);
          }
        }
      } catch (error) {
        console.error(`Observation error for ${deviceId}:`, error);
        this.hal.emit('observation:error', { deviceId, error: error.message });
      }
    }, interval);
    
    this.activeObservations.set(deviceId, intervalId);
    
    return observation;
  }
  
  /**
   * Stop observing a device
   * @param {string} deviceId - Device ID
   */
  async stopObservation(deviceId) {
    const intervalId = this.activeObservations.get(deviceId);
    if (intervalId) {
      clearInterval(intervalId);
      this.activeObservations.delete(deviceId);
    }
    
    const observation = this.observations.get(deviceId);
    if (observation) {
      observation.endTime = Date.now();
      
      // Compute final statistics
      observation.statistics = this._computeStatistics(observation);
      
      // Compute performance metrics
      observation.performance = this._computePerformance(observation);
      
      this.hal.emit('observation:complete', { deviceId, observation });
    }
    
    return observation;
  }
  
  /**
   * Collect a single data point from device
   * @param {Object} device - Device object
   * @param {Array} channels - Channels to read (empty = all)
   * @returns {Object} Data point
   */
  async _collectDataPoint(device, channels = []) {
    const dataPoint = {
      timestamp: Date.now(),
      values: {}
    };
    
    try {
      // Read from device
      const data = await this.hal.read(device.id, { channels });
      
      // Normalize data structure
      if (typeof data === 'object' && data !== null) {
        dataPoint.values = data;
      } else {
        dataPoint.values = { value: data };
      }
    } catch (error) {
      dataPoint.error = error.message;
    }
    
    return dataPoint;
  }
  
  /**
   * Detect anomalies in real-time
   * @param {Object} observation - Observation record
   * @param {Object} dataPoint - Current data point
   * @returns {Object|null} Anomaly if detected
   */
  _detectAnomalies(observation, dataPoint) {
    if (observation.dataPoints.length < 10) {
      return null; // Need baseline
    }
    
    // Simple statistical anomaly detection
    for (const [key, value] of Object.entries(dataPoint.values)) {
      if (typeof value !== 'number') continue;
      
      // Get historical values
      const historicalValues = observation.dataPoints
        .map(dp => dp.values[key])
        .filter(v => typeof v === 'number');
      
      if (historicalValues.length < 10) continue;
      
      const mean = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
      const variance = historicalValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / historicalValues.length;
      const stdDev = Math.sqrt(variance);
      
      // Check if current value is > 3 standard deviations from mean
      const zScore = Math.abs((value - mean) / stdDev);
      if (zScore > 3) {
        return {
          timestamp: dataPoint.timestamp,
          channel: key,
          value,
          mean,
          stdDev,
          zScore,
          severity: zScore > 5 ? 'critical' : 'warning'
        };
      }
    }
    
    return null;
  }
  
  /**
   * Compute statistics for observation
   * @param {Object} observation - Observation record
   * @returns {Object} Statistics
   */
  _computeStatistics(observation) {
    const stats = {};
    
    // Get all channels
    const allChannels = new Set();
    for (const dp of observation.dataPoints) {
      for (const channel of Object.keys(dp.values)) {
        allChannels.add(channel);
      }
    }
    
    // Compute stats for each channel
    for (const channel of allChannels) {
      const values = observation.dataPoints
        .map(dp => dp.values[channel])
        .filter(v => typeof v === 'number' && !isNaN(v));
      
      if (values.length === 0) continue;
      
      stats[channel] = {
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        mean: values.reduce((a, b) => a + b, 0) / values.length,
        median: this._median(values),
        stdDev: this._stdDev(values)
      };
    }
    
    return stats;
  }
  
  /**
   * Compute performance metrics
   * @param {Object} observation - Observation record
   * @returns {Object} Performance metrics
   */
  _computePerformance(observation) {
    const metrics = {
      dataPointsCollected: observation.dataPoints.length,
      duration: observation.endTime - observation.startTime,
      anomalyCount: observation.anomalies.length,
      anomalyRate: 0
    };
    
    if (metrics.dataPointsCollected > 0) {
      metrics.anomalyRate = metrics.anomalyCount / metrics.dataPointsCollected;
      metrics.samplingRate = metrics.dataPointsCollected / (metrics.duration / 1000);
    }
    
    // Device-specific metrics (e.g., for vehicles: efficiency, smoothness)
    const device = this.hal.devices.get(observation.deviceId);
    if (device && device.profile) {
      metrics.custom = this._computeCustomMetrics(observation, device.profile);
    }
    
    return metrics;
  }
  
  /**
   * Compute custom metrics based on device profile
   * @param {Object} observation - Observation record
   * @param {Object} profile - Device profile
   * @returns {Object} Custom metrics
   */
  _computeCustomMetrics(observation, profile) {
    const custom = {};
    
    // Vehicle metrics
    if (profile.deviceType && profile.deviceType.includes('vehicle')) {
      custom.efficiency = this._computeVehicleEfficiency(observation);
      custom.smoothness = this._computeVehicleSmoothness(observation);
    }
    
    // Robot metrics
    if (profile.deviceType && profile.deviceType.includes('robot')) {
      custom.batteryUsage = this._computeBatteryUsage(observation);
      custom.taskCompletion = this._computeTaskCompletion(observation);
    }
    
    return custom;
  }
  
  /**
   * Compute vehicle efficiency metrics
   */
  _computeVehicleEfficiency(observation) {
    // Look for energy/speed data
    const stats = observation.statistics;
    
    if (stats.energy && stats.speed) {
      return {
        avgEnergyPerKm: stats.energy.mean / (stats.speed.mean || 1),
        variability: stats.energy.stdDev
      };
    }
    
    return null;
  }
  
  /**
   * Compute vehicle smoothness (measure of jerky movements)
   */
  _computeVehicleSmoothness(observation) {
    const accelerations = [];
    
    // Compute acceleration from speed changes
    for (let i = 1; i < observation.dataPoints.length; i++) {
      const prev = observation.dataPoints[i - 1];
      const curr = observation.dataPoints[i];
      
      if (prev.values.speed && curr.values.speed) {
        const dt = (curr.timestamp - prev.timestamp) / 1000; // seconds
        const dv = curr.values.speed - prev.values.speed;
        accelerations.push(Math.abs(dv / dt));
      }
    }
    
    if (accelerations.length > 0) {
      return {
        avgAcceleration: accelerations.reduce((a, b) => a + b, 0) / accelerations.length,
        maxAcceleration: Math.max(...accelerations),
        jerkiness: this._stdDev(accelerations)
      };
    }
    
    return null;
  }
  
  /**
   * Compute battery usage metrics
   */
  _computeBatteryUsage(observation) {
    const stats = observation.statistics;
    
    if (stats.battery) {
      const firstBattery = observation.dataPoints[0]?.values.battery;
      const lastBattery = observation.dataPoints[observation.dataPoints.length - 1]?.values.battery;
      
      if (firstBattery && lastBattery) {
        const duration = (observation.endTime - observation.startTime) / 1000 / 3600; // hours
        const usage = firstBattery - lastBattery;
        
        return {
          totalUsage: usage,
          usageRate: usage / duration,
          avgLevel: stats.battery.mean
        };
      }
    }
    
    return null;
  }
  
  /**
   * Compute task completion metrics
   */
  _computeTaskCompletion(observation) {
    // Placeholder - would analyze task-specific data
    return {
      status: 'incomplete',
      progress: 0
    };
  }
  
  /**
   * Get observation report
   * @param {string} deviceId - Device ID
   * @returns {Object} Observation report
   */
  getReport(deviceId) {
    const observation = this.observations.get(deviceId);
    if (!observation) {
      return null;
    }
    
    return {
      deviceId,
      duration: observation.endTime ? observation.endTime - observation.startTime : Date.now() - observation.startTime,
      dataPoints: observation.dataPoints.length,
      statistics: observation.statistics,
      performance: observation.performance,
      anomalies: observation.anomalies,
      status: this.activeObservations.has(deviceId) ? 'active' : 'complete'
    };
  }
  
  /**
   * Get all active observations
   * @returns {Array} List of active observation IDs
   */
  getActiveObservations() {
    return Array.from(this.activeObservations.keys());
  }
  
  /**
   * Helper: Calculate median
   */
  _median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }
  
  /**
   * Helper: Calculate standard deviation
   */
  _stdDev(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
  
  /**
   * Clear observation data
   * @param {string} deviceId - Device ID (optional, clears all if not provided)
   */
  clearObservations(deviceId = null) {
    if (deviceId) {
      this.observations.delete(deviceId);
    } else {
      this.observations.clear();
    }
  }
}

module.exports = ObservationModule;
