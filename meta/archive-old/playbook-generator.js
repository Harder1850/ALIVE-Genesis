// Playbook Generator - Creates human-readable playbook drafts
// NOT executable code - just documented patterns for review

const fs = require('fs');
const path = require('path');

class PlaybookGenerator {
    constructor() {
        this.draftsDir = path.join(__dirname, '../playbooks/drafts');
        this.activeDir = path.join(__dirname, '../playbooks/active');
        this.ensureDirs();
    }

    /**
     * Ensure playbook directories exist
     */
    ensureDirs() {
        if (!fs.existsSync(this.draftsDir)) {
            fs.mkdirSync(this.draftsDir, { recursive: true });
        }
        if (!fs.existsSync(this.activeDir)) {
            fs.mkdirSync(this.activeDir, { recursive: true });
        }
    }

    /**
     * Generate playbook draft from detected pattern
     */
    generateDraft(pattern) {
        const playbook = {
            meta: {
                name: pattern.name,
                patternId: pattern.patternId,
                taskType: pattern.taskType,
                createdAt: new Date().toISOString(),
                status: 'DRAFT',
                confidence: this.calculateConfidence(pattern),
                uses: pattern.occurrences,
                version: '1.0.0'
            },
            description: this.generateDescription(pattern),
            trigger: {
                keywords: pattern.commonKeywords,
                taskType: pattern.taskType,
                contextHints: this.extractContextHints(pattern)
            },
            workflow: {
                steps: pattern.commonSteps.map((step, index) => ({
                    order: index + 1,
                    action: step,
                    description: this.describeStep(step),
                    required: true
                })),
                estimatedTime: `${pattern.avgTime}ms`,
                successRate: `${(pattern.successRate * 100).toFixed(0)}%`
            },
            examples: pattern.examples.map(ex => ({
                input: ex.input,
                timestamp: ex.timestamp
            })),
            notes: [
                'This playbook was automatically generated from repeated successful patterns.',
                'Review before promoting to active status.',
                'Modify steps if needed - this is a draft.'
            ],
            humanReadable: this.generateHumanReadable(pattern)
        };

        // Save to drafts folder
        const filename = `${pattern.patternId}.json`;
        const filepath = path.join(this.draftsDir, filename);
        
        try {
            fs.writeFileSync(filepath, JSON.stringify(playbook, null, 2), 'utf8');
            console.log(`📝 MetaLoop: Created playbook draft "${pattern.name}"`);
            console.log(`   Location: ${filepath}`);
            console.log(`   Based on ${pattern.occurrences} successful uses`);
            return filepath;
        } catch (error) {
            console.error('Failed to create playbook draft:', error.message);
            return null;
        }
    }

    /**
     * Generate human-readable description
     */
    generateDescription(pattern) {
        const keywords = pattern.commonKeywords.join(', ');
        return `Automated workflow for ${pattern.taskType} tasks involving: ${keywords}. ` +
               `This pattern was observed ${pattern.occurrences} times with 100% success rate.`;
    }

    /**
     * Extract context hints from pattern
     */
    extractContextHints(pattern) {
        const hints = [];
        
        if (pattern.commonKeywords.includes('substitute') || pattern.commonKeywords.includes('replace')) {
            hints.push('ingredient substitution');
        }
        if (pattern.commonKeywords.includes('convert')) {
            hints.push('unit conversion');
        }
        if (pattern.commonKeywords.includes('recipe')) {
            hints.push('recipe-related');
        }
        if (pattern.commonKeywords.includes('compare')) {
            hints.push('comparison task');
        }
        
        return hints;
    }

    /**
     * Describe what a step does (human-readable)
     */
    describeStep(stepName) {
        const descriptions = {
            'search_local': 'Search local knowledge base',
            'gather_recipes': 'Collect relevant recipes',
            'find_substitutes': 'Find ingredient substitutes',
            'lookup_table': 'Look up conversion table',
            'identify_function': 'Identify ingredient function',
            'extract_core': 'Extract common recipe elements',
            'identify_variations': 'Find recipe variations',
            'detect_bloat': 'Detect unnecessary steps',
            'calculate': 'Perform calculation',
            'generate_list': 'Generate shopping list',
            'validate': 'Validate data',
            'store': 'Store in memory'
        };
        
        return descriptions[stepName] || `Execute ${stepName}`;
    }

    /**
     * Calculate confidence score for playbook
     */
    calculateConfidence(pattern) {
        let score = 0;
        
        // Base score from occurrences
        score += Math.min(pattern.occurrences * 0.2, 0.6);
        
        // Success rate bonus
        score += pattern.successRate * 0.3;
        
        // Steps consistency (if all examples use same steps)
        if (pattern.commonSteps.length > 0) {
            score += 0.1;
        }
        
        return Math.min(score, 1.0).toFixed(2);
    }

    /**
     * Generate human-readable playbook summary
     */
    generateHumanReadable(pattern) {
        const lines = [];
        
        lines.push('# ' + pattern.name.replace(/-/g, ' ').toUpperCase());
        lines.push('');
        lines.push('## When to Use');
        lines.push(`This playbook applies when you ask about: ${pattern.commonKeywords.join(', ')}`);
        lines.push('');
        lines.push('## What It Does');
        lines.push('1. ' + pattern.commonSteps.map(s => this.describeStep(s)).join('\n2. '));
        lines.push('');
        lines.push('## Performance');
        lines.push(`- Average time: ${pattern.avgTime}ms`);
        lines.push(`- Success rate: ${(pattern.successRate * 100).toFixed(0)}%`);
        lines.push(`- Times used: ${pattern.occurrences}`);
        lines.push('');
        lines.push('## Recent Examples');
        pattern.examples.forEach((ex, i) => {
            lines.push(`${i + 1}. "${ex.input}"`);
        });
        
        return lines.join('\n');
    }

    /**
     * List all draft playbooks
     */
    listDrafts() {
        try {
            const files = fs.readdirSync(this.draftsDir).filter(f => f.endsWith('.json'));
            return files.map(file => {
                const filepath = path.join(this.draftsDir, file);
                const content = fs.readFileSync(filepath, 'utf8');
                const playbook = JSON.parse(content);
                return {
                    filename: file,
                    name: playbook.meta.name,
                    patternId: playbook.meta.patternId,
                    uses: playbook.meta.uses,
                    confidence: playbook.meta.confidence,
                    createdAt: playbook.meta.createdAt
                };
            });
        } catch (error) {
            console.error('Failed to list drafts:', error.message);
            return [];
        }
    }

    /**
     * List active playbooks
     */
    listActive() {
        try {
            const files = fs.readdirSync(this.activeDir).filter(f => f.endsWith('.json'));
            return files.map(file => {
                const filepath = path.join(this.activeDir, file);
                const content = fs.readFileSync(filepath, 'utf8');
                const playbook = JSON.parse(content);
                return {
                    filename: file,
                    name: playbook.meta.name,
                    patternId: playbook.meta.patternId
                };
            });
        } catch (error) {
            console.error('Failed to list active playbooks:', error.message);
            return [];
        }
    }

    /**
     * Get playbook draft by pattern ID
     */
    getDraft(patternId) {
        try {
            const filepath = path.join(this.draftsDir, `${patternId}.json`);
            if (fs.existsSync(filepath)) {
                const content = fs.readFileSync(filepath, 'utf8');
                return JSON.parse(content);
            }
        } catch (error) {
            console.error('Failed to read draft:', error.message);
        }
        return null;
    }

    /**
     * Promote draft to active (manual user action)
     */
    promoteDraft(patternId) {
        try {
            const draftPath = path.join(this.draftsDir, `${patternId}.json`);
            const activePath = path.join(this.activeDir, `${patternId}.json`);
            
            if (!fs.existsSync(draftPath)) {
                console.error(`Draft not found: ${patternId}`);
                return false;
            }
            
            // Update status
            const content = fs.readFileSync(draftPath, 'utf8');
            const playbook = JSON.parse(content);
            playbook.meta.status = 'ACTIVE';
            playbook.meta.promotedAt = new Date().toISOString();
            
            // Copy to active directory
            fs.writeFileSync(activePath, JSON.stringify(playbook, null, 2), 'utf8');
            
            console.log(`✅ Promoted playbook "${playbook.meta.name}" to active`);
            return true;
            
        } catch (error) {
            console.error('Failed to promote draft:', error.message);
            return false;
        }
    }
}

module.exports = PlaybookGenerator;
