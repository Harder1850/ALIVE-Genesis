// ALIVE Kernel - Core Organism Loop
// Stream → Assess → Triage → Budget → Execute → Remember → Reset

const StreamMemory = require('../memory/stream');
const WorkingMemory = require('../memory/working');
const LongTermMemory = require('../memory/longterm');
const Assessor = require('./assess');
const Triager = require('./triage');
const BudgetGovernor = require('./budget');
const ResetController = require('./reset');

class ALIVEKernel {
    constructor() {
        // Memory tiers
        this.streamMemory = new StreamMemory();
        this.workingMemory = new WorkingMemory();
        this.longTermMemory = new LongTermMemory();
        
        // Core components
        this.assessor = new Assessor();
        this.triager = new Triager();
        this.budgetGovernor = new BudgetGovernor();
        this.resetController = new ResetController();
        
        // Execution modes
        this.mode = 'HEURISTIC'; // PRECISION | HEURISTIC
        
        // State
        this.loopCount = 0;
        this.lastDecision = null;
    }

    /**
     * Main organism loop - processes user input through full pipeline
     */
    async process(userInput, context = {}) {
        this.loopCount++;
        const startTime = Date.now();
        
        try {
            // (a) Stream Capture
            const streamEntry = await this.captureStream(userInput, context);
            
            // (b) Assess
            const assessment = await this.assess(streamEntry);
            
            // Check for reset condition
            if (this.resetController.shouldReset(assessment, this.workingMemory)) {
                console.log('🔄 Reset triggered - coherence break detected');
                await this.reset();
                return this.process(userInput, { ...context, resetTriggered: true });
            }
            
            // (c) Triage
            const triage = await this.triage(assessment);
            
            // (d) Budget Plan
            const budget = await this.budgetPlan(triage, assessment);
            
            // (e) Execute
            const result = await this.execute(triage, budget, assessment);
            
            // (f) Remember
            await this.remember(streamEntry, assessment, triage, result);
            
            // (f.1) MetaLoop - Record and Review (Observer only)
            const { MetaLoop } = require('../meta/metaloop');
            const meta = new MetaLoop();
            const elapsed = Date.now() - startTime;
            
            meta.record({
                domain: 'cooking',
                taskType: assessment.inputType || 'general',
                assessment: {
                    urgency: assessment.urgency,
                    stakes: assessment.stakes,
                    difficulty: assessment.difficulty,
                    precision: assessment.precision
                },
                metrics: {
                    timeMs: elapsed,
                    stepCount: result.result?.results?.length || 0,
                    lookupUsed: result.result?.results?.some(r => 
                        r.task?.includes('lookup') || r.task?.includes('search') || r.task?.includes('gather')
                    ) || false,
                    lookupChangedOutcome: false, // Could enhance later
                    resetTriggered: false
                },
                outcome: {
                    status: result.success ? 'success' : 'fail',
                    userCorrections: 0
                },
                inputs: {
                    querySummary: String(userInput).substring(0, 100)
                }
            });
            
            // (g) Reset if needed (already handled above)
            
            return {
                success: true,
                result,
                assessment,
                triage,
                budget,
                elapsed,
                loopCount: this.loopCount
            };
            
        } catch (error) {
            console.error('Kernel error:', error);
            return {
                success: false,
                error: error.message,
                elapsed: Date.now() - startTime
            };
        }
    }

    /**
     * (a) Stream Capture - Add to consciousness buffer
     */
    async captureStream(input, context) {
        const entry = {
            timestamp: Date.now(),
            input,
            context,
            loopCount: this.loopCount
        };
        
        this.streamMemory.add(entry);
        return entry;
    }

    /**
     * (b) Assess - Evaluate urgency, stakes, difficulty, precision
     */
    async assess(streamEntry) {
        return this.assessor.evaluate(streamEntry, {
            stream: this.streamMemory,
            working: this.workingMemory,
            longTerm: this.longTermMemory
        });
    }

    /**
     * (c) Triage - Prioritize, identify dependencies, defer/discard
     */
    async triage(assessment) {
        return this.triager.prioritize(assessment, {
            working: this.workingMemory,
            mode: this.mode
        });
    }

    /**
     * (d) Budget Plan - Allocate time/compute resources
     */
    async budgetPlan(triage, assessment) {
        return this.budgetGovernor.allocate(triage, assessment);
    }

    /**
     * (e) Execute - Run the planned actions
     */
    async execute(triage, budget, assessment) {
        const executor = require('./executor');
        return executor.run(triage, budget, assessment, {
            mode: this.mode,
            memory: {
                stream: this.streamMemory,
                working: this.workingMemory,
                longTerm: this.longTermMemory
            }
        });
    }

    /**
     * (f) Remember - Store in appropriate memory tier
     */
    async remember(streamEntry, assessment, triage, result) {
        // Update working memory
        this.workingMemory.update({
            input: streamEntry.input,
            assessment,
            triage,
            result,
            timestamp: Date.now()
        });
        
        // Promote to long-term if criteria met
        if (this.shouldPromoteToLongTerm(streamEntry, result)) {
            this.longTermMemory.store({
                pattern: this.extractPattern(streamEntry, result),
                timestamp: Date.now(),
                useCount: 1
            });
        }
        
        // Decay old working memory
        this.workingMemory.decay();
    }

    /**
     * (g) Reset - Clear working assumptions and restart
     */
    async reset() {
        const snapshot = this.workingMemory.snapshot();
        
        console.log('📸 Snapshotting working memory before reset');
        
        // Store what was learned
        if (snapshot.learned && snapshot.learned.length > 0) {
            this.longTermMemory.store({
                type: 'reset_snapshot',
                learned: snapshot.learned,
                timestamp: Date.now()
            });
        }
        
        // Clear working memory
        this.workingMemory.clear();
        
        // Collapse stream memory to summary
        this.streamMemory.collapseToSummary();
        
        // Reset loop counter
        this.loopCount = 0;
        
        console.log('✨ Reset complete - starting fresh');
    }

    /**
     * Set execution mode (PRECISION | HEURISTIC)
     */
    setMode(mode) {
        if (!['PRECISION', 'HEURISTIC'].includes(mode)) {
            throw new Error(`Invalid mode: ${mode}`);
        }
        this.mode = mode;
        console.log(`🎯 Mode set to: ${mode}`);
    }

    /**
     * Helper: Check if item should be promoted to long-term memory
     */
    shouldPromoteToLongTerm(streamEntry, result) {
        // Promotion rule: referenced 3+ times in 30 days
        const pattern = this.extractPattern(streamEntry, result);
        const existing = this.longTermMemory.find(pattern);
        
        if (existing && existing.useCount >= 2) {
            return true; // 3rd use, promote
        }
        
        return false;
    }

    /**
     * Helper: Extract reusable pattern from entry and result
     */
    extractPattern(streamEntry, result) {
        // Simple pattern extraction
        return {
            inputType: this.classifyInput(streamEntry.input),
            resultType: result.type || 'general',
            successful: result.success !== false
        };
    }

    /**
     * Helper: Classify input type
     */
    classifyInput(input) {
        if (typeof input === 'string') {
            const lower = input.toLowerCase();
            if (lower.includes('recipe')) return 'recipe';
            if (lower.includes('compare')) return 'compare';
            if (lower.includes('substitute') || lower.includes('replace')) return 'substitute';
            if (lower.includes('convert')) return 'conversion';
        }
        return 'general';
    }

    /**
     * Get system status
     */
    getStatus() {
        return {
            mode: this.mode,
            loopCount: this.loopCount,
            memory: {
                stream: this.streamMemory.size(),
                working: this.workingMemory.size(),
                longTerm: this.longTermMemory.size()
            },
            uptime: process.uptime()
        };
    }
}

module.exports = ALIVEKernel;
