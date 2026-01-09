/**
 * Domain Loader
 * 
 * Safely loads and registers domain modules into ALIVE Bot.
 * Each domain is isolated with its own memory space and agent logic.
 */

const fs = require('fs');
const path = require('path');

class DomainLoader {
  constructor(bot) {
    this.bot = bot;
    this.domains = new Map();
    this.domainHealth = new Map();
    this.memoryPrefixes = new Set();
  }
  
  /**
   * Load all domains from the domains directory
   * @param {string} domainsDir - Path to domains directory
   */
  async loadDomains(domainsDir = './domain') {
    console.log('🧩 Loading domain modules...\n');
    
    try {
      const domainDirs = fs.readdirSync(domainsDir);
      
      for (const dir of domainDirs) {
        const domainPath = path.join(domainsDir, dir);
        const stat = fs.statSync(domainPath);
        
        if (stat.isDirectory()) {
          await this._loadDomain(dir, domainPath);
        }
      }
      
      console.log(`\n✅ Loaded ${this.domains.size} domain(s)`);
      this._printDomainSummary();
      
    } catch (error) {
      console.error('❌ Failed to load domains:', error.message);
      throw error;
    }
  }
  
  /**
   * Load a single domain
   * @param {string} name - Domain name
   * @param {string} domainPath - Path to domain directory
   */
  async _loadDomain(name, domainPath) {
    console.log(`📦 Loading domain: ${name}`);
    
    try {
      // Check for required files
      const configPath = path.join(domainPath, 'domain.config.js');
      const agentPath = path.join(domainPath, 'domain.agent.js');
      
      if (!fs.existsSync(configPath)) {
        console.log(`   ⚠️  Skipping ${name}: No domain.config.js found`);
        return;
      }
      
      if (!fs.existsSync(agentPath)) {
        console.log(`   ⚠️  Skipping ${name}: No domain.agent.js found`);
        return;
      }
      
      // Load configuration
      const config = require(path.resolve(configPath));
      
      // Run safety checks
      const safetyCheck = this._runSafetyChecks(name, config);
      if (!safetyCheck.safe) {
        console.log(`   ❌ Safety check failed: ${safetyCheck.reason}`);
        return;
      }
      
      // Load agent
      const Agent = require(path.resolve(agentPath));
      const agent = new Agent(config, this.bot);
      
      // Load optional seed memory
      const memoryPath = path.join(domainPath, 'domain.memory.json');
      let seedMemory = null;
      if (fs.existsSync(memoryPath)) {
        seedMemory = JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
        console.log(`   📝 Loaded seed memory (${Object.keys(seedMemory).length} entries)`);
      }
      
      // Register with system bus
      const domainId = `domain_${name}`;
      if (this.bot.systemBus) {
        this.bot.systemBus.register(domainId, agent);
      }
      
      // Store domain info
      this.domains.set(name, {
        config,
        agent,
        seedMemory,
        loadedAt: Date.now(),
        memoryPrefix: config.memoryPrefix || `${name}_`
      });
      
      // Track memory prefix
      this.memoryPrefixes.add(config.memoryPrefix || `${name}_`);
      
      // Initialize health tracking
      this.domainHealth.set(name, {
        healthy: true,
        lastCheck: Date.now(),
        utilization: 0
      });
      
      console.log(`   ✅ Domain loaded successfully`);
      console.log(`   📍 Specialty: ${config.specialty || 'general'}`);
      console.log(`   🔄 Polling interval: ${config.pollingInterval || 'default'}ms`);
      console.log(`   💾 Memory prefix: ${config.memoryPrefix || `${name}_`}`);
      
    } catch (error) {
      console.log(`   ❌ Failed to load domain: ${error.message}`);
    }
  }
  
  /**
   * Run safety checks before loading domain
   * @param {string} name - Domain name
   * @param {Object} config - Domain configuration
   * @returns {Object} Safety check result
   */
  _runSafetyChecks(name, config) {
    // Check 1: Memory prefix collision
    const memoryPrefix = config.memoryPrefix || `${name}_`;
    if (this.memoryPrefixes.has(memoryPrefix)) {
      return {
        safe: false,
        reason: `Memory prefix collision: ${memoryPrefix} already in use`
      };
    }
    
    // Check 2: Specialty declared
    if (!config.specialty) {
      return {
        safe: false,
        reason: 'Domain must declare its specialty'
      };
    }
    
    // Check 3: Resource limits
    if (config.maxMemory && config.maxMemory > 100 * 1024 * 1024) { // 100MB limit
      return {
        safe: false,
        reason: 'Domain exceeds memory limit (100MB)'
      };
    }
    
    // Check 4: Polling interval sanity
    if (config.pollingInterval && config.pollingInterval < 100) {
      return {
        safe: false,
        reason: 'Polling interval too low (min 100ms)'
      };
    }
    
    return { safe: true };
  }
  
  /**
   * Print summary of loaded domains
   */
  _printDomainSummary() {
    console.log('\n📊 Domain Summary:');
    for (const [name, info] of this.domains) {
      console.log(`   ${name}:`);
      console.log(`     Specialty: ${info.config.specialty}`);
      console.log(`     Memory: ${info.memoryPrefix}*`);
      console.log(`     Status: Active`);
    }
  }
  
  /**
   * Monitor domain health
   * @returns {Object} Health report
   */
  async monitorHealth() {
    const report = {
      timestamp: Date.now(),
      systemHealth: 1.0,
      domains: {}
    };
    
    for (const [name, domain] of this.domains) {
      const health = this.domainHealth.get(name);
      
      // Check agent responsiveness
      let responsive = true;
      try {
        if (typeof domain.agent.healthCheck === 'function') {
          responsive = await domain.agent.healthCheck();
        }
      } catch (error) {
        responsive = false;
      }
      
      // Update health
      health.healthy = responsive;
      health.lastCheck = Date.now();
      
      report.domains[name] = {
        healthy: health.healthy,
        utilization: health.utilization
      };
      
      // Reduce system health if domain unhealthy
      if (!health.healthy) {
        report.systemHealth -= 0.2;
      }
    }
    
    report.systemHealth = Math.max(0, report.systemHealth);
    
    return report;
  }
  
  /**
   * Get domain by name
   * @param {string} name - Domain name
   * @returns {Object} Domain info
   */
  getDomain(name) {
    return this.domains.get(name);
  }
  
  /**
   * Get all loaded domains
   * @returns {Array} List of domain names
   */
  getLoadedDomains() {
    return Array.from(this.domains.keys());
  }
  
  /**
   * Unload a domain
   * @param {string} name - Domain name
   */
  async unloadDomain(name) {
    const domain = this.domains.get(name);
    if (!domain) {
      throw new Error(`Domain ${name} not found`);
    }
    
    // Call cleanup if available
    if (typeof domain.agent.cleanup === 'function') {
      await domain.agent.cleanup();
    }
    
    // Unregister from system bus
    if (this.bot.systemBus) {
      this.bot.systemBus.unregister(`domain_${name}`);
    }
    
    // Remove from tracking
    this.domains.delete(name);
    this.domainHealth.delete(name);
    this.memoryPrefixes.delete(domain.memoryPrefix);
    
    console.log(`✅ Domain ${name} unloaded`);
  }
  
  /**
   * Reload a domain
   * @param {string} name - Domain name
   */
  async reloadDomain(name) {
    const domain = this.domains.get(name);
    if (!domain) {
      throw new Error(`Domain ${name} not found`);
    }
    
    console.log(`🔄 Reloading domain: ${name}`);
    
    // Store path before unloading
    const domainPath = path.join('./domain', name);
    
    // Unload
    await this.unloadDomain(name);
    
    // Clear require cache
    const configPath = path.resolve(domainPath, 'domain.config.js');
    const agentPath = path.resolve(domainPath, 'domain.agent.js');
    delete require.cache[configPath];
    delete require.cache[agentPath];
    
    // Reload
    await this._loadDomain(name, domainPath);
  }
}

module.exports = DomainLoader;
