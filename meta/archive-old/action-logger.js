// Action Logger - Records all task executions for MetaLoop analysis
// Writes to JSONL (JSON Lines) format for easy append and analysis

const fs = require('fs');
const path = require('path');

class ActionLogger {
    constructor() {
        this.logDir = path.join(__dirname, '../logs');
        this.logFile = path.join(this.logDir, 'actions.jsonl');
        this.ensureLogDir();
    }

    /**
     * Ensure logs directory exists
     */
    ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    /**
     * Log an action (append-only)
     */
    log(action) {
        const entry = {
            taskId: action.taskId || this.generateTaskId(),
            timestamp: Date.now(),
            isoTimestamp: new Date().toISOString(),
            ...action
        };

        // Write as single line JSON
        const line = JSON.stringify(entry) + '\n';
        
        try {
            fs.appendFileSync(this.logFile, line, 'utf8');
        } catch (error) {
            console.error('Failed to write action log:', error.message);
        }
    }

    /**
     * Read recent actions (last N entries)
     */
    readRecent(count = 10) {
        try {
            if (!fs.existsSync(this.logFile)) {
                return [];
            }

            const content = fs.readFileSync(this.logFile, 'utf8');
            const lines = content.trim().split('\n').filter(l => l);
            
            // Get last N lines
            const recent = lines.slice(-count);
            return recent.map(line => JSON.parse(line));
            
        } catch (error) {
            console.error('Failed to read action log:', error.message);
            return [];
        }
    }

    /**
     * Read all actions
     */
    readAll() {
        try {
            if (!fs.existsSync(this.logFile)) {
                return [];
            }

            const content = fs.readFileSync(this.logFile, 'utf8');
            const lines = content.trim().split('\n').filter(l => l);
            return lines.map(line => JSON.parse(line));
            
        } catch (error) {
            console.error('Failed to read all actions:', error.message);
            return [];
        }
    }

    /**
     * Find actions by type
     */
    findByType(type, limit = 10) {
        const all = this.readAll();
        return all.filter(a => a.taskType === type).slice(-limit);
    }

    /**
     * Generate unique task ID
     */
    generateTaskId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    /**
     * Get log file path
     */
    getLogPath() {
        return this.logFile;
    }
}

module.exports = ActionLogger;
