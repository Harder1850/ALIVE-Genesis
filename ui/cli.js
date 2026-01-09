// ALIVE CLI - Simple Command Line Interface
// Test the ALIVE kernel with cooking queries

const readline = require('readline');
const ALIVEKernel = require('../core/kernel');

class ALIVECLI {
    constructor() {
        this.kernel = new ALIVEKernel();
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'ALIVE> '
        });
        
        this.commands = {
            'help': this.showHelp.bind(this),
            'status': this.showStatus.bind(this),
            'mode': this.setMode.bind(this),
            'memory': this.showMemory.bind(this),
            'debug': this.debugCommand.bind(this),
            'quit': this.quit.bind(this),
            'exit': this.quit.bind(this)
        };
    }

    start() {
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║          ALIVE Cooking MVP - Organism System              ║');
        console.log('║  Stream → Assess → Triage → Budget → Execute → Remember  ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
        console.log();
        console.log('Type "help" for commands, or enter a cooking query.');
        console.log('Example: "Compare 3 recipes for chocolate chip cookies"');
        console.log();
        
        this.rl.prompt();
        
        this.rl.on('line', async (input) => {
            const trimmed = input.trim();
            
            if (!trimmed) {
                this.rl.prompt();
                return;
            }
            
            await this.handleInput(trimmed);
            this.rl.prompt();
        });
        
        this.rl.on('close', () => {
            console.log('\\nGoodbye!');
            process.exit(0);
        });
    }

    async handleInput(input) {
        // Check if it's a command
        const parts = input.split(' ');
        const command = parts[0].toLowerCase();
        
        if (this.commands[command]) {
            await this.commands[command](parts.slice(1));
            return;
        }
        
        // Otherwise, process as cooking query through ALIVE kernel
        try {
            console.log('\\n🧬 Processing through ALIVE kernel...');
            console.log('─'.repeat(60));
            
            const result = await this.kernel.process(input);
            
            this.displayResult(result);
            
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }

    displayResult(result) {
        console.log('\\n📊 RESULT:');
        console.log('─'.repeat(60));
        
        if (result.success) {
            console.log('✅ Status: SUCCESS');
            console.log(`⏱️  Time: ${result.elapsed}ms`);
            console.log(`🔄 Loop: ${result.loopCount}`);
            console.log();
            
            // Show assessment
            console.log('📋 ASSESSMENT:');
            console.log(`   Urgency: ${result.assessment.urgency}`);
            console.log(`   Stakes: ${result.assessment.stakes}`);
            console.log(`   Difficulty: ${result.assessment.difficulty}`);
            console.log(`   Precision: ${result.assessment.precision}`);
            console.log(`   Type: ${result.assessment.inputType}`);
            console.log();
            
            // Show triage
            console.log('🎯 TRIAGE:');
            console.log(`   Priorities (${result.triage.priorities.length}):`);
            result.triage.priorities.forEach((p, i) => {
                console.log(`      ${i+1}. ${p.action} [${p.type}] (score: ${p.score})`);
            });
            if (result.triage.deferred.length > 0) {
                console.log(`   Deferred: ${result.triage.deferred.length} tasks`);
            }
            if (result.triage.discarded.length > 0) {
                console.log(`   Discarded: ${result.triage.discarded.length} noise items`);
            }
            console.log();
            
            // Show budget
            console.log('💰 BUDGET:');
            console.log(`   Total Time: ${result.budget.totalTime}ms`);
            console.log(`   Tasks: ${result.budget.tasks.length}`);
            console.log();
            
            // Show execution results
            console.log('🚀 EXECUTION:');
            if (result.result.results && result.result.results.length > 0) {
                result.result.results.forEach((r, i) => {
                    const icon = r.success ? '✓' : '✗';
                    console.log(`   ${icon} ${r.task}: ${r.elapsed}ms`);
                });
            }
            console.log();
            
            // Show final result
            if (result.result.results && result.result.results.length > 0) {
                console.log('💡 FINAL RESULT:');
                const mainResult = result.result.results[result.result.results.length - 1];
                console.log(JSON.stringify(mainResult.result, null, 2));
            }
            
        } else {
            console.log('❌ Status: FAILED');
            console.log('Error:', result.error);
        }
        
        console.log('─'.repeat(60));
    }

    showHelp() {
        console.log('\\n📖 ALIVE CLI Commands:');
        console.log('─'.repeat(60));
        console.log('  help              - Show this help');
        console.log('  status            - Show kernel status');
        console.log('  mode <mode>       - Set mode (PRECISION | HEURISTIC)');
        console.log('  memory            - Show memory status');
        console.log('  quit / exit       - Exit CLI');
        console.log('\\nOr enter a cooking query:');
        console.log('  "Search for pasta recipes"');
        console.log('  "Compare recipes for chocolate cake"');
        console.log('  "Substitute for butter"');
        console.log('  "Convert 2 cups to ml"');
        console.log('─'.repeat(60));
    }

    showStatus() {
        const status = this.kernel.getStatus();
        console.log('\\n🔍 KERNEL STATUS:');
        console.log('─'.repeat(60));
        console.log(`  Mode: ${status.mode}`);
        console.log(`  Loop Count: ${status.loopCount}`);
        console.log(`  Memory:`);
        console.log(`    Stream: ${status.memory.stream} entries`);
        console.log(`    Working: ${status.memory.working} items`);
        console.log(`    Long-term: ${status.memory.longTerm} items`);
        console.log(`  Uptime: ${Math.round(status.uptime)}s`);
        console.log('─'.repeat(60));
    }

    setMode(args) {
        if (args.length === 0) {
            console.log('\\n⚠️  Usage: mode <PRECISION|HEURISTIC>');
            return;
        }
        
        const mode = args[0].toUpperCase();
        
        try {
            this.kernel.setMode(mode);
            console.log(`\\n✅ Mode set to: ${mode}`);
        } catch (error) {
            console.log(`\\n❌ Error: ${error.message}`);
        }
    }

    showMemory() {
        console.log('\\n🧠 MEMORY STATUS:');
        console.log('─'.repeat(60));
        
        const streamStatus = this.kernel.streamMemory.getStatus();
        console.log('  Stream Memory:');
        console.log(`    Size: ${streamStatus.size}/${streamStatus.maxSize}`);
        console.log(`    Mode: ${streamStatus.mode}`);
        
        const workingStatus = this.kernel.workingMemory.getStatus();
        console.log('\\n  Working Memory:');
        console.log(`    State Keys: ${workingStatus.stateKeys}`);
        console.log(`    Assumptions: ${workingStatus.assumptions}`);
        console.log(`    Active Task: ${workingStatus.activeTask || 'None'}`);
        console.log(`    Contradictions: ${workingStatus.hasContradictions ? 'YES ⚠️' : 'No'}`);
        
        const longTermStatus = this.kernel.longTermMemory.getStatus();
        console.log('\\n  Long-term Memory:');
        console.log(`    Total Items: ${longTermStatus.totalItems}`);
        console.log(`    Recipes: ${longTermStatus.recipes}`);
        console.log(`    Preferences: ${longTermStatus.preferences}`);
        console.log(`    Patterns: ${longTermStatus.patterns}`);
        
        console.log('─'.repeat(60));
    }

    debugCommand(args) {
        if (args.length === 0 || args[0].toLowerCase() === 'meta') {
            const { debugMeta } = require('./cli_meta');
            debugMeta();
        } else {
            console.log('\\n⚠️  Usage: debug meta');
        }
    }

    quit() {
        console.log('\\nShutting down ALIVE...');
        this.rl.close();
    }
}

// Start CLI if run directly
if (require.main === module) {
    const cli = new ALIVECLI();
    cli.start();
}

module.exports = ALIVECLI;
