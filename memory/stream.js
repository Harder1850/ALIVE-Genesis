// StreamMemory - Consciousness Buffer (Rolling Window)
// Adaptive window: active → short, relaxed → long, idle → summary

class StreamMemory {
    constructor() {
        this.buffer = [];
        this.maxSize = 100; // Default
        this.windowMode = 'RELAXED'; // ACTIVE | RELAXED | IDLE
        this.lastActivity = Date.now();
        this.summary = null;
    }

    /**
     * Add entry to stream
     */
    add(entry) {
        this.buffer.push({
            ...entry,
            id: this.generateId(),
            addedAt: Date.now()
        });
        
        // Update activity timestamp
        this.lastActivity = Date.now();
        
        // Adjust window mode based on activity
        this.adjustWindowMode();
        
        // Trim if over capacity
        this.trim();
    }

    /**
     * Adjust window size based on activity pattern
     */
    adjustWindowMode() {
        const timeSinceLastActivity = Date.now() - this.lastActivity;
        const recentActivityCount = this.getRecentActivityCount(60000); // Last minute
        
        // Active: rapid back-and-forth, shrink to recent items
        if (recentActivityCount >= 5) {
            this.windowMode = 'ACTIVE';
            this.maxSize = 20; // Small window
        }
        // Relaxed: normal pace
        else if (timeSinceLastActivity < 300000) { // 5 minutes
            this.windowMode = 'RELAXED';
            this.maxSize = 100;
        }
        // Idle: collapse to summary
        else {
            this.windowMode = 'IDLE';
            this.collapseToSummary();
        }
    }

    /**
     * Get recent activity count in time window
     */
    getRecentActivityCount(windowMs) {
        const cutoff = Date.now() - windowMs;
        return this.buffer.filter(entry => entry.addedAt > cutoff).length;
    }

    /**
     * Trim buffer to max size
     */
    trim() {
        if (this.buffer.length > this.maxSize) {
            // Keep most recent entries
            const removed = this.buffer.splice(0, this.buffer.length - this.maxSize);
            
            // Update summary with removed entries
            this.updateSummary(removed);
        }
    }

    /**
     * Collapse buffer to summary (idle mode)
     */
    collapseToSummary() {
        if (this.buffer.length === 0) return;
        
        this.summary = {
            count: this.buffer.length,
            timespan: {
                start: this.buffer[0].timestamp,
                end: this.buffer[this.buffer.length - 1].timestamp
            },
            inputTypes: this.extractInputTypes(this.buffer),
            keyTopics: this.extractKeyTopics(this.buffer),
            collapsedAt: Date.now()
        };
        
        // Keep only last few entries
        this.buffer = this.buffer.slice(-5);
    }

    /**
     * Update summary with removed entries
     */
    updateSummary(entries) {
        if (!this.summary) {
            this.summary = {
                count: 0,
                inputTypes: {},
                keyTopics: []
            };
        }
        
        this.summary.count += entries.length;
        
        const types = this.extractInputTypes(entries);
        for (const [type, count] of Object.entries(types)) {
            this.summary.inputTypes[type] = (this.summary.inputTypes[type] || 0) + count;
        }
    }

    /**
     * Extract input types from buffer
     */
    extractInputTypes(buffer) {
        const types = {};
        for (const entry of buffer) {
            const type = this.classifyInput(entry.input);
            types[type] = (types[type] || 0) + 1;
        }
        return types;
    }

    /**
     * Extract key topics from buffer
     */
    extractKeyTopics(buffer) {
        // Simple keyword extraction
        const keywords = new Map();
        
        for (const entry of buffer) {
            if (typeof entry.input === 'string') {
                const words = entry.input.toLowerCase().match(/\b\w{4,}\b/g) || [];
                for (const word of words) {
                    keywords.set(word, (keywords.get(word) || 0) + 1);
                }
            }
        }
        
        // Return top 5 keywords
        return Array.from(keywords.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);
    }

    /**
     * Classify input
     */
    classifyInput(input) {
        if (typeof input === 'string') {
            const lower = input.toLowerCase();
            if (lower.includes('recipe')) return 'recipe';
            if (lower.includes('compare')) return 'compare';
            if (lower.includes('substitute')) return 'substitute';
            if (lower.includes('convert')) return 'conversion';
        }
        return 'general';
    }

    /**
     * Get recent entries (N most recent)
     */
    getRecent(count = 10) {
        return this.buffer.slice(-count);
    }

    /**
     * Search buffer
     */
    search(query) {
        const lower = query.toLowerCase();
        return this.buffer.filter(entry => {
            const input = String(entry.input).toLowerCase();
            return input.includes(lower);
        });
    }

    /**
     * Get all entries
     */
    getAll() {
        return [...this.buffer];
    }

    /**
     * Get buffer size
     */
    size() {
        return this.buffer.length;
    }

    /**
     * Get status
     */
    getStatus() {
        return {
            size: this.buffer.length,
            maxSize: this.maxSize,
            mode: this.windowMode,
            summary: this.summary,
            lastActivity: this.lastActivity
        };
    }

    /**
     * Clear buffer
     */
    clear() {
        this.buffer = [];
        this.summary = null;
        this.lastActivity = Date.now();
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

module.exports = StreamMemory;
