/**
 * Capability Detection & System Profiling Module
 * 
 * Automatically identifies device capabilities and interfaces when ALIVE Bot
 * connects to a new system. Works closely with hardware plugins to perform
 * device discovery.
 */

class DetectionModule {
  constructor(hal) {
    this.hal = hal;
    this.detectionCache = new Map();
    this.profileLibrary = new Map();
  }
  
  /**
   * Perform comprehensive device detection
   * @param {Object} options - Detection options
   * @returns {Promise<Array>} Detected and profiled devices
   */
  async detectAndProfile(options = {}) {
    const results = {
      devices: [],
      timestamp: new Date().toISOString(),
      duration: 0
    };
    
    const startTime = Date.now();
    
    try {
      // Step 1: Bus scanning across all bridges
      const rawDevices = await this.hal.detectDevices();
      
      // Step 2: Query capabilities for each device
      for (const device of rawDevices) {
        try {
          const profiledDevice = await this._profileDevice(device);
          results.devices.push(profiledDevice);
        } catch (error) {
          console.error(`Failed to profile device ${device.id}:`, error.message);
          // Include device even if profiling failed
          device.profileError = error.message;
          results.devices.push(device);
        }
      }
      
      // Step 3: Match against known profiles
      for (const device of results.devices) {
        if (!device.profileError) {
          await this._matchProfile(device);
        }
      }
      
      // Step 4: Register functional sub-modules
      for (const device of results.devices) {
        if (device.profile && device.profile.modules) {
          device.subModules = this._registerSubModules(device);
        }
      }
      
      results.duration = Date.now() - startTime;
      
      // Cache results
      for (const device of results.devices) {
        this.detectionCache.set(device.id, {
          device,
          detectedAt: Date.now()
        });
      }
      
      return results.devices;
      
    } catch (error) {
      console.error('Detection failed:', error);
      throw error;
    }
  }
  
  /**
   * Profile a single device - query its capabilities
   * @param {Object} device - Raw device info
   * @returns {Promise<Object>} Profiled device
   */
  async _profileDevice(device) {
    // Connect temporarily to query capabilities
    const connected = await this.hal.connectDevice(device);
    
    try {
      // Query device for its capabilities
      const capabilities = await this._queryCapabilities(connected);
      
      device.capabilities = capabilities;
      device.profiledAt = Date.now();
      
      return device;
      
    } finally {
      // Disconnect after profiling (unless configured to stay connected)
      // await this.hal.disconnectDevice(device.id);
    }
  }
  
  /**
   * Query device capabilities through appropriate bridge
   * @param {Object} device - Connected device
   * @returns {Promise<Array>} List of capabilities
   */
  async _queryCapabilities(device) {
    const capabilities = [];
    
    // Try to read capability descriptor if device supports it
    try {
      const bridge = this.hal.bridges.get(device.bridge);
      
      if (typeof bridge.queryCapabilities === 'function') {
        return await bridge.queryCapabilities(device);
      }
      
      // For devices with profiles, capabilities come from profile
      if (device.profile && device.profile.capabilities) {
        return device.profile.capabilities;
      }
      
      // Generic capability detection
      // Try to read some standard endpoints/signals
      const testReads = [
        { type: 'status', description: 'Device status' },
        { type: 'version', description: 'Firmware version' },
        { type: 'sensors', description: 'Available sensors' }
      ];
      
      for (const test of testReads) {
        try {
          const data = await this.hal.read(device.id, { query: test.type });
          if (data) {
            capabilities.push({
              type: test.type,
              available: true,
              data
            });
          }
        } catch (error) {
          // Capability not available
        }
      }
      
    } catch (error) {
      console.error('Capability query failed:', error);
    }
    
    return capabilities;
  }
  
  /**
   * Match device against known profiles
   * @param {Object} device - Device to match
   */
  async _matchProfile(device) {
    // Device already has profile from HAL
    if (device.profile && device.profile.deviceType !== 'generic') {
      return;
    }
    
    // Try to match based on detected characteristics
    for (const [profileName, profile] of this.profileLibrary) {
      if (this._profileMatches(device, profile)) {
        device.profile = profile;
        device.matchedProfile = profileName;
        break;
      }
    }
  }
  
  /**
   * Check if device matches a profile
   * @param {Object} device - Device to check
   * @param {Object} profile - Profile to match against
   * @returns {boolean} Whether device matches profile
   */
  _profileMatches(device, profile) {
    // Match by device type
    if (profile.deviceType && device.type === profile.deviceType) {
      return true;
    }
    
    // Match by capabilities
    if (profile.requiredCapabilities) {
      const deviceCaps = new Set(device.capabilities.map(c => c.type));
      const hasAllRequired = profile.requiredCapabilities.every(
        cap => deviceCaps.has(cap)
      );
      if (hasAllRequired) {
        return true;
      }
    }
    
    // Match by signature (e.g., CAN ID patterns for vehicles)
    if (profile.signature && device.signature) {
      return this._signatureMatches(device.signature, profile.signature);
    }
    
    return false;
  }
  
  /**
   * Check if device signature matches profile signature
   * @param {Object} deviceSig - Device signature
   * @param {Object} profileSig - Profile signature
   * @returns {boolean} Whether signatures match
   */
  _signatureMatches(deviceSig, profileSig) {
    // Simple string matching for now
    if (typeof deviceSig === 'string' && typeof profileSig === 'string') {
      return deviceSig.includes(profileSig) || profileSig.includes(deviceSig);
    }
    
    // Pattern matching for complex signatures
    if (typeof profileSig === 'object') {
      for (const [key, value] of Object.entries(profileSig)) {
        if (deviceSig[key] !== value) {
          return false;
        }
      }
      return true;
    }
    
    return false;
  }
  
  /**
   * Register functional sub-modules for a device
   * @param {Object} device - Device with profile
   * @returns {Array} Registered sub-modules
   */
  _registerSubModules(device) {
    const subModules = [];
    
    for (const moduleConfig of device.profile.modules || []) {
      const subModule = {
        name: moduleConfig.name,
        type: moduleConfig.type,
        dataChannels: moduleConfig.dataChannels || [],
        controlAPI: moduleConfig.controlAPI || [],
        deviceId: device.id
      };
      
      subModules.push(subModule);
    }
    
    return subModules;
  }
  
  /**
   * Load a profile into the library
   * @param {string} name - Profile name
   * @param {Object} profile - Profile definition
   */
  loadProfile(name, profile) {
    this.profileLibrary.set(name, profile);
  }
  
  /**
   * Get cached detection results
   * @param {string} deviceId - Device ID
   * @returns {Object|null} Cached detection result
   */
  getCached(deviceId) {
    const cached = this.detectionCache.get(deviceId);
    if (!cached) return null;
    
    // Return if cache is less than 5 minutes old
    const age = Date.now() - cached.detectedAt;
    if (age < 5 * 60 * 1000) {
      return cached.device;
    }
    
    return null;
  }
  
  /**
   * Clear detection cache
   */
  clearCache() {
    this.detectionCache.clear();
  }
  
  /**
   * Get detection summary
   * @returns {Object} Summary of detected devices
   */
  getSummary() {
    const devices = Array.from(this.detectionCache.values());
    
    return {
      totalDevices: devices.length,
      byBridge: this._groupBy(devices.map(d => d.device), 'bridge'),
      byType: this._groupBy(devices.map(d => d.device), 'type'),
      profiledDevices: devices.filter(d => d.device.profile).length
    };
  }
  
  /**
   * Group devices by property
   * @param {Array} devices - List of devices
   * @param {string} property - Property to group by
   * @returns {Object} Grouped counts
   */
  _groupBy(devices, property) {
    const groups = {};
    for (const device of devices) {
      const key = device[property] || 'unknown';
      groups[key] = (groups[key] || 0) + 1;
    }
    return groups;
  }
}

module.exports = DetectionModule;
