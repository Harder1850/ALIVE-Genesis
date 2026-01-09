// WorkingMemory - Active Session State
// Current task, assumptions, active recipe, shopping list
// Decays unless promoted to long-term

class WorkingMemory {
    constructor() {
        this.state = {};
        this.assumptions = [];
        this.activeTask = null;
        this.sessionStart = Date.now();
        this.lastUpdate = Date.now();
        this.decayThreshold = 3600000; // 1 hour
    }

    /**
     * Update working memory with new info
     */
    update(data) {
        this.lastUpdate = Date.now();
        
        // Merge new data into state
        this.state = {
            ...this.state,
            ...data,
            timestamp: Date.now()
        };
        
        // Track assumptions if provided
        if (data.assumption) {
            this.assumptions.push({
                text: data.assumption,
                timestamp: Date.now(),
                confidence: data.confidence || 0.8
            });
        }
        
        // Update active task if provided
        if (data.task) {
            this.activeTask = {
                ...data.task,
                updatedAt: Date.now()
            };
        }
    }

    /**
     * Get current state
     */
    get(key) {
        if (key) {
            return this.state[key];
        }
        return { ...this.state };
    }

    /**
     * Set specific key
     */
    set(key, value) {
        this.state[key] = value;
        this.lastUpdate = Date.now();
    }

    /**
     * Add assumption
     */
    addAssumption(text, confidence = 0.8) {
        this.assumptions.push({
            text,
            timestamp: Date.now(),
            confidence,
            validated: false
        });
    }

    /**
     * Validate assumption
     */
    validateAssumption(index, isValid) {
        if (this.assumptions[index]) {
            this.assumptions[index].validated = isValid;
            this.assumptions[index].validatedAt = Date.now();
        }
    }

    /**
     * Check for contradictions in assumptions
     */
    hasContradictions() {
        // Simple contradiction detection
        const validated = this.assumptions.filter(a => a.validated !== undefined);
        
        if (validated.length < 2) return false;
        
        // Check if same topic has conflicting validations
        // This is a simplified version - real implementation would be more sophisticated
        const topics = {};
        for (const assumption of validated) {
            const topic = this.extractTopic(assumption.text);
            if (!topics[topic]) {
                topics[topic] = [];
            }
            topics[topic].push(assumption.validated);
        }
        
        // If any topic has both true and false, that's a contradiction
        for (const validations of Object.values(topics)) {
            if (validations.includes(true) && validations.includes(false)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Extract topic from assumption text (simplified)
     */
    extractTopic(text) {
        // Simple keyword extraction
        const keywords = ['ingredient', 'temperature', 'time', 'method', 'tool'];
        for (const keyword of keywords) {
            if (text.toLowerCase().includes(keyword)) {
                return keyword;
            }
        }
        return 'general';
    }

    /**
     * Get active task
     */
    getActiveTask() {
        return this.activeTask;
    }

    /**
     * Set active task
     */
    setActiveTask(task) {
        this.activeTask = {
            ...task,
            startedAt: Date.now()
        };
        this.lastUpdate = Date.now();
    }

    /**
     * Clear active task
     */
    clearActiveTask() {
        this.activeTask = null;
        this.lastUpdate = Date.now();
    }

    /**
     * Decay old items
     */
    decay() {
        const now = Date.now();
        const age = now - this.lastUpdate;
        
        if (age > this.decayThreshold) {
            // Archive old assumptions
            this.assumptions = this.assumptions.filter(a => {
                return (now - a.timestamp) < this.decayThreshold;
            });
            
            // Clear stale state items
            const stateKeys = Object.keys(this.state);
            for (const key of stateKeys) {
                if (this.state[key] && this.state[key].timestamp) {
                    if ((now - this.state[key].timestamp) > this.decayThreshold) {
                        delete this.state[key];
                    }
                }
            }
        }
    }

    /**
     * Snapshot current state (for reset)
     */
    snapshot() {
        return {
            state: { ...this.state },
            assumptions: [...this.assumptions],
            activeTask: this.activeTask ? { ...this.activeTask } : null,
            sessionDuration: Date.now() - this.sessionStart,
            learned: this.extractLearnings()
        };
    }

    /**
     * Extract learnings from session
     */
    extractLearnings() {
        const learnings = [];
        
        // Validated assumptions are learnings
        for (const assumption of this.assumptions) {
            if (assumption.validated === true && assumption.confidence > 0.7) {
                learnings.push({
                    type: 'assumption',
                    content: assumption.text,
                    confidence: assumption.confidence
                });
            }
        }
        
        // Successful tasks are learnings
        if (this.activeTask && this.activeTask.completed && this.activeTask.successful) {
            learnings.push({
                type: 'task',
                content: this.activeTask.description || 'Task completed',
                method: this.activeTask.method
            });
        }
        
        return learnings;
    }

    /**
     * Clear all working memory
     */
    clear() {
        this.state = {};
        this.assumptions = [];
        this.activeTask = null;
        this.lastUpdate = Date.now();
        console.log('🧹 Working memory cleared');
    }

    /**
     * Get memory size
     */
    size() {
        return Object.keys(this.state).length + this.assumptions.length + (this.activeTask ? 1 : 0);
    }

    /**
     * Get status
     */
    getStatus() {
        return {
            stateKeys: Object.keys(this.state).length,
            assumptions: this.assumptions.length,
            hasActiveTask: !!this.activeTask,
            activeTask: this.activeTask ? this.activeTask.description : null,
            sessionAge: Date.now() - this.sessionStart,
            lastUpdate: this.lastUpdate,
            hasContradictions: this.hasContradictions()
        };
    }

    /**
     * Check if memory is stale
     */
    isStale() {
        return (Date.now() - this.lastUpdate) > this.decayThreshold;
    }

    /**
     * Get all assumptions
     */
    getAssumptions() {
        return [...this.assumptions];
    }
}

module.exports = WorkingMemory;
