/**
 * Hardware Abstraction Layer (HAL)
 * 
 * Central coordination system for ALIVE Bot hardware integration.
 * Provides unified device API, event hub, plugin management, and safety controls.
 */

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;

class HardwareAbstractionLayer extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      pluginDir: options.pluginDir || path.join(__dirname, 'bridges'),
      profileDir: options.profileDir || path.join(__dirname, 'profiles'),
      logDir: options.logDir || path.join(__dirname, '../storage/hardware-logs'),
      safetyEnabled: options.safetyEnabled !== false, // Default true
      ...options
    };
    
    // Plugin registry
    this.bridges = new Map();
    this.devices = new Map();
    this.profiles = new Map();
    
    // Central event hub for hardware events
    this.eventHub = new EventEmitter();
    this.eventHub.setMaxListeners(100); // Support many sensors
    
    // Safety state tracking
    this.safetyState = {
      emergencyStop: false,
      userOverride: false,
      activeControls: new Set()
    };
    
    // Audit log
    this.auditLog = [];
    
    this._initializeEventHub();
  }
  
  /**
   * Initialize the central event hub
   * All hardware modules publish/subscribe through this hub
   */
  _initializeEventHub() {
    // Forward hardware events to external listeners
    this.eventHub.on('sensor:data', (data) => {
      this.emit('sensor:data', data);
    });
    
    this.eventHub.on('device:connected', (device) => {
      this.emit('device:connected', device);
      this._log('info', 'Device connected', { deviceId: device.id });
    });
    
    this.eventHub.on('device:disconnected', (device) => {
      this.emit('device:disconnected', device);
      this._log('warn', 'Device disconnected', { deviceId: device.id });
    });
    
    this.eventHub.on('error', (error) => {
      this.emit('error', error);
      this._log('error', 'Hardware error', { error: error.message });
    });
    
    this.eventHub.on('safety:alert', (alert) => {
      this.emit('safety:alert', alert);
      this._handleSafetyAlert(alert);
    });
  }
  
  /**
   * Load a communication bridge plugin
   * @param {string} bridgeType - Type of bridge (can, usb, bluetooth, gpio, api)
   * @param {Object} config - Bridge-specific configuration
   */
  async loadPlugin(bridgeType, config = {}) {
    try {
      const bridgePath = path.join(this.config.pluginDir, `${bridgeType}.js`);
      const BridgeClass = require(bridgePath);
      
      const bridge = new BridgeClass({
        ...config,
        eventHub: this.eventHub,
        safetyEnabled: this.config.safetyEnabled
      });
      
      this.bridges.set(bridgeType, bridge);
      
      this._log('info', 'Plugin loaded', { bridgeType });
      this.emit('plugin:loaded', { bridgeType });
      
      return bridge;
    } catch (error) {
      this._log('error', 'Failed to load plugin', { bridgeType, error: error.message });
      throw new Error(`Failed to load plugin ${bridgeType}: ${error.message}`);
    }
  }
  
  /**
   * Unload a bridge plugin
   * @param {string} bridgeType - Type of bridge to unload
   */
  async unloadPlugin(bridgeType) {
    const bridge = this.bridges.get(bridgeType);
    if (!bridge) {
      throw new Error(`Bridge ${bridgeType} not loaded`);
    }
    
    // Disconnect all devices using this bridge
    for (const [deviceId, device] of this.devices) {
      if (device.bridge === bridgeType) {
        await this.disconnectDevice(deviceId);
      }
    }
    
    if (typeof bridge.shutdown === 'function') {
      await bridge.shutdown();
    }
    
    this.bridges.delete(bridgeType);
    this._log('info', 'Plugin unloaded', { bridgeType });
  }
  
  /**
   * Detect available devices across all loaded bridges
   * @returns {Array} List of detected devices
   */
  async detectDevices() {
    const detectedDevices = [];
    
    for (const [bridgeType, bridge] of this.bridges) {
      try {
        if (typeof bridge.scan === 'function') {
          const devices = await bridge.scan();
          for (const device of devices) {
            device.bridge = bridgeType;
            device.id = `${bridgeType}:${device.address || device.port || device.name}`;
            detectedDevices.push(device);
          }
        }
      } catch (error) {
        this._log('error', 'Device detection failed', { 
          bridgeType, 
          error: error.message 
        });
      }
    }
    
    this._log('info', 'Device detection complete', { 
      count: detectedDevices.length 
    });
    
    return detectedDevices;
  }
  
  /**
   * Connect to a specific device
   * @param {Object} deviceInfo - Device information from detection
   * @returns {Object} Connected device object
   */
  async connectDevice(deviceInfo) {
    const bridge = this.bridges.get(deviceInfo.bridge);
    if (!bridge) {
      throw new Error(`Bridge ${deviceInfo.bridge} not loaded`);
    }
    
    // Connect through bridge
    const device = await bridge.connect(deviceInfo);
    device.id = deviceInfo.id;
    device.bridge = deviceInfo.bridge;
    device.connectedAt = Date.now();
    
    // Load device profile if available
    await this._loadDeviceProfile(device);
    
    // Register device
    this.devices.set(device.id, device);
    
    this.eventHub.emit('device:connected', device);
    
    return device;
  }
  
  /**
   * Disconnect from a device
   * @param {string} deviceId - Device ID
   */
  async disconnectDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }
    
    const bridge = this.bridges.get(device.bridge);
    if (bridge && typeof bridge.disconnect === 'function') {
      await bridge.disconnect(device);
    }
    
    this.devices.delete(deviceId);
    this.eventHub.emit('device:disconnected', device);
  }
  
  /**
   * Load device profile (capability descriptor)
   * @param {Object} device - Device object
   */
  async _loadDeviceProfile(device) {
    try {
      // Try to load profile based on device type
      const profilePath = path.join(
        this.config.profileDir, 
        `${device.type || 'generic'}.json`
      );
      
      const profileData = await fs.readFile(profilePath, 'utf8');
      const profile = JSON.parse(profileData);
      
      device.profile = profile;
      device.capabilities = profile.capabilities || [];
      
      this._log('info', 'Device profile loaded', { 
        deviceId: device.id, 
        profile: device.type 
      });
    } catch (error) {
      // No profile found, use generic
      device.profile = { deviceType: 'generic', capabilities: [] };
      device.capabilities = [];
      
      this._log('debug', 'No profile found, using generic', { 
        deviceId: device.id 
      });
    }
  }
  
  /**
   * Read data from a device
   * @param {string} deviceId - Device ID
   * @param {Object} options - Read options
   * @returns {*} Data read from device
   */
  async read(deviceId, options = {}) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not connected`);
    }
    
    const bridge = this.bridges.get(device.bridge);
    if (!bridge || typeof bridge.read !== 'function') {
      throw new Error(`Bridge ${device.bridge} does not support reading`);
    }
    
    return await bridge.read(device, options);
  }
  
  /**
   * Write data to a device (with safety checks)
   * @param {string} deviceId - Device ID
   * @param {*} data - Data to write
   * @param {Object} options - Write options
   */
  async write(deviceId, data, options = {}) {
    // Safety checks
    if (this.config.safetyEnabled) {
      if (this.safetyState.emergencyStop) {
        throw new Error('Emergency stop active - write operations disabled');
      }
      
      if (this.safetyState.userOverride) {
        throw new Error('User override active - hardware control disabled');
      }
      
      // Require explicit approval for control commands
      if (!options.approved && options.requiresApproval !== false) {
        throw new Error('Write operation requires user approval');
      }
    }
    
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device ${deviceId} not connected`);
    }
    
    const bridge = this.bridges.get(device.bridge);
    if (!bridge || typeof bridge.write !== 'function') {
      throw new Error(`Bridge ${device.bridge} does not support writing`);
    }
    
    // Track active control
    this.safetyState.activeControls.add(deviceId);
    
    try {
      const result = await bridge.write(device, data, options);
      
      // Audit log
      this._log('audit', 'Write operation', {
        deviceId,
        data: typeof data === 'object' ? '[object]' : data,
        approved: options.approved || false
      });
      
      return result;
    } finally {
      this.safetyState.activeControls.delete(deviceId);
    }
  }
  
  /**
   * Emergency stop - halt all hardware control immediately
   */
  emergencyStop() {
    this.safetyState.emergencyStop = true;
    
    // Emit emergency stop to all bridges
    this.eventHub.emit('safety:emergency_stop');
    
    this._log('critical', 'EMERGENCY STOP ACTIVATED');
    
    // Attempt to safely disconnect all devices
    for (const [deviceId] of this.devices) {
      this.disconnectDevice(deviceId).catch(err => {
        this._log('error', 'Emergency disconnect failed', { 
          deviceId, 
          error: err.message 
        });
      });
    }
  }
  
  /**
   * Reset emergency stop
   */
  resetEmergencyStop() {
    this.safetyState.emergencyStop = false;
    this._log('info', 'Emergency stop reset');
  }
  
  /**
   * Set user override (gives control back to user)
   * @param {boolean} enabled - Enable/disable override
   */
  setUserOverride(enabled) {
    this.safetyState.userOverride = enabled;
    this._log('info', enabled ? 'User override enabled' : 'User override disabled');
    this.emit('safety:user_override', { enabled });
  }
  
  /**
   * Handle safety alerts from hardware
   * @param {Object} alert - Safety alert
   */
  _handleSafetyAlert(alert) {
    this._log('warn', 'Safety alert received', alert);
    
    // Auto-trigger emergency stop for critical alerts
    if (alert.level === 'critical') {
      this.emergencyStop();
    }
  }
  
  /**
   * Get system status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      bridges: Array.from(this.bridges.keys()),
      devices: Array.from(this.devices.values()).map(d => ({
        id: d.id,
        type: d.type,
        bridge: d.bridge,
        connectedAt: d.connectedAt,
        capabilities: d.capabilities
      })),
      safety: {
        enabled: this.config.safetyEnabled,
        emergencyStop: this.safetyState.emergencyStop,
        userOverride: this.safetyState.userOverride,
        activeControls: Array.from(this.safetyState.activeControls)
      }
    };
  }
  
  /**
   * Internal logging
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  _log(level, message, data = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...data
    };
    
    this.auditLog.push(entry);
    
    // Keep last 1000 entries in memory
    if (this.auditLog.length > 1000) {
      this.auditLog.shift();
    }
    
    // Emit log event
    this.emit('log', entry);
    
    // Console output for critical/error
    if (level === 'critical' || level === 'error') {
      console.error(`[HAL ${level.toUpperCase()}]`, message, data);
    }
  }
  
  /**
   * Get audit log
   * @param {Object} filter - Filter options
   * @returns {Array} Filtered log entries
   */
  getAuditLog(filter = {}) {
    let logs = this.auditLog;
    
    if (filter.level) {
      logs = logs.filter(entry => entry.level === filter.level);
    }
    
    if (filter.since) {
      logs = logs.filter(entry => new Date(entry.timestamp) >= new Date(filter.since));
    }
    
    if (filter.deviceId) {
      logs = logs.filter(entry => entry.deviceId === filter.deviceId);
    }
    
    return logs;
  }
  
  /**
   * Shutdown HAL and cleanup resources
   */
  async shutdown() {
    this._log('info', 'Shutting down HAL');
    
    // Disconnect all devices
    for (const deviceId of this.devices.keys()) {
      try {
        await this.disconnectDevice(deviceId);
      } catch (error) {
        this._log('error', 'Shutdown disconnect failed', { 
          deviceId, 
          error: error.message 
        });
      }
    }
    
    // Unload all plugins
    for (const bridgeType of this.bridges.keys()) {
      try {
        await this.unloadPlugin(bridgeType);
      } catch (error) {
        this._log('error', 'Shutdown unload failed', { 
          bridgeType, 
          error: error.message 
        });
      }
    }
    
    this.removeAllListeners();
    this.eventHub.removeAllListeners();
  }
}

module.exports = HardwareAbstractionLayer;
