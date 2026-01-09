# ALIVE Domain Expansion Framework

## Overview

The Domain Expansion Framework allows ALIVE Bot to safely expand into new areas of expertise (recipes, AI research, automotive, robotics, etc.) without modifying the core system. Each domain is a self-contained module with its own configuration, agent logic, and memory space.

## Architecture

```
ALIVE Core
    ↓
Domain Loader
    ↓
┌──────────┬──────────┬──────────┬──────────┐
│ Cooking  │Hardware  │   AI     │ Custom   │
│ Domain   │ Domain   │ Domain   │ Domain   │
└──────────┴──────────┴──────────┴──────────┘
```

## Domain Structure

Each domain is a directory under `domain/` containing:

```
domain/
└── your-domain/
    ├── domain.config.js    # Configuration & settings
    ├── domain.agent.js     # Agent logic & task processing
    └── domain.memory.json  # Optional seed memory (optional)
```

### Required Files

**1. domain.config.js**
```javascript
module.exports = {
  name: 'your-domain',
  version: '1.0.0',
  specialty: 'domain-specialty',     // REQUIRED
  description: 'Description',
  
  memoryPrefix: 'yd_',               // REQUIRED (unique)
  maxMemory: 50 * 1024 * 1024,       // 50MB limit
  
  pollingInterval: 1000,             // Milliseconds
  priority: 'medium',                // low | medium | high
  
  safetyEnabled: true,
  requiresApproval: false,
  
  capabilities: [],
  logLevel: 'info'
};
```

**2. domain.agent.js**
```javascript
class YourAgent {
  constructor(config, bot) {
    this.config = config;
    this.bot = bot;
    // Initialize your agent
  }
  
  async processTask(task) {
    // Handle incoming tasks
    return { success: true, result: {} };
  }
  
  async healthCheck() {
    // Return true if healthy
    return true;
  }
  
  async cleanup() {
    // Cleanup resources
  }
}

module.exports = YourAgent;
```

**3. domain.memory.json** (Optional)
```json
{
  "prefix_key": {
    "description": "Seed data description",
    "data": {}
  }
}
```

## Safety Checklist

Before loading any domain, the system performs safety checks:

✅ **Check 1: Memory Prefix Collision**
- Each domain must have a unique memory prefix
- Prevents data overwrites between domains

✅ **Check 2: Specialty Declaration**
- Domain must declare its specialty
- Helps with task routing

✅ **Check 3: Resource Limits**
- Max memory: 100MB per domain
- Prevents resource exhaustion

✅ **Check 4: Polling Interval**
- Minimum: 100ms
- Prevents CPU overload

✅ **Check 5: System Health**
- System health must stay > 0.6 after load
- Monitors overall system stability

## Loading Domains

### Automatic Loading

Add to your bot initialization:

```javascript
const DomainLoader = require('./core/domain-loader');

// In your bot setup
const domainLoader = new DomainLoader(bot);
await domainLoader.loadDomains('./domain');
```

### Manual Loading

```javascript
// Load specific domain
await domainLoader._loadDomain('hardware', './domain/hardware');

// Check loaded domains
const domains = domainLoader.getLoadedDomains();
console.log('Loaded:', domains);

// Get domain info
const hardwareDomain = domainLoader.getDomain('hardware');
```

## Memory Segmentation

Each domain has its own memory namespace:

```javascript
// Hardware domain uses 'hw_' prefix
hw_devices
hw_configurations
hw_history

// Cooking domain uses 'cook_' prefix  
cook_recipes
cook_preferences
cook_history
```

This prevents domains from accidentally overwriting each other's data.

## Health Monitoring

Monitor domain health:

```javascript
const health = await domainLoader.monitorHealth();
console.log('System Health:', health.systemHealth);
console.log('Domain Status:', health.domains);
```

**Health Report:**
```json
{
  "timestamp": 1234567890,
  "systemHealth": 1.0,
  "domains": {
    "hardware": {
      "healthy": true,
      "utilization": 0.3
    }
  }
}
```

## Domain Management

### Unload Domain

```javascript
await domainLoader.unloadDomain('hardware');
```

### Reload Domain

```javascript
await domainLoader.reloadDomain('hardware');
```

## Creating a New Domain

### Step 1: Create Directory Structure

```bash
mkdir -p domain/my-domain
cd domain/my-domain
```

### Step 2: Create Config

```javascript
// domain.config.js
module.exports = {
  name: 'my-domain',
  specialty: 'my-specialty',
  memoryPrefix: 'md_',
  pollingInterval: 1000,
  // ... other settings
};
```

### Step 3: Create Agent

```javascript
// domain.agent.js
class MyAgent {
  constructor(config, bot) {
    this.config = config;
    this.bot = bot;
  }
  
  async processTask(task) {
    // Your logic here
    return { success: true };
  }
  
  async healthCheck() {
    return true;
  }
}

module.exports = MyAgent;
```

### Step 4: (Optional) Add Seed Memory

```json
{
  "md_settings": {
    "description": "Default settings",
    "data": {}
  }
}
```

### Step 5: Load Domain

```javascript
await domainLoader.loadDomains();
```

## Example Domains

### Hardware Domain

Location: `domain/hardware/`
- Specialty: `hardware-integration`
- Memory: `hw_*`
- Purpose: Physical device control

### Cooking Domain (Template)

Location: `domain/cooking/`
- Specialty: `culinary-arts`
- Memory: `cook_*`
- Purpose: Recipe management

### AI Research Domain (Template)

Location: `domain/ai-research/`
- Specialty: `artificial-intelligence`
- Memory: `ai_*`
- Purpose: AI model research

## Best Practices

1. **Unique Memory Prefixes**: Always use unique prefixes (2-5 chars + underscore)
2. **Declare Specialty**: Clearly define what your domain does
3. **Resource Limits**: Stay within memory/CPU limits
4. **Health Checks**: Implement healthCheck() method
5. **Cleanup**: Always cleanup resources in cleanup() method
6. **Error Handling**: Handle errors gracefully, don't crash the bot
7. **Documentation**: Document your domain's capabilities
8. **Testing**: Test domain isolation (no cross-domain interference)

## Advanced Features

### System Bus Integration

If your bot has a system bus:

```javascript
// Domain is automatically registered as:
bot.systemBus.register('domain_hardware', agent);

// Send tasks to domain:
bot.systemBus.send('domain_hardware', task);
```

### Inter-Domain Communication

Domains can communicate through the bot instance:

```javascript
// In agent:
const cookingDomain = this.bot.domainLoader.getDomain('cooking');
const result = await cookingDomain.agent.processTask(task);
```

### Dynamic Configuration

Update configuration at runtime:

```javascript
const domain = domainLoader.getDomain('hardware');
domain.config.pollingInterval = 2000;
await domainLoader.reloadDomain('hardware');
```

## Troubleshooting

### Domain Won't Load

**Problem**: Domain not appearing in loaded list

**Solutions**:
1. Check `domain.config.js` exists and exports valid object
2. Verify `domain.agent.js` exists and exports class
3. Check specialty is declared
4. Ensure memory prefix is unique
5. Review console for error messages

### Memory Prefix Collision

**Problem**: "Memory prefix collision" error

**Solution**: Change `memoryPrefix` to a unique value

### Resource Limits Exceeded

**Problem**: "Domain exceeds memory limit"

**Solution**: Reduce `maxMemory` to under 100MB

### System Health Degraded

**Problem**: System health < 0.6 after loading

**Solution**:
1. Check domain's healthCheck() returns true
2. Reduce polling interval
3. Optimize agent logic
4. Unload unnecessary domains

## Migration Guide

### Adding Domains to Existing Bot

1. Create `domain/` directory if it doesn't exist
2. Add domain loader to bot initialization
3. Create your first domain
4. Test thoroughly before adding more domains
5. Monitor system health

### Converting Existing Features to Domains

1. Extract feature logic into agent class
2. Create domain config
3. Move feature-specific memory to domain memory
4. Update task routing
5. Test domain in isolation
6. Deploy and monitor

## Security Considerations

1. **Isolation**: Domains should not access other domains' memory directly
2. **Validation**: Validate all inputs in processTask()
3. **Resource Limits**: Enforce memory and CPU limits
4. **Permissions**: Require approval for sensitive operations
5. **Audit Logging**: Log all domain actions

## Performance

- **Memory**: Each domain limited to 100MB
- **CPU**: Polling intervals min 100ms
- **Scaling**: System supports 10-20 domains comfortably
- **Health Check**: Runs every 5 seconds by default

## Future Enhancements

- Domain dependencies
- Dynamic domain discovery
- Remote domain loading
- Domain marketplace
- Cross-domain workflows
- Domain sandboxing
- Resource quotas

## Support

For issues or questions:
1. Check domain logs
2. Run health check
3. Review safety checklist
4. Consult this guide
5. File issue in repository

---

**Ready to expand ALIVE Bot into new domains safely and systematically!**
