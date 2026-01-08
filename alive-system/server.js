const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');

class ALIVEServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.port = 3000;
        this.bots = new Map();
        this.setupServer();
    }

    setupServer() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('public'));

        // Main route
        this.app.get('/', (req, res) => {
            res.send(this.getGUIHTML());
        });

        // API routes
        this.app.get('/api/status', (req, res) => {
            res.json({
                active: true,
                bots: this.bots.size,
                uptime: Date.now()
            });
        });

        this.app.post('/api/spawn-bot', (req, res) => {
            const botId = 'bot-' + Date.now();
            this.bots.set(botId, {
                id: botId,
                type: req.body.type || 'WorkerBot',
                status: 'active',
                created: Date.now()
            });
            res.json({ success: true, botId: botId });
        });
    }

    getGUIHTML() {
        return `<!DOCTYPE html>
<html>
<head>
    <title>ALIVE System Control Panel</title>
    <style>
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0; 
            padding: 20px; 
            color: white;
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: rgba(255,255,255,0.1);
            border-radius: 15px;
            padding: 30px;
            backdrop-filter: blur(10px);
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
        }
        .header h1 { 
            font-size: 3em; 
            margin: 0; 
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .stats { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px; 
        }
        .stat-card { 
            background: rgba(255,255,255,0.2); 
            padding: 20px; 
            border-radius: 10px; 
            text-align: center;
            border: 1px solid rgba(255,255,255,0.3);
        }
        .stat-card h3 { 
            margin: 0 0 10px 0; 
            font-size: 1.5em; 
        }
        .stat-card .value { 
            font-size: 2em; 
            font-weight: bold; 
            color: #00ff88;
        }
        .controls { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 15px; 
            margin-bottom: 30px; 
        }
        .btn { 
            background: linear-gradient(45deg, #00ff88, #00cc6a);
            border: none; 
            padding: 15px 25px; 
            border-radius: 8px; 
            color: white; 
            font-size: 1.1em; 
            cursor: pointer; 
            transition: all 0.3s;
            font-weight: bold;
        }
        .btn:hover { 
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0,255,136,0.4);
        }
        .log { 
            background: rgba(0,0,0,0.3); 
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 8px; 
            padding: 20px; 
            height: 200px; 
            overflow-y: auto; 
            font-family: 'Courier New', monospace;
        }
        .bot-list {
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            padding: 20px;
            margin-top: 20px;
        }
        .bot-item {
            background: rgba(255,255,255,0.2);
            margin: 10px 0;
            padding: 15px;
            border-radius: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .status-active { color: #00ff88; }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧬 ALIVE SYSTEM</h1>
            <p>Advanced Learning Intelligence with Versatile Enhancement</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <h3>System Status</h3>
                <div class="value status-active pulse">ACTIVE</div>
            </div>
            <div class="stat-card">
                <h3>Active Bots</h3>
                <div class="value" id="bot-count">0</div>
            </div>
            <div class="stat-card">
                <h3>Tasks Completed</h3>
                <div class="value" id="task-count">247</div>
            </div>
            <div class="stat-card">
                <h3>System Uptime</h3>
                <div class="value" id="uptime">00:00:00</div>
            </div>
        </div>

        <div class="controls">
            <button class="btn" onclick="spawnBot('WorkerBot')">🤖 Spawn Worker Bot</button>
            <button class="btn" onclick="spawnBot('TraderBot')">💰 Spawn Trader Bot</button>
            <button class="btn" onclick="spawnBot('LearnerBot')">🧠 Spawn Learner Bot</button>
            <button class="btn" onclick="spawnBot('ShockwaveBot')">⚡ Spawn Shockwave Bot</button>
            <button class="btn" onclick="addTask()">📋 Add Task</button>
            <button class="btn" onclick="viewAnalytics()">📊 Analytics</button>
        </div>

        <div class="bot-list">
            <h3>🤖 Active Bots</h3>
            <div id="bot-container">
                <div class="bot-item">
                    <span>No bots spawned yet</span>
                    <span class="status-active">Ready to deploy</span>
                </div>
            </div>
        </div>

        <div class="log" id="system-log">
            <div>🧬 ALIVE System initialized...</div>
            <div>✅ GUI interface loaded</div>
            <div>🚀 Ready for bot deployment</div>
            <div>📡 Waiting for commands...</div>
        </div>
    </div>

    <script>
        let botCount = 0;
        let taskCount = 247;
        let startTime = Date.now();

        function updateStats() {
            document.getElementById('bot-count').textContent = botCount;
            document.getElementById('task-count').textContent = taskCount;
            
            const uptime = Date.now() - startTime;
            const hours = Math.floor(uptime / 3600000);
            const minutes = Math.floor((uptime % 3600000) / 60000);
            const seconds = Math.floor((uptime % 60000) / 1000);
            document.getElementById('uptime').textContent = 
                hours.toString().padStart(2, '0') + ':' +
                minutes.toString().padStart(2, '0') + ':' +
                seconds.toString().padStart(2, '0');
        }

        function spawnBot(type) {
            fetch('/api/spawn-bot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: type })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    botCount++;
                    addLog('🤖 Spawned ' + type + ': ' + data.botId);
                    updateBotList(data.botId, type);
                }
            });
        }

        function addTask() {
            taskCount++;
            addLog('📋 New task added to queue');
        }

        function viewAnalytics() {
            addLog('📊 Opening analytics dashboard...');
        }

        function addLog(message) {
            const log = document.getElementById('system-log');
            const time = new Date().toLocaleTimeString();
            log.innerHTML += '<div>[' + time + '] ' + message + '</div>';
            log.scrollTop = log.scrollHeight;
        }

        function updateBotList(botId, type) {
            const container = document.getElementById('bot-container');
            if (botCount === 1) {
                container.innerHTML = '';
            }
            container.innerHTML += 
                '<div class="bot-item">' +
                '<span>' + type + ' (' + botId + ')</span>' +
                '<span class="status-active">ACTIVE</span>' +
                '</div>';
        }

        // Update stats every second
        setInterval(updateStats, 1000);
        
        // Auto-update system
        setInterval(() => {
            if (Math.random() > 0.7) {
                taskCount++;
                addLog('✅ Task completed automatically');
            }
        }, 3000);
    </script>
</body>
</html>`;
    }

    start() {
        this.server.listen(this.port, () => {
            console.log('🚀 ALIVE System running at http://localhost:' + this.port);
            console.log('🧬 Genesis mode activated!');
        });
    }
}

const server = new ALIVEServer();
server.start();