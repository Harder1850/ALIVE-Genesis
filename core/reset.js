// ResetController - Detect coherence breaks and trigger resets
// Triggers when: contradictions, repeated loops without progress, new info not changing plan

class ResetController {
    constructor() {
        this.loopDetectionWindow = 5; // Check last 5 iterations
        this.contradictionThreshold = 2; // Max contradictions before reset
        this.stagnationThreshold = 3; // Iterations without progress
    }

    /**
     * Main reset check - should we reset?
     */
    shouldReset(assessment, workingMemory) {
        const reasons = [];
        
        // Check 1: Contradictions in assumptions
        if (this.hasContradictions(workingMemory)) {
            reasons.push('Contradictory assumptions detected');
        }
        
        // Check 2: Repeated loops without progress
        if (this.isStagnating(workingMemory)) {
            reasons.push('Stagnation detected - no progress in recent iterations');
        }
        
        // Check 3: New information not changing the plan
        if (this.isIgnoringNewInfo(workingMemory)) {
            reasons.push('New information not incorporated into plan');
        }
        
        // Trigger reset if any condition met
        if (reasons.length > 0) {
            console.log('🔄 Reset condition triggered:');
            reasons.forEach(reason => console.log(`   - ${reason}`));
            return true;
        }
        
        return false;
    }

    /**
     * Check for contradictions in working memory
     */
    hasContradictions(workingMemory) {
        // Use working memory's built-in contradiction detection
        return workingMemory.hasContradictions();
    }

    /**
     * Check for stagnation (repeated loops without progress)
     */
    isStagnating(workingMemory) {
        const state = workingMemory.get();
        
        // If no history, not stagnating
        if (!state.history || state.history.length < this.stagnationThreshold) {
            return false;
        }
        
        // Check last N iterations
        const recentHistory = state.history.slice(-this.stagnationThreshold);
        
        // Detect if same actions are being repeated
        const actions = recentHistory.map(h => h.action || h.inputType);
        const uniqueActions = new Set(actions);
        
        // If repeating same actions without completion, that's stagnation
        if (uniqueActions.size === 1 && !recentHistory.some(h => h.completed)) {
            console.log('🔁 Detected loop: repeating', actions[0]);
            return true;
        }
        
        // Check if results are identical (no progress)
        if (this.areResultsIdentical(recentHistory)) {
            console.log('🔁 Detected stagnation: results not changing');
            return true;
        }
        
        return false;
    }

    /**
     * Check if results are identical across recent iterations
     */
    areResultsIdentical(history) {
        if (history.length < 2) return false;
        
        // Compare last two results
        const results = history.map(h => h.result);
        
        for (let i = 1; i < results.length; i++) {
            if (JSON.stringify(results[i]) === JSON.stringify(results[i - 1])) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Check if new information is being ignored
     */
    isIgnoringNewInfo(workingMemory) {
        const state = workingMemory.get();
        
        // If no new info flag, skip check
        if (!state.newInfoReceived) return false;
        
        // Check if plan has been updated since new info
        if (state.newInfoReceived && !state.planUpdated) {
            const timeSinceNewInfo = Date.now() - state.newInfoReceivedAt;
            
            // If new info came in but plan hasn't changed in reasonable time
            if (timeSinceNewInfo > 5000) { // 5 seconds
                console.log('⚠️  New information not incorporated into plan');
                return true;
            }
        }
        
        return false;
    }

    /**
     * Perform reset diagnostics before reset
     */
    diagnose(workingMemory) {
        const diagnosis = {
            contradictions: [],
            loops: [],
            ignoredInfo: [],
            recommendation: 'none'
        };
        
        // Gather contradictions
        if (workingMemory.hasContradictions()) {
            const assumptions = workingMemory.getAssumptions();
            diagnosis.contradictions = assumptions.filter(a => a.validated === false);
        }
        
        // Identify loop patterns
        const state = workingMemory.get();
        if (state.history) {
            const actions = state.history.map(h => h.action);
            diagnosis.loops = this.findLoopPatterns(actions);
        }
        
        // Determine recommendation
        if (diagnosis.contradictions.length > 0) {
            diagnosis.recommendation = 'clear_assumptions';
        } else if (diagnosis.loops.length > 0) {
            diagnosis.recommendation = 'break_loop';
        } else {
            diagnosis.recommendation = 'clean_restart';
        }
        
        return diagnosis;
    }

    /**
     * Find repeating patterns in action history
     */
    findLoopPatterns(actions) {
        const patterns = [];
        
        // Look for A-B-A-B patterns
        for (let i = 0; i < actions.length - 3; i++) {
            if (actions[i] === actions[i + 2] && 
                actions[i + 1] === actions[i + 3]) {
                patterns.push({
                    pattern: [actions[i], actions[i + 1]],
                    start: i,
                    repetitions: 2
                });
            }
        }
        
        return patterns;
    }

    /**
     * Execute soft reset (clear assumptions but keep valid data)
     */
    softReset(workingMemory) {
        console.log('🔄 Executing soft reset...');
        
        const snapshot = workingMemory.snapshot();
        
        // Clear assumptions but keep state
        workingMemory.assumptions = [];
        
        // Mark that we've reset
        workingMemory.set('lastResetAt', Date.now());
        workingMemory.set('resetReason', 'soft_reset');
        
        console.log('✓ Soft reset complete');
    }

    /**
     * Execute hard reset (clear everything)
     */
    hardReset(workingMemory, streamMemory) {
        console.log('🔄 Executing hard reset...');
        
        // Snapshot for learning
        const snapshot = workingMemory.snapshot();
        
        // Clear working memory
        workingMemory.clear();
        
        // Collapse stream memory
        streamMemory.collapseToSummary();
        
        console.log('✓ Hard reset complete - starting fresh');
    }

    /**
     * Suggest corrective action based on diagnosis
     */
    suggestCorrection(diagnosis) {
        const suggestions = [];
        
        if (diagnosis.contradictions.length > 0) {
            suggestions.push({
                action: 'Re-validate assumptions',
                priority: 'high',
                reason: `Found ${diagnosis.contradictions.length} contradictory assumptions`
            });
        }
        
        if (diagnosis.loops.length > 0) {
            suggestions.push({
                action: 'Try alternative approach',
                priority: 'high',
                reason: `Detected ${diagnosis.loops.length} loop patterns`
            });
        }
        
        if (suggestions.length === 0) {
            suggestions.push({
                action: 'Continue normally',
                priority: 'low',
                reason: 'No critical issues detected'
            });
        }
        
        return suggestions;
    }

    /**
     * Track reset history (for learning)
     */
    trackReset(reason, workingMemory) {
        const resetEvent = {
            timestamp: Date.now(),
            reason,
            stateBefore: workingMemory.snapshot()
        };
        
        // Store in working memory for analysis
        const history = workingMemory.get('resetHistory') || [];
        history.push(resetEvent);
        workingMemory.set('resetHistory', history);
        
        // If too many resets, there's a deeper problem
        if (history.length > 3) {
            console.log('⚠️  Multiple resets detected - may indicate systemic issue');
        }
    }

    /**
     * Check if reset is actually needed or if we can recover
     */
    canRecover(workingMemory) {
        // If only minor contradictions, might be able to recover
        const assumptions = workingMemory.getAssumptions();
        const invalidAssumptions = assumptions.filter(a => a.validated === false);
        
        if (invalidAssumptions.length === 1) {
            console.log('💡 Can recover by invalidating single assumption');
            return {
                canRecover: true,
                method: 'invalidate_assumption',
                target: invalidAssumptions[0]
            };
        }
        
        // If stuck in simple loop, can break with alternative
        const state = workingMemory.get();
        if (state.history && state.history.length === 2) {
            console.log('💡 Can recover by trying alternative approach');
            return {
                canRecover: true,
                method: 'try_alternative',
                target: state.history[state.history.length - 1]
            };
        }
        
        return {
            canRecover: false,
            method: 'full_reset'
        };
    }

    /**
     * Get reset statistics
     */
    getStats(workingMemory) {
        const history = workingMemory.get('resetHistory') || [];
        
        return {
            totalResets: history.length,
            reasons: this.groupBy(history, 'reason'),
            averageTimeBetweenResets: this.calculateAverageTime(history),
            lastReset: history.length > 0 ? history[history.length - 1] : null
        };
    }

    /**
     * Helper: Group array by property
     */
    groupBy(array, property) {
        return array.reduce((acc, item) => {
            const key = item[property];
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
    }

    /**
     * Helper: Calculate average time between events
     */
    calculateAverageTime(events) {
        if (events.length < 2) return 0;
        
        let totalTime = 0;
        for (let i = 1; i < events.length; i++) {
            totalTime += events[i].timestamp - events[i - 1].timestamp;
        }
        
        return totalTime / (events.length - 1);
    }
}

module.exports = ResetController;
