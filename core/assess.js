// Assessor - Evaluate urgency, stakes, difficulty, precision
// Outputs: urgency (NOW/SOON/LATER), stakes (low/medium/high), 
//          difficulty (easy/moderate/hard/critical), precision (strict/flexible)

class Assessor {
    constructor() {
        this.urgencyKeywords = {
            NOW: ['urgent', 'immediately', 'now', 'asap', 'emergency', 'critical', 'burning'],
            SOON: ['soon', 'shortly', 'quick', 'fast', 'today', 'need'],
            LATER: ['later', 'eventually', 'sometime', 'when', 'maybe', 'consider']
        };
        
        this.stakesKeywords = {
            high: ['important', 'critical', 'must', 'essential', 'crucial', 'vital', 'safety', 'health'],
            medium: ['should', 'would', 'prefer', 'better', 'want'],
            low: ['optional', 'nice', 'could', 'might', 'curious']
        };
    }

    /**
     * Main assessment function
     */
    async evaluate(streamEntry, memory) {
        const input = streamEntry.input;
        const context = streamEntry.context || {};
        
        const assessment = {
            urgency: this.assessUrgency(input, context, memory),
            stakes: this.assessStakes(input, context, memory),
            difficulty: this.assessDifficulty(input, context, memory),
            precision: this.assessPrecision(input, context, memory),
            inputType: this.classifyInput(input),
            timestamp: Date.now()
        };
        
        // Add reasoning
        assessment.reasoning = this.generateReasoning(assessment, input);
        
        return assessment;
    }

    /**
     * Assess urgency: NOW / SOON / LATER
     */
    assessUrgency(input, context, memory) {
        const inputStr = String(input).toLowerCase();
        
        // Check for explicit urgency indicators
        if (this.containsKeywords(inputStr, this.urgencyKeywords.NOW)) {
            return 'NOW';
        }
        
        // Context-based urgency
        if (context.resetTriggered) {
            return 'NOW'; // After reset, treat as urgent
        }
        
        // Check working memory for active tasks
        const activeTask = memory.working.getActiveTask();
        if (activeTask && activeTask.urgent) {
            return 'NOW';
        }
        
        // Check for time-sensitive cooking terms
        if (this.isTimeSensitive(inputStr)) {
            return 'NOW';
        }
        
        // SOON indicators
        if (this.containsKeywords(inputStr, this.urgencyKeywords.SOON)) {
            return 'SOON';
        }
        
        // Default to LATER for planning/research
        return 'LATER';
    }

    /**
     * Assess stakes: low / medium / high
     */
    assessStakes(input, context, memory) {
        const inputStr = String(input).toLowerCase();
        
        // High stakes indicators
        if (this.containsKeywords(inputStr, this.stakesKeywords.high)) {
            return 'high';
        }
        
        // Safety-related is high stakes
        if (inputStr.includes('safe') || inputStr.includes('temperature') || 
            inputStr.includes('food safety') || inputStr.includes('poison')) {
            return 'high';
        }
        
        // Substitutions can be high stakes (allergies, etc.)
        if (inputStr.includes('allerg') || inputStr.includes('intolerance')) {
            return 'high';
        }
        
        // Medium stakes indicators
        if (this.containsKeywords(inputStr, this.stakesKeywords.medium)) {
            return 'medium';
        }
        
        // Recipe comparison is medium stakes
        if (inputStr.includes('compare')) {
            return 'medium';
        }
        
        // Low stakes (exploration, curiosity)
        if (this.containsKeywords(inputStr, this.stakesKeywords.low)) {
            return 'low';
        }
        
        // Default to medium
        return 'medium';
    }

    /**
     * Assess difficulty: easy / moderate / hard / critical
     */
    assessDifficulty(input, context, memory) {
        const inputStr = String(input).toLowerCase();
        
        // Critical: requires external resources or complex reasoning
        if (inputStr.includes('convert') && inputStr.includes('custom')) {
            return 'critical';
        }
        
        if (inputStr.includes('compare') && inputStr.includes('multiple')) {
            return 'critical';
        }
        
        // Hard: requires synthesis or multiple steps
        if (inputStr.includes('compare') || inputStr.includes('analyze')) {
            return 'hard';
        }
        
        if (inputStr.includes('substitute') && inputStr.includes('multiple')) {
            return 'hard';
        }
        
        // Moderate: requires lookup or single computation
        if (inputStr.includes('convert') || inputStr.includes('substitute')) {
            return 'moderate';
        }
        
        if (inputStr.includes('recipe') && (inputStr.includes('add') || inputStr.includes('save'))) {
            return 'moderate';
        }
        
        // Easy: simple retrieval
        if (inputStr.includes('get') || inputStr.includes('show') || inputStr.includes('list')) {
            return 'easy';
        }
        
        // Default to moderate
        return 'moderate';
    }

    /**
     * Assess precision mode: strict / flexible
     */
    assessPrecision(input, context, memory) {
        const inputStr = String(input).toLowerCase();
        
        // Strict mode for:
        // - Conversions (exact math)
        // - Safety/temperature queries
        // - Schema/form filling
        // - Explicit "exact" requests
        
        if (inputStr.includes('exact') || inputStr.includes('precise') || 
            inputStr.includes('convert') || inputStr.includes('temperature') ||
            inputStr.includes('safe') || inputStr.includes('must')) {
            return 'strict';
        }
        
        // Check if input is a form/schema (structured data)
        if (context.schema || context.form) {
            return 'strict';
        }
        
        // Flexible mode for:
        // - Brainstorming
        // - Variations
        // - General exploration
        // - "Good enough" scenarios
        
        if (inputStr.includes('idea') || inputStr.includes('suggestion') ||
            inputStr.includes('variation') || inputStr.includes('alternative') ||
            inputStr.includes('option')) {
            return 'flexible';
        }
        
        // Default to flexible for cooking (creativity encouraged)
        return 'flexible';
    }

    /**
     * Classify input type
     */
    classifyInput(input) {
        const inputStr = String(input).toLowerCase();
        
        if (inputStr.includes('recipe')) {
            if (inputStr.includes('add') || inputStr.includes('save')) return 'recipe_add';
            if (inputStr.includes('search') || inputStr.includes('find')) return 'recipe_search';
            if (inputStr.includes('compare')) return 'recipe_compare';
            return 'recipe';
        }
        
        if (inputStr.includes('compare')) return 'compare';
        if (inputStr.includes('substitute') || inputStr.includes('replace')) return 'substitute';
        if (inputStr.includes('convert')) return 'conversion';
        if (inputStr.includes('shop') || inputStr.includes('list')) return 'shopping';
        if (inputStr.includes('plan')) return 'planning';
        
        return 'general';
    }

    /**
     * Check if input is time-sensitive (cooking in progress)
     */
    isTimeSensitive(inputStr) {
        const timeWords = ['boiling', 'cooking', 'burning', 'timing', 'timer', 
                          'done', 'ready', 'overcook', 'undercook'];
        
        for (const word of timeWords) {
            if (inputStr.includes(word)) return true;
        }
        
        return false;
    }

    /**
     * Check if string contains any keywords from list
     */
    containsKeywords(str, keywords) {
        for (const keyword of keywords) {
            if (str.includes(keyword)) return true;
        }
        return false;
    }

    /**
     * Generate human-readable reasoning for assessment
     */
    generateReasoning(assessment, input) {
        const reasons = [];
        
        // Urgency reasoning
        if (assessment.urgency === 'NOW') {
            reasons.push('Requires immediate attention');
        } else if (assessment.urgency === 'SOON') {
            reasons.push('Should be handled promptly');
        } else {
            reasons.push('Can be planned/deferred');
        }
        
        // Stakes reasoning
        if (assessment.stakes === 'high') {
            reasons.push('High importance - critical outcome');
        } else if (assessment.stakes === 'medium') {
            reasons.push('Moderate importance');
        } else {
            reasons.push('Low stakes - exploratory');
        }
        
        // Difficulty reasoning
        if (assessment.difficulty === 'critical') {
            reasons.push('Complex - requires external resources');
        } else if (assessment.difficulty === 'hard') {
            reasons.push('Challenging - multi-step reasoning');
        } else if (assessment.difficulty === 'moderate') {
            reasons.push('Moderate complexity');
        } else {
            reasons.push('Straightforward task');
        }
        
        // Precision reasoning
        if (assessment.precision === 'strict') {
            reasons.push('Requires exact/deterministic output');
        } else {
            reasons.push('Flexible - good enough is acceptable');
        }
        
        return reasons.join('; ');
    }
}

module.exports = Assessor;
