// BudgetGovernor - Time/Compute Resource Allocation
// Enforces time/compute ceilings per task
// Stops "research loops" when marginal value stops changing the decision
// If time expires: choose best reversible action and proceed

class BudgetGovernor {
    constructor() {
        this.defaultTimeBudget = 30000; // 30 seconds
        this.urgencyMultipliers = {
            NOW: 0.5,    // Half the time for urgent tasks
            SOON: 1.0,   // Normal time
            LATER: 2.0   // Can take longer
        };
        
        this.difficultyMultipliers = {
            easy: 0.5,
            moderate: 1.0,
            hard: 1.5,
            critical: 2.5
        };
    }

    /**
     * Main budget allocation function
     */
    async allocate(triage, assessment) {
        const budget = {
            tasks: [],
            totalTime: 0,
            totalCompute: 0,
            cutoffTime: this.calculateTotalBudget(assessment),
            emergencyAction: null,
            timestamp: Date.now()
        };
        
        // Allocate time to each priority task
        for (const task of triage.priorities) {
            const taskBudget = this.allocateTaskBudget(task, assessment);
            budget.tasks.push(taskBudget);
            budget.totalTime += taskBudget.maxTime;
            budget.totalCompute += taskBudget.maxIterations;
        }
        
        // Prepare emergency action (best reversible option)
        budget.emergencyAction = this.selectEmergencyAction(triage, assessment);
        
        return budget;
    }

    /**
     * Calculate total time budget based on assessment
     */
    calculateTotalBudget(assessment) {
        let baseBudget = this.defaultTimeBudget;
        
        // Apply urgency multiplier
        baseBudget *= this.urgencyMultipliers[assessment.urgency] || 1.0;
        
        // Apply difficulty multiplier
        baseBudget *= this.difficultyMultipliers[assessment.difficulty] || 1.0;
        
        // Precision mode gets stricter time limits
        if (assessment.precision === 'strict') {
            baseBudget *= 0.8;
        }
        
        return Math.round(baseBudget);
    }

    /**
     * Allocate budget for individual task
     */
    allocateTaskBudget(task, assessment) {
        const baseTime = this.defaultTimeBudget / 3; // Split among top 3 tasks
        
        let taskTime = baseTime;
        
        // Adjust for task type
        const timeMultipliers = {
            retrieval: 0.5,      // Fast
            validation: 0.7,
            computation: 0.8,
            parsing: 0.6,
            analysis: 1.2,       // Slower
            generation: 1.3,
            presentation: 0.9
        };
        
        taskTime *= timeMultipliers[task.type] || 1.0;
        
        // Apply urgency
        if (assessment.urgency === 'NOW') {
            taskTime *= 0.6; // Less time for urgent tasks
        }
        
        return {
            task: task.action,
            maxTime: Math.round(taskTime),
            maxIterations: this.calculateMaxIterations(task),
            timePerIteration: Math.round(taskTime / this.calculateMaxIterations(task)),
            startedAt: null,
            completedAt: null,
            exceeded: false
        };
    }

    /**
     * Calculate max iterations (for research loops)
     */
    calculateMaxIterations(task) {
        // Tasks that can loop
        const iterativeTasks = ['search', 'analyze', 'compare', 'find', 'gather'];
        
        const isIterative = iterativeTasks.some(keyword => 
            task.action.includes(keyword)
        );
        
        if (isIterative) {
            return 5; // Max 5 iterations for research
        }
        
        return 1; // Non-iterative tasks
    }

    /**
     * Check if task is within budget
     */
    isWithinBudget(taskBudget) {
        if (!taskBudget.startedAt) return true;
        
        const elapsed = Date.now() - taskBudget.startedAt;
        return elapsed < taskBudget.maxTime;
    }

    /**
     * Check if should continue iteration (marginal value check)
     */
    shouldContinueIteration(iteration, previousResults) {
        if (iteration >= 5) return false; // Hard cap
        
        // If no previous results, continue
        if (!previousResults || previousResults.length < 2) return true;
        
        // Calculate marginal value (how much improvement in last iteration)
        const recent = previousResults.slice(-2);
        const marginalValue = this.calculateMarginalValue(recent[0], recent[1]);
        
        // If marginal value is below threshold, stop
        const threshold = 0.1; // 10% improvement threshold
        
        return marginalValue > threshold;
    }

    /**
     * Calculate marginal value between two results
     */
    calculateMarginalValue(previous, current) {
        // Simple heuristic: count number of new insights
        if (!previous || !current) return 1.0;
        
        // If results are identical, no marginal value
        if (JSON.stringify(previous) === JSON.stringify(current)) {
            return 0;
        }
        
        // Count new fields or significantly different values
        let newInfo = 0;
        let totalInfo = 0;
        
        for (const key of Object.keys(current)) {
            totalInfo++;
            if (!previous[key] || previous[key] !== current[key]) {
                newInfo++;
            }
        }
        
        return totalInfo > 0 ? newInfo / totalInfo : 0;
    }

    /**
     * Select best reversible action for emergency timeout
     */
    selectEmergencyAction(triage, assessment) {
        // Define reversible actions by input type
        const reversibleActions = {
            recipe_search: {
                action: 'return_partial_results',
                description: 'Return best matches found so far',
                reversible: true
            },
            recipe_compare: {
                action: 'compare_with_available',
                description: 'Compare with recipes currently available',
                reversible: true
            },
            substitute: {
                action: 'suggest_safest_substitute',
                description: 'Provide most conservative substitute option',
                reversible: true
            },
            conversion: {
                action: 'use_standard_conversion',
                description: 'Use standard conversion table',
                reversible: true
            },
            default: {
                action: 'acknowledge_timeout',
                description: 'Acknowledge request and defer to working memory',
                reversible: true
            }
        };
        
        const inputType = assessment.inputType || 'default';
        return reversibleActions[inputType] || reversibleActions.default;
    }

    /**
     * Execute emergency action when budget exceeded
     */
    executeEmergencyAction(budget, partialResults) {
        console.log('⏰ Budget exceeded - executing emergency action');
        
        const emergencyAction = budget.emergencyAction;
        
        return {
            success: true,
            action: emergencyAction.action,
            result: partialResults || 'Task deferred due to time constraints',
            emergency: true,
            reversible: emergencyAction.reversible,
            description: emergencyAction.description,
            timestamp: Date.now()
        };
    }

    /**
     * Track task start
     */
    startTask(taskBudget) {
        taskBudget.startedAt = Date.now();
    }

    /**
     * Track task completion
     */
    completeTask(taskBudget) {
        taskBudget.completedAt = Date.now();
        const elapsed = taskBudget.completedAt - taskBudget.startedAt;
        taskBudget.exceeded = elapsed > taskBudget.maxTime;
        
        if (taskBudget.exceeded) {
            console.log(`⚠️  Task ${taskBudget.task} exceeded budget by ${elapsed - taskBudget.maxTime}ms`);
        }
    }

    /**
     * Get budget status
     */
    getStatus(budget) {
        const now = Date.now();
        const totalElapsed = budget.tasks.reduce((sum, task) => {
            if (task.startedAt && task.completedAt) {
                return sum + (task.completedAt - task.startedAt);
            }
            return sum;
        }, 0);
        
        const tasksCompleted = budget.tasks.filter(t => t.completedAt).length;
        const tasksExceeded = budget.tasks.filter(t => t.exceeded).length;
        
        return {
            totalTime: budget.totalTime,
            elapsed: totalElapsed,
            remaining: Math.max(0, budget.totalTime - totalElapsed),
            tasksCompleted,
            tasksExceeded,
            withinBudget: totalElapsed <= budget.totalTime,
            utilization: budget.totalTime > 0 ? totalElapsed / budget.totalTime : 0
        };
    }

    /**
     * Optimize budget based on historical performance
     */
    optimizeBudget(budget, actualPerformance) {
        // Analyze which tasks consistently under/over-perform
        // Adjust multipliers accordingly (learning from experience)
        
        for (const task of budget.tasks) {
            if (task.completedAt && task.startedAt) {
                const actual = task.completedAt - task.startedAt;
                const budgeted = task.maxTime;
                const ratio = actual / budgeted;
                
                // If consistently fast, can reduce budget
                if (ratio < 0.5) {
                    console.log(`💡 Task ${task.task} completes quickly, can reduce budget`);
                }
                
                // If consistently slow, increase budget
                if (ratio > 1.2) {
                    console.log(`💡 Task ${task.task} needs more time, should increase budget`);
                }
            }
        }
    }

    /**
     * Check if we should abort early (decision is clear)
     */
    shouldAbortEarly(currentResult, confidence) {
        // If we have high-confidence result early, no need to continue
        if (confidence >= 0.9) {
            console.log('✅ High confidence result - aborting search early');
            return true;
        }
        
        return false;
    }

    /**
     * Get task budget by action name
     */
    getTaskBudget(budget, actionName) {
        return budget.tasks.find(t => t.task === actionName);
    }
}

module.exports = BudgetGovernor;
