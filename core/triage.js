// Triager - Prioritize tasks, identify dependencies, defer/discard
// Outputs: priorities (max 3), dependencies, deferred, discarded

class Triager {
    constructor() {
        this.maxPriorities = 3;
    }

    /**
     * Main triage function
     */
    async prioritize(assessment, context) {
        const { urgency, stakes, difficulty, inputType } = assessment;
        const { working, mode } = context;
        
        // Extract tasks from assessment
        const tasks = this.extractTasks(assessment);
        
        // Score and sort tasks
        const scored = tasks.map(task => ({
            ...task,
            score: this.calculatePriority(task, assessment),
            dependencies: this.identifyDependencies(task, working)
        }));
        
        scored.sort((a, b) => b.score - a.score);
        
        // Select top priorities (max 3)
        const priorities = scored.slice(0, this.maxPriorities);
        
        // Identify what can be deferred
        const deferred = scored.slice(this.maxPriorities).filter(task => 
            task.score > 0 && !task.noise
        );
        
        // Discard noise
        const discarded = scored.filter(task => task.noise || task.score <= 0);
        
        const triage = {
            priorities,
            deferred,
            discarded,
            dependencies: this.consolidateDependencies(priorities),
            timestamp: Date.now()
        };
        
        return triage;
    }

    /**
     * Extract individual tasks from assessment
     */
    extractTasks(assessment) {
        const { inputType, urgency, stakes, difficulty } = assessment;
        
        const tasks = [];
        
        // Map input type to task list
        switch (inputType) {
            case 'recipe_add':
                tasks.push(
                    { action: 'validate_recipe', type: 'validation' },
                    { action: 'store_recipe', type: 'storage' },
                    { action: 'index_recipe', type: 'indexing' }
                );
                break;
                
            case 'recipe_search':
                tasks.push(
                    { action: 'search_local', type: 'retrieval' },
                    { action: 'rank_results', type: 'processing' }
                );
                break;
                
            case 'recipe_compare':
            case 'compare':
                tasks.push(
                    { action: 'gather_recipes', type: 'retrieval' },
                    { action: 'extract_core', type: 'analysis' },
                    { action: 'identify_variations', type: 'analysis' },
                    { action: 'detect_bloat', type: 'analysis' },
                    { action: 'format_comparison', type: 'presentation' }
                );
                break;
                
            case 'substitute':
                tasks.push(
                    { action: 'identify_function', type: 'analysis' },
                    { action: 'find_substitutes', type: 'retrieval' },
                    { action: 'rank_by_risk', type: 'processing' }
                );
                break;
                
            case 'conversion':
                tasks.push(
                    { action: 'parse_conversion', type: 'parsing' },
                    { action: 'lookup_table', type: 'retrieval' },
                    { action: 'calculate', type: 'computation' }
                );
                break;
                
            case 'shopping':
                tasks.push(
                    { action: 'extract_ingredients', type: 'extraction' },
                    { action: 'check_pantry', type: 'retrieval' },
                    { action: 'generate_list', type: 'generation' }
                );
                break;
                
            default:
                tasks.push({ action: 'process_general', type: 'general' });
        }
        
        return tasks;
    }

    /**
     * Calculate priority score for a task
     */
    calculatePriority(task, assessment) {
        let score = 0;
        
        // Urgency weight
        const urgencyScores = { NOW: 50, SOON: 30, LATER: 10 };
        score += urgencyScores[assessment.urgency] || 10;
        
        // Stakes weight
        const stakesScores = { high: 30, medium: 20, low: 10 };
        score += stakesScores[assessment.stakes] || 20;
        
        // Task type modifiers
        if (task.type === 'validation' || task.type === 'retrieval') {
            score += 10; // Foundational tasks get bonus
        }
        
        if (task.type === 'presentation' || task.type === 'formatting') {
            score -= 5; // Can be deferred
        }
        
        // Difficulty modifier (easier tasks prioritized in high-urgency situations)
        if (assessment.urgency === 'NOW') {
            const difficultyPenalty = { easy: 0, moderate: -5, hard: -10, critical: -15 };
            score += difficultyPenalty[assessment.difficulty] || 0;
        }
        
        // Detect noise
        if (task.action.includes('noise') || task.unnecessary) {
            task.noise = true;
            score = -10;
        }
        
        return score;
    }

    /**
     * Identify task dependencies
     */
    identifyDependencies(task, working) {
        const dependencies = [];
        
        // Common dependency patterns
        switch (task.action) {
            case 'store_recipe':
                dependencies.push('validate_recipe');
                break;
                
            case 'index_recipe':
                dependencies.push('store_recipe');
                break;
                
            case 'rank_results':
                dependencies.push('search_local');
                break;
                
            case 'extract_core':
            case 'identify_variations':
            case 'detect_bloat':
                dependencies.push('gather_recipes');
                break;
                
            case 'format_comparison':
                dependencies.push('extract_core', 'identify_variations');
                break;
                
            case 'find_substitutes':
                dependencies.push('identify_function');
                break;
                
            case 'rank_by_risk':
                dependencies.push('find_substitutes');
                break;
                
            case 'calculate':
                dependencies.push('parse_conversion', 'lookup_table');
                break;
                
            case 'generate_list':
                dependencies.push('extract_ingredients');
                break;
        }
        
        return dependencies;
    }

    /**
     * Consolidate dependencies across all priority tasks
     */
    consolidateDependencies(priorities) {
        const allDeps = new Set();
        
        for (const task of priorities) {
            if (task.dependencies) {
                for (const dep of task.dependencies) {
                    allDeps.add(dep);
                }
            }
        }
        
        // Return ordered list (dependencies that must happen first)
        return Array.from(allDeps);
    }

    /**
     * Check if dependencies are satisfied
     */
    areDependenciesSatisfied(task, completedTasks) {
        if (!task.dependencies || task.dependencies.length === 0) {
            return true;
        }
        
        for (const dep of task.dependencies) {
            if (!completedTasks.includes(dep)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Get next executable task (dependencies satisfied)
     */
    getNextTask(triage, completedTasks = []) {
        for (const task of triage.priorities) {
            if (!completedTasks.includes(task.action) &&
                this.areDependenciesSatisfied(task, completedTasks)) {
                return task;
            }
        }
        return null;
    }

    /**
     * Simplify triage for specific mode
     */
    simplifyForMode(triage, mode) {
        if (mode === 'PRECISION') {
            // In precision mode, keep only essential tasks
            triage.priorities = triage.priorities.filter(task => 
                task.type === 'validation' || 
                task.type === 'retrieval' || 
                task.type === 'computation'
            );
        } else {
            // In heuristic mode, allow "good enough" shortcuts
            // Remove redundant validation steps
            triage.priorities = triage.priorities.filter(task =>
                task.type !== 'validation' || task.action.includes('critical')
            );
        }
        
        return triage;
    }

    /**
     * Apply simplicity bias (Mikey's preference)
     */
    applySimplicityBias(triage) {
        // Penalize tasks that add complexity without clear value
        for (const task of triage.priorities) {
            if (task.action.includes('extra') || 
                task.action.includes('optional') ||
                task.action.includes('enhancement')) {
                task.score -= 15;
            }
        }
        
        // Re-sort and re-triage
        const allTasks = [...triage.priorities, ...triage.deferred];
        allTasks.sort((a, b) => b.score - a.score);
        
        triage.priorities = allTasks.slice(0, this.maxPriorities);
        triage.deferred = allTasks.slice(this.maxPriorities).filter(t => t.score > 0);
        
        return triage;
    }

    /**
     * Detect circular dependencies
     */
    hasCircularDependencies(triage) {
        const graph = new Map();
        
        // Build dependency graph
        for (const task of triage.priorities) {
            graph.set(task.action, task.dependencies || []);
        }
        
        // Check for cycles using DFS
        const visited = new Set();
        const recursionStack = new Set();
        
        const hasCycle = (node) => {
            visited.add(node);
            recursionStack.add(node);
            
            const deps = graph.get(node) || [];
            for (const dep of deps) {
                if (!visited.has(dep)) {
                    if (hasCycle(dep)) return true;
                } else if (recursionStack.has(dep)) {
                    return true;
                }
            }
            
            recursionStack.delete(node);
            return false;
        };
        
        for (const node of graph.keys()) {
            if (!visited.has(node)) {
                if (hasCycle(node)) return true;
            }
        }
        
        return false;
    }

    /**
     * Format triage for display
     */
    format(triage) {
        return {
            'Top Priorities': triage.priorities.map(t => t.action),
            'Dependencies': triage.dependencies,
            'Deferred': triage.deferred.map(t => t.action),
            'Discarded': triage.discarded.map(t => t.action)
        };
    }
}

module.exports = Triager;
