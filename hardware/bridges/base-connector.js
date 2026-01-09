/**
 * Base Connector Class
 * 
 * Abstract base class that all hardware bridge plugins must extend.
 * Provides common interface and safety mechanisms.
 */

const EventEmitter = require('events');

class BaseConnector extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = config;
    this.eventHub = config.eventHub;
    this.safetyEnabled = config.safetyEnabled !== false;
    this.connected = false;
    this.activeDevices = new Map();
    
    // Listen for emergency stop
    if (this.eventHub) {
      this.eventHub.on('safety:emergency_stop', () => {
        this._handleEmergencyStop();
      });
    }
  }
  
  /**
   * Scan for available devices
   * Must be implemented by subclasses
   * @returns {Promise<Array>} List of detected devices
   */
  async scan() {
    throw new Error('scan() must be implemented by subclass');
  }
  
  /**
   * Connect to a device
   * Must be implemented by subclasses
   * @param {Object} deviceInfo - Device information
   * @returns {Promise<Object>} Connected device object
   */
  async connect(deviceInfo) {
    throw new Error('connect() must be implemented by subclass');
  }
  
  /**
   * Disconnect from a device
   * Must be implemented by subclasses
   * @param {Object} device - Device object
   */
  async disconnect(device) {
    throw new Error('disconnect() must be implemented by subclass');
  }
  
  /**
   * Read data from device
   * Must be implemented by subclasses
   * @param {Object} device - Device object
   * @param {Object} options - Read options
   * @returns {Promise<*>} Data read from device
   */
  async read(device, options = {}) {
    throw new Error('read() must be implemented by subclass');
  }
  
  /**
   * Write data to device
   * Must be implemented by subclasses
   * @param {Object} device - Device object
   * @param {*} data - Data to write
   * @param {Object} options - Write options
   */
  async write(device, data, options = {}) {
    throw new Error('write() must be implemented by subclass');
  }
  
  /**
   * Handle emergency stop
   * Default implementation - can be overridden
   */
  _handleEmergencyStop() {
    this._log('warn', 'Emergency stop received - halting all operations');
    
    // Attempt to safely disconnect all devices
    for (const [deviceId, device] of this.activeDevices) {
      this.disconnect(device).catch(err => {
        this._log('error', 'Emergency disconnect failed', { 
          deviceId, 
          error: err.message 
        });
      });
    }
  }
  
  /**
   * Validate safety constraints before write operation
   * @param {Object} device - Device object
   * @param {*} data - Data to write
   * @param {Object} options - Write options
   * @returns {boolean} Whether write is safe
   */
  _validateSafetyConstraints(device, data, options) {
    if (!this.safetyEnabled) {
      return true;
    }
    
    // Check if device supports this command
    if (device.profile && device.profile.safeCommands) {
      const commandType = options.commandType || 'generic';
      if (!device.profile.safeCommands.includes(commandType)) {
        this._log('warn', 'Command not in safe list', { 
          deviceId: device.id, 
          commandType 
        });
        return false;
      }
    }
    
    // Check rate limiting
    if (options.rateLimit && device._lastWrite) {
      const timeSinceLastWrite = Date.now() - device._lastWrite;
      if (timeSinceLastWrite < options.rateLimit) {
        this._log('warn', 'Rate limit exceeded', { deviceId: device.id });
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Emit sensor data through event hub
   * @param {Object} device - Device object
   * @param {Object} data - Sensor data
   */
  _emitSensorData(device, data) {
    if (this.eventHub) {
      this.eventHub.emit('sensor:data', {
        deviceId: device.id,
        timestamp: Date.now(),
        ...data
      });
    }
  }
  
  /**
   * Emit safety alert
   * @param {Object} alert - Alert information
   */
  _emitSafetyAlert(alert) {
    if (this.eventHub) {
      this.eventHub.emit('safety:alert', {
        timestamp: Date.now(),
        source: this.constructor.name,
        ...alert
      });
    }
  }
  
  /**
   * Log message
   * @param {string} level - Log level
   * @param {string} message - Message
   * @param {Object} data - Additional data
   */
  _log(level, message, data = {}) {
    if (this.eventHub) {
      this.eventHub.emit('log', {
        timestamp: Date.now(),
        level,
        source: this.constructor.name,
        message,
        ...data
      });
    }
    
    // Also log to console for debugging
    if (level === 'error' || level === 'warn') {
      console[level](`[${this.constructor.name}] ${message}`, data);
    }
  }
  
  /**
   * Shutdown connector and cleanup
   */
  async shutdown() {
    this._log('info', 'Shutting down connector');
    
    // Disconnect all devices
    for (const device of this.activeDevices.values()) {
      try {
        await this.disconnect(device);
      } catch (error) {
        this._log('error', 'Shutdown disconnect failed', { error: error.message });
      }
    }
    
    this.activeDevices.clear();
    this.removeAllListeners();
  }
  
  /**
   * Get connector status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      type: this.constructor.name,
      connected: this.connected,
      activeDevices: this.activeDevices.size,
      safetyEnabled: this.safetyEnabled
    };
  }
}

module.exports = BaseConnector;
