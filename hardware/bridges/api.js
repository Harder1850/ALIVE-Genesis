/**
 * API Bridge - REST/HTTP Communication
 * 
 * Connects to devices that expose REST APIs or cloud services.
 * Suitable for smart home devices, cloud-connected vehicles, etc.
 */

const BaseConnector = require('./base-connector');
const https = require('https');
const http = require('http');

class APIBridge extends BaseConnector {
  constructor(config) {
    super(config);
    
    this.baseUrl = config.baseUrl || config.endpoint;
    this.auth = config.auth || {};
    this.timeout = config.timeout || 5000;
    this.rateLimitDelay = config.rateLimitDelay || 1000; // Min 1 second between requests
    this.lastRequest = 0;
  }
  
  /**
   * Scan for API-accessible devices
   */
  async scan() {
    // For API bridges, devices are typically pre-configured
    // This could check a discovery endpoint if available
    
    if (this.config.discoveryEndpoint) {
      try {
        const devices = await this._makeRequest('GET', this.config.discoveryEndpoint);
        return devices.map(d => ({
          type: 'api-device',
          name: d.name,
          address: d.endpoint,
          metadata: d
        }));
      } catch (error) {
        this._log('warn', 'API discovery failed', { error: error.message });
        return [];
      }
    }
    
    // Return configured device if no discovery
    if (this.baseUrl) {
      return [{
        type: 'api-device',
        name: this.config.name || 'API Device',
        address: this.baseUrl
      }];
    }
    
    return [];
  }
  
  /**
   * Connect to an API device
   */
  async connect(deviceInfo) {
    const device = {
      ...deviceInfo,
      endpoint: deviceInfo.address || this.baseUrl,
      connected: false
    };
    
    try {
      // Test connection
      const response = await this._makeRequest('GET', device.endpoint + '/status');
      
      device.connected = true;
      device.status = response;
      
      this.activeDevices.set(device.id, device);
      this._log('info', 'API device connected', { deviceId: device.id });
      
      return device;
      
    } catch (error) {
      this._log('error', 'API connection failed', { 
        deviceId: device.id, 
        error: error.message 
      });
      throw error;
    }
  }
  
  /**
   * Disconnect from API device
   */
  async disconnect(device) {
    this.activeDevices.delete(device.id);
    device.connected = false;
    this._log('info', 'API device disconnected', { deviceId: device.id });
  }
  
  /**
   * Read data from API device
   */
  async read(device, options = {}) {
    const endpoint = options.endpoint || '/data';
    const query = options.query || '';
    
    const url = device.endpoint + endpoint + (query ? '?' + query : '');
    
    try {
      const data = await this._makeRequest('GET', url);
      
      // Emit sensor data
      this._emitSensorData(device, data);
      
      return data;
      
    } catch (error) {
      this._log('error', 'API read failed', { 
        deviceId: device.id, 
        error: error.message 
      });
      throw error;
    }
  }
  
  /**
   * Write data to API device
   */
  async write(device, data, options = {}) {
    // Safety validation
    if (!this._validateSafetyConstraints(device, data, options)) {
      throw new Error('Safety constraints not met');
    }
    
    const endpoint = options.endpoint || '/control';
    const method = options.method || 'POST';
    
    const url = device.endpoint + endpoint;
    
    try {
      const response = await this._makeRequest(method, url, data);
      
      // Track last write time
      device._lastWrite = Date.now();
      
      return response;
      
    } catch (error) {
      this._log('error', 'API write failed', { 
        deviceId: device.id, 
        error: error.message 
      });
      throw error;
    }
  }
  
  /**
   * Query device capabilities
   */
  async queryCapabilities(device) {
    try {
      const caps = await this._makeRequest('GET', device.endpoint + '/capabilities');
      return caps.capabilities || [];
    } catch (error) {
      this._log('warn', 'Capability query failed, using defaults', { 
        deviceId: device.id 
      });
      return [];
    }
  }
  
  /**
   * Make HTTP/HTTPS request
   * @param {string} method - HTTP method
   * @param {string} url - URL
   * @param {Object} body - Request body (for POST/PUT)
   * @returns {Promise<Object>} Response data
   */
  _makeRequest(method, url, body = null) {
    return new Promise((resolve, reject) => {
      // Rate limiting
      const now = Date.now();
      if (now - this.lastRequest < this.rateLimitDelay) {
        const delay = this.rateLimitDelay - (now - this.lastRequest);
        setTimeout(() => {
          this._makeRequest(method, url, body).then(resolve).catch(reject);
        }, delay);
        return;
      }
      
      this.lastRequest = now;
      
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      const options = {
        method,
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ALIVE-Bot/1.0'
        }
      };
      
      // Add authentication
      if (this.auth.token) {
        options.headers['Authorization'] = `Bearer ${this.auth.token}`;
      } else if (this.auth.apiKey) {
        options.headers['X-API-Key'] = this.auth.apiKey;
      } else if (this.auth.username && this.auth.password) {
        const auth = Buffer.from(`${this.auth.username}:${this.auth.password}`).toString('base64');
        options.headers['Authorization'] = `Basic ${auth}`;
      }
      
      const req = protocol.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = data ? JSON.parse(data) : {};
              resolve(parsed);
            } catch (error) {
              resolve(data); // Return raw data if not JSON
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (body) {
        req.write(JSON.stringify(body));
      }
      
      req.end();
    });
  }
}

module.exports = APIBridge;
