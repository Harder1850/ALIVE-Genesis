// Value Tracker - Tracks which steps/lookups actually change outcomes
// Reduces priority for low-value steps over time

const fs = require('fs');
const path = require('path');

class ValueTracker {
    constructor() {
        this.configDir = path.join(__dirname, '../config');
        this.configFile = path.join(this.configDir, 'meta-config.json');
        this.config = this.loadConfig();
    }

    /**
     * Load or initialize config
     */
    loadConfig() {
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }

        if (fs.existsSync(this.configFile)) {
            try {
                const content = fs.readFileSync(this.configFile, 'utf8');
                return JSON.parse(content);
            } catch (error) {
                console.error('Failed to load meta-config:', error.message);
                return this.getDefaultConfig();
            }
        }

        return this.getDefaultConfig();
    }

    /**
     * Get default configuration
     */
    getDefaultConfig() {
        return {
            stepValues: {},
            thresholds: {
                lowValueTrigger: 3,  // 3 consecutive non-uses
                minValueScore: 0.3,  // Below this = low value
                priorityReduction: 3 // Reduce priority by this amount
            },
            lastUpdated: Date.now()
        };
    }

    /**
     * Save configuration
     */
    saveConfig() {
        try {
            this.config.lastUpdated = Date.now();
            fs.writeFileSync(
                this.configFile,
                JSON.stringify(this.config, null, 2),
                'utf8'
            );
        } catch (error) {
            console.error('Failed to save meta-config:', error.message);
        }
    }

    /**
     * Record step value (did it change the outcome?)
     * Uses EMA for valueScore and hysteresis for stability
     */
    recordStepValue(stepName, didChangeOutcome) {
        if (!this.config.stepValues[stepName]) {
            this.config.stepValues[stepName] = {
                totalUses: 0,
                changedOutcome: 0,
                consecutiveNonChanges: 0,
                consecutiveLowValue: 0, // NEW: count consecutive low-value observations
                priority: 5, // Default priority
                lastUsed: Date.now(),
                valueScore: 1.0, // Start optimistic
                emaAlpha: 0.3, // EMA smoothing factor
                history: [],
                avgCostMs: 100 // Initial estimate for step cost
            };
        }

        const step = this.config.stepValues[stepName];
        step.totalUses++;
        step.lastUsed = Date.now();

        if (didChangeOutcome) {
            step.changedOutcome++;
            step.consecutiveNonChanges = 0;
        } else {
            step.consecutiveNonChanges++;
        }

        // Keep last 10 uses in history
        step.history.push({
            timestamp: Date.now(),
            didChangeOutcome
        });
        if (step.history.length > 10) {
            step.history.shift();
        }

        // HYSTERESIS: Only update value score after minimum samples
        if (step.totalUses >= 3) {
            // Use EMA (Exponential Moving Average) for smooth value score
            const currentValue = didChangeOutcome ? 1.0 : 0.0;
            step.valueScore = step.emaAlpha * currentValue + (1 - step.emaAlpha) * step.valueScore;
            
            // Track consecutive low-value observations
            if (step.valueScore < this.config.thresholds.minValueScore) {
                step.consecutiveLowValue = (step.consecutiveLowValue || 0) + 1;
            } else {
                step.consecutiveLowValue = 0;
            }
            
            // STABILITY: Only reduce priority if value stays low for 3 consecutive observations
            if (step.consecutiveLowValue >= 3 && step.consecutiveNonChanges >= 3) {
                this.reducePriority(stepName);
            }
        }

        this.saveConfig();
    }

    /**
     * Update step cost estimate (for budget pressure calculation)
     */
    updateStepCost(stepName, costMs) {
        if (!this.config.stepValues[stepName]) {
            return; // Step not tracked yet
        }
        
        const step = this.config.stepValues[stepName];
        const alpha = 0.3; // EMA factor
        step.avgCostMs = alpha * costMs + (1 - alpha) * (step.avgCostMs || 100);
        this.saveConfig();
    }

    /**
     * Get average cost estimate for a step
     */
    getStepCostEstimate(stepName) {
        const step = this.config.stepValues?.[stepName];
        return step?.avgCostMs || 100; // Default 100ms if unknown
    }

    /**
     * Reduce priority for low-value step
     */
    reducePriority(stepName) {
        const step = this.config.stepValues[stepName];
        const reduction = this.config.thresholds.priorityReduction;
        const oldPriority = step.priority;
        
        step.priority = Math.max(1, step.priority - reduction);
        
        if (step.priority !== oldPriority) {
            console.log(`📉 MetaLoop: Reduced priority for "${stepName}" from ${oldPriority} to ${step.priority}`);
            console.log(`   Reason: ${step.consecutiveNonChanges} consecutive non-changes`);
            
            step.priorityReductions = (step.priorityReductions || 0) + 1;
            step.lastReduction = Date.now();
            step.reductionReason = `${step.consecutiveNonChanges} consecutive times did not change outcome`;
        }
    }

    /**
     * Get step priority (for executor to use)
     */
    getStepPriority(stepName) {
        if (!this.config.stepValues[stepName]) {
            return 5; // Default priority
        }
        return this.config.stepValues[stepName].priority;
    }

    /**
     * Get step value score
     */
    getStepValueScore(stepName) {
        if (!this.config.stepValues[stepName]) {
            return 1.0; // Unknown = assume valuable
        }
        return this.config.stepValues[stepName].valueScore;
    }

    /**
     * Should skip step based on priority and budget?
     */
    shouldSkipStep(stepName, budgetTight = false) {
        const priority = this.getStepPriority(stepName);
        const valueScore = this.getStepValueScore(stepName);
        
        // If budget is tight and step is low priority/value, skip it
        if (budgetTight && priority <= 2 && valueScore < this.config.thresholds.minValueScore) {
            return true;
        }
        
        return false;
    }

    /**
     * Get low-value steps (for debugging)
     */
    getLowValueSteps() {
        const lowValue = [];
        
        for (const [stepName, data] of Object.entries(this.config.stepValues)) {
            if (data.priority <= 3 || data.valueScore < this.config.thresholds.minValueScore) {
                lowValue.push({
                    step: stepName,
                    priority: data.priority,
                    valueScore: data.valueScore,
                    totalUses: data.totalUses,
                    changedOutcome: data.changedOutcome,
                    reason: data.reductionReason || 'Low value score'
                });
            }
        }
        
        return lowValue.sort((a, b) => a.valueScore - b.valueScore);
    }

    /**
     * Get statistics
     */
    getStats() {
        const steps = Object.entries(this.config.stepValues);
        
        return {
            totalSteps: steps.length,
            lowValueSteps: this.getLowValueSteps().length,
            avgValueScore: steps.reduce((sum, [_, data]) => sum + data.valueScore, 0) / steps.length || 0,
            totalPriorityReductions: steps.reduce((sum, [_, data]) => sum + (data.priorityReductions || 0), 0)
        };
    }

    /**
     * Reset step priority (manual override)
     */
    resetStepPriority(stepName, newPriority = 5) {
        if (this.config.stepValues[stepName]) {
            this.config.stepValues[stepName].priority = newPriority;
            this.config.stepValues[stepName].consecutiveNonChanges = 0;
            this.saveConfig();
            console.log(`🔄 Reset priority for "${stepName}" to ${newPriority}`);
        }
    }
}

module.exports = ValueTracker;
