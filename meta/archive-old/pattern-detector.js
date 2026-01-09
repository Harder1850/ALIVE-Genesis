// Pattern Detector - Identifies repeated successful patterns
// Triggers playbook draft creation when pattern repeats ≥3 times

const ActionLogger = require('./action-logger');

class PatternDetector {
    constructor() {
        this.logger = new ActionLogger();
        this.minPatternOccurrences = 3;
        this.promotedPatterns = new Map(); // Track what's been promoted
    }

    /**
     * Analyze recent actions for patterns
     */
    analyzeForPatterns(newAction) {
        const recentActions = this.logger.findByType(newAction.taskType, 20);
        
        // Look for similar successful actions
        const similarActions = recentActions.filter(action =>
            action.success &&
            !action.userCorrected &&
            this.isSimilarPattern(action, newAction)
        );

        if (similarActions.length >= this.minPatternOccurrences) {
            return this.extractPattern(similarActions, newAction);
        }

        return null;
    }

    /**
     * Check if two actions follow similar pattern
     */
    isSimilarPattern(action1, action2) {
        // Same task type
        if (action1.taskType !== action2.taskType) return false;

        // Similar steps (at least 70% overlap)
        const steps1 = action1.steps || [];
        const steps2 = action2.steps || [];
        
        if (steps1.length === 0 || steps2.length === 0) return false;
        
        const commonSteps = steps1.filter(s => steps2.includes(s));
        const overlapRatio = commonSteps.length / Math.max(steps1.length, steps2.length);
        
        return overlapRatio >= 0.7;
    }

    /**
     * Extract pattern from similar actions
     */
    extractPattern(similarActions, newAction) {
        // Find common steps
        const allSteps = similarActions.map(a => a.steps || []);
        const commonSteps = allSteps[0].filter(step =>
            allSteps.every(steps => steps.includes(step))
        );

        // Find common context/keywords
        const allInputs = similarActions.map(a => String(a.input).toLowerCase());
        const commonKeywords = this.extractCommonKeywords(allInputs);

        // Find common lookups
        const allLookups = similarActions.map(a => a.lookups || []);
        const commonLookups = allLookups[0]?.filter(lookup =>
            allLookups.every(lookups => lookups.some(l => l.type === lookup.type))
        ) || [];

        return {
            patternId: this.generatePatternId(newAction.taskType, commonKeywords),
            name: `${newAction.taskType}-${commonKeywords.join('-')}`,
            taskType: newAction.taskType,
            occurrences: similarActions.length + 1,
            commonSteps,
            commonKeywords,
            commonLookups: commonLookups.map(l => ({ type: l.type })),
            avgTime: this.calculateAverageTime(similarActions),
            successRate: 1.0, // All filtered actions were successful
            examples: similarActions.slice(-3).map(a => ({
                input: a.input,
                timestamp: a.isoTimestamp
            })),
            detectedAt: new Date().toISOString()
        };
    }

    /**
     * Extract common keywords from inputs
     */
    extractCommonKeywords(inputs) {
        const stopWords = ['the', 'a', 'an', 'in', 'for', 'to', 'and', 'or', 'of', 'i', 'me'];
        
        // Get all words from all inputs
        const allWords = inputs.flatMap(input => 
            input.split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w))
        );

        // Count occurrences
        const wordCounts = {};
        for (const word of allWords) {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
        }

        // Find words that appear in all inputs
        const threshold = inputs.length;
        const commonWords = Object.entries(wordCounts)
            .filter(([_, count]) => count >= threshold)
            .map(([word, _]) => word)
            .slice(0, 3); // Top 3

        return commonWords;
    }

    /**
     * Calculate average execution time
     */
    calculateAverageTime(actions) {
        const times = actions.map(a => a.timeSpent || 0).filter(t => t > 0);
        if (times.length === 0) return 0;
        return Math.round(times.reduce((sum, t) => sum + t, 0) / times.length);
    }

    /**
     * Generate pattern ID
     */
    generatePatternId(taskType, keywords) {
        const keywordStr = keywords.join('_');
        return `pattern_${taskType}_${keywordStr}`.toLowerCase().replace(/[^a-z0-9_]/g, '');
    }

    /**
     * Check if pattern should be promoted to playbook
     */
    shouldPromotePattern(pattern) {
        // Already promoted?
        if (this.promotedPatterns.has(pattern.patternId)) {
            return false;
        }

        // Meets occurrence threshold?
        if (pattern.occurrences < this.minPatternOccurrences) {
            return false;
        }

        // High success rate?
        if (pattern.successRate < 0.9) {
            return false;
        }

        return true;
    }

    /**
     * Mark pattern as promoted
     */
    markAsPromoted(patternId) {
        this.promotedPatterns.set(patternId, {
            promotedAt: Date.now(),
            isoTimestamp: new Date().toISOString()
        });
    }

    /**
     * Get promoted patterns
     */
    getPromotedPatterns() {
        return Array.from(this.promotedPatterns.entries()).map(([id, data]) => ({
            patternId: id,
            ...data
        }));
    }
}

module.exports = PatternDetector;
