// Executor - Run prioritized tasks with budget constraints
// Routes tasks to appropriate domain handlers

class Executor {
    /**
     * Main execution function
     */
    static async run(triage, budget, assessment, context) {
        const { mode, memory } = context;
        const results = [];
        const completedTasks = [];
        
        console.log(`🚀 Executing ${triage.priorities.length} priority tasks in ${mode} mode`);
        
        // Execute tasks in priority order, respecting dependencies
        for (const task of triage.priorities) {
            // Check dependencies
            if (!this.areDependenciesSatisfied(task, completedTasks)) {
                console.log(`⏸️  Skipping ${task.action} - dependencies not satisfied`);
                continue;
            }
            
            // Get task budget
            const taskBudget = budget.tasks.find(t => t.task === task.action);
            if (!taskBudget) {
                console.log(`⚠️  No budget for ${task.action}`);
                continue;
            }
            
            // Execute task
            try {
                const result = await this.executeTask(task, taskBudget, assessment, mode, memory);
                results.push(result);
                completedTasks.push(task.action);
            } catch (error) {
                console.error(`❌ Task ${task.action} failed:`, error.message);
                results.push({
                    task: task.action,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return {
            type: assessment.inputType,
            results,
            completedTasks,
            success: results.some(r => r.success),
            timestamp: Date.now()
        };
    }

    /**
     * Execute individual task
     */
    static async executeTask(task, taskBudget, assessment, mode, memory) {
        // POLICY CONSULTATION: Check if we should skip this step based on MetaLoop learning
        if (this.shouldSkipBasedOnPolicy(task.action, taskBudget, assessment)) {
            console.log(`  ⏭️  ${task.action} SKIPPED (MetaLoop policy: low priority + tight budget/low stakes)`);
            return {
                task: task.action,
                success: true,
                skipped: true,
                result: { note: 'Skipped based on learned policy' },
                elapsed: 0,
                withinBudget: true
            };
        }
        
        console.log(`  🔧 ${task.action}...`);
        
        // Start timing
        const startTime = Date.now();
        taskBudget.startedAt = startTime;
        
        // Route to appropriate handler
        let result;
        
        try {
            switch (task.type) {
                case 'retrieval':
                    result = await this.handleRetrieval(task, assessment, memory, mode);
                    break;
                    
                case 'analysis':
                    result = await this.handleAnalysis(task, assessment, memory, mode);
                    break;
                    
                case 'validation':
                    result = await this.handleValidation(task, assessment, memory, mode);
                    break;
                    
                case 'storage':
                    result = await this.handleStorage(task, assessment, memory, mode);
                    break;
                    
                case 'computation':
                    result = await this.handleComputation(task, assessment, memory, mode);
                    break;
                    
                case 'generation':
                    result = await this.handleGeneration(task, assessment, memory, mode);
                    break;
                    
                case 'presentation':
                    result = await this.handlePresentation(task, assessment, memory, mode);
                    break;
                    
                default:
                    result = await this.handleGeneral(task, assessment, memory, mode);
            }
            
            // Check if within budget
            const elapsed = Date.now() - startTime;
            taskBudget.completedAt = Date.now();
            taskBudget.exceeded = elapsed > taskBudget.maxTime;
            
            if (taskBudget.exceeded) {
                console.log(`    ⏰ Exceeded budget by ${elapsed - taskBudget.maxTime}ms`);
            } else {
                console.log(`    ✓ Completed in ${elapsed}ms`);
            }
            
            return {
                task: task.action,
                success: true,
                result,
                elapsed,
                withinBudget: !taskBudget.exceeded
            };
            
        } catch (error) {
            taskBudget.completedAt = Date.now();
            throw error;
        }
    }

    /**
     * Handle retrieval tasks (search, fetch, lookup)
     */
    static async handleRetrieval(task, assessment, memory, mode) {
        const { longTerm, working } = memory;
        
        switch (task.action) {
            case 'search_local':
                const query = working.get('query') || assessment.input;
                return longTerm.search(query);
                
            case 'gather_recipes':
                const recipeQuery = working.get('recipeQuery') || 'default';
                return longTerm.getRecipes().slice(0, 5); // Top 5
                
            case 'find_substitutes':
                const ingredient = working.get('ingredient');
                return this.findSubstitutes(ingredient, longTerm);
                
            case 'lookup_table':
                const conversionType = working.get('conversionType');
                return this.lookupConversion(conversionType);
                
            case 'check_pantry':
                return working.get('pantry') || [];
                
            default:
                return { action: task.action, status: 'completed' };
        }
    }

    /**
     * Handle analysis tasks
     */
    static async handleAnalysis(task, assessment, memory, mode) {
        const { longTerm, working } = memory;
        
        switch (task.action) {
            case 'extract_core':
                const recipes = working.get('gathered_recipes') || [];
                return this.extractCore(recipes);
                
            case 'identify_variations':
                const core = working.get('core') || {};
                const allRecipes = working.get('gathered_recipes') || [];
                return this.identifyVariations(core, allRecipes);
                
            case 'detect_bloat':
                const recipesToCheck = working.get('gathered_recipes') || [];
                return this.detectBloat(recipesToCheck);
                
            case 'identify_function':
                const ingredientToAnalyze = working.get('ingredient');
                return this.identifyFunction(ingredientToAnalyze);
                
            default:
                return { analysis: 'completed', task: task.action };
        }
    }

    /**
     * Handle validation tasks
     */
    static async handleValidation(task, assessment, memory, mode) {
        const { working } = memory;
        
        if (mode === 'PRECISION') {
            // Strict validation
            const data = working.get('dataToValidate');
            return this.strictValidate(data);
        } else {
            // Heuristic validation (good enough)
            return { valid: true, mode: 'heuristic' };
        }
    }

    /**
     * Handle storage tasks
     */
    static async handleStorage(task, assessment, memory, mode) {
        const { longTerm, working } = memory;
        
        const dataToStore = working.get('dataToStore');
        if (!dataToStore) {
            return { stored: false, reason: 'no_data' };
        }
        
        const id = longTerm.store(dataToStore);
        return { stored: true, id };
    }

    /**
     * Handle computation tasks
     */
    static async handleComputation(task, assessment, memory, mode) {
        const { working } = memory;
        
        switch (task.action) {
            case 'calculate':
                const conversion = working.get('conversion');
                return this.calculate(conversion);
                
            default:
                return { computed: true, task: task.action };
        }
    }

    /**
     * Handle generation tasks
     */
    static async handleGeneration(task, assessment, memory, mode) {
        const { working } = memory;
        
        switch (task.action) {
            case 'generate_list':
                const ingredients = working.get('ingredients') || [];
                const pantry = working.get('pantry') || [];
                return this.generateShoppingList(ingredients, pantry);
                
            default:
                return { generated: true, task: task.action };
        }
    }

    /**
     * Handle presentation tasks
     */
    static async handlePresentation(task, assessment, memory, mode) {
        const { working } = memory;
        
        const data = working.get('presentationData');
        return this.formatForDisplay(data);
    }

    /**
     * Handle general tasks
     */
    static async handleGeneral(task, assessment, memory, mode) {
        return {
            task: task.action,
            status: 'completed',
            note: 'General task handler'
        };
    }

    /**
     * POLICY CONSULTATION: Check if we should skip step based on MetaLoop learned policy
     * Executor decides, using policy as input (MetaLoop doesn't control directly)
     */
    static shouldSkipBasedOnPolicy(stepName, taskBudget, assessment) {
        try {
            const fs = require('fs');
            const path = require('path');
            const configPath = path.join(__dirname, '../config/meta-config.json');
            
            // If no policy file exists yet, don't skip anything
            if (!fs.existsSync(configPath)) {
                return false;
            }
            
            // Read policy
            const configContent = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configContent);
            
            const stepPolicy = config.stepValues?.[stepName];
            if (!stepPolicy) {
                return false; // No policy for this step yet
            }
            
            // DECISION LOGIC: Executor decides based on policy + context
            const isLowPriority = stepPolicy.priority <= 2;
            const isLowValue = stepPolicy.valueScore < 0.3;
            
            // RELATIVE BUDGET PRESSURE: Compare remaining budget to estimated step cost
            const estimatedStepCost = stepPolicy.avgCostMs || 100;
            const remainingBudget = taskBudget.maxTime - (Date.now() - (taskBudget.startedAt || Date.now()));
            const budgetPressure = remainingBudget / estimatedStepCost;
            
            const budgetTight = budgetPressure < 1.0; // Tight if can't afford this step
            
            // Stakes check: HIGH stakes override skip (safety critical)
            const isHighStakes = assessment.stakes === 'high';
            
            if (isHighStakes) {
                // HIGH STAKES: Allow even if low priority (safety first)
                return false;
            }
            
            // LOW STAKES OR TIGHT BUDGET: Skip if low priority/value
            if ((isLowPriority && isLowValue) && (budgetTight || assessment.stakes === 'low')) {
                return true; // SKIP
            }
            
            return false;
            
        } catch (error) {
            // Fail-safe: if policy read fails, don't skip
            return false;
        }
    }

    /**
     * Check if task dependencies are satisfied
     */
    static areDependenciesSatisfied(task, completedTasks) {
        if (!task.dependencies || task.dependencies.length === 0) {
            return true;
        }
        
        return task.dependencies.every(dep => completedTasks.includes(dep));
    }

    // ===== Domain-specific helper methods =====

    /**
     * Find ingredient substitutes
     */
    static findSubstitutes(ingredient, longTerm) {
        // Simple substitute rules (would be expanded)
        const substitutes = {
            'butter': [
                { name: 'olive oil', risk: 'low', ratio: '3:4' },
                { name: 'coconut oil', risk: 'low', ratio: '1:1' }
            ],
            'egg': [
                { name: 'flax egg', risk: 'medium', ratio: '1:1' },
                { name: 'banana', risk: 'medium', ratio: '1:4' }
            ]
        };
        
        return substitutes[ingredient?.toLowerCase()] || [];
    }

    /**
     * Lookup conversion tables
     */
    static lookupConversion(type) {
        const tables = {
            volume: { '1 cup': '240ml', '1 tbsp': '15ml', '1 tsp': '5ml' },
            weight: { '1 lb': '454g', '1 oz': '28g' },
            temperature: { fahrenheit_to_celsius: (f) => (f - 32) * 5/9 }
        };
        
        return tables[type] || {};
    }

    /**
     * Extract common core from recipes
     */
    static extractCore(recipes) {
        if (recipes.length === 0) return {};
        
        // Find common ingredients
        const allIngredients = recipes.map(r => r.ingredients || []);
        const core = allIngredients[0]?.filter(ing =>
            allIngredients.every(list => list.some(i => i === ing))
        );
        
        return {
            ingredients: core || [],
            count: recipes.length
        };
    }

    /**
     * Identify variations across recipes
     */
    static identifyVariations(core, recipes) {
        const variations = [];
        
        for (const recipe of recipes) {
            const unique = recipe.ingredients?.filter(ing =>
                !core.ingredients.includes(ing)
            );
            
            if (unique && unique.length > 0) {
                variations.push({
                    recipe: recipe.name,
                    uniqueIngredients: unique
                });
            }
        }
        
        return variations;
    }

    /**
     * Detect bloat in recipes (unnecessary steps/ingredients)
     */
    static detectBloat(recipes) {
        const bloat = [];
        
        const bloatKeywords = ['optional', 'garnish', 'decoration', 'for presentation'];
        
        for (const recipe of recipes) {
            const steps = recipe.steps || [];
            const bloatSteps = steps.filter(step =>
                bloatKeywords.some(keyword => step.toLowerCase().includes(keyword))
            );
            
            if (bloatSteps.length > 0) {
                bloat.push({
                    recipe: recipe.name,
                    bloatSteps,
                    severity: bloatSteps.length > 2 ? 'high' : 'low'
                });
            }
        }
        
        return bloat;
    }

    /**
     * Identify ingredient function
     */
    static identifyFunction(ingredient) {
        const functions = {
            'butter': ['fat', 'flavor', 'moisture'],
            'egg': ['binder', 'leavening', 'structure'],
            'flour': ['structure', 'thickener'],
            'sugar': ['sweetener', 'browning', 'moisture'],
            'salt': ['flavor', 'preservation'],
            'baking powder': ['leavening'],
            'vanilla': ['flavor']
        };
        
        return functions[ingredient?.toLowerCase()] || ['unknown'];
    }

    /**
     * Calculate conversion
     */
    static calculate(conversion) {
        // Simple calculator (would be expanded)
        if (!conversion) return { error: 'no_conversion_data' };
        
        return {
            result: conversion.value * conversion.factor,
            unit: conversion.targetUnit
        };
    }

    /**
     * Generate shopping list
     */
    static generateShoppingList(ingredients, pantry) {
        const needed = ingredients.filter(ing =>
            !pantry.includes(ing)
        );
        
        return {
            list: needed,
            count: needed.length,
            alreadyHave: pantry.filter(ing => ingredients.includes(ing))
        };
    }

    /**
     * Strict validation (PRECISION mode)
     */
    static strictValidate(data) {
        if (!data) return { valid: false, reason: 'no_data' };
        
        // Check required fields
        const required = ['name', 'ingredients'];
        const missing = required.filter(field => !data[field]);
        
        if (missing.length > 0) {
            return { valid: false, missing };
        }
        
        return { valid: true };
    }

    /**
     * Format data for display
     */
    static formatForDisplay(data) {
        if (!data) return { formatted: 'No data to display' };
        
        return {
            formatted: JSON.stringify(data, null, 2),
            timestamp: new Date().toLocaleString()
        };
    }
}

module.exports = Executor;
