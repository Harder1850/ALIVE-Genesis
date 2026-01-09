// LongTermMemory - Stable Knowledge Base
// Recipe library, preferences, trusted sources, playbooks, successful patterns
// Promotion: 3+ uses within 30 days
// Demotion: Unused for extended period

class LongTermMemory {
    constructor() {
        this.store = new Map();
        this.index = {
            recipes: new Map(),
            preferences: new Map(),
            patterns: new Map(),
            sources: new Map(),
            playbooks: new Map()
        };
        this.promotionThreshold = 3; // Uses
        this.promotionWindow = 30 * 24 * 60 * 60 * 1000; // 30 days
        this.demotionAge = 90 * 24 * 60 * 60 * 1000; // 90 days unused
    }

    /**
     * Store item in long-term memory
     */
    store(item) {
        const id = item.id || this.generateId(item);
        const entry = {
            ...item,
            id,
            storedAt: Date.now(),
            lastAccessed: Date.now(),
            accessCount: item.accessCount || 0,
            promoted: item.promoted || false
        };
        
        this.store.set(id, entry);
        
        // Add to appropriate index
        this.indexItem(entry);
        
        return id;
    }

    /**
     * Retrieve item by ID
     */
    get(id) {
        const item = this.store.get(id);
        if (item) {
            // Update access tracking
            item.lastAccessed = Date.now();
            item.accessCount++;
            return { ...item };
        }
        return null;
    }

    /**
     * Find item by pattern
     */
    find(pattern) {
        for (const [id, item] of this.store.entries()) {
            if (this.matchesPattern(item, pattern)) {
                // Update access tracking
                item.lastAccessed = Date.now();
                item.accessCount++;
                return { ...item };
            }
        }
        return null;
    }

    /**
     * Search by query
     */
    search(query, type = null) {
        const results = [];
        const lowerQuery = query.toLowerCase();
        
        for (const [id, item] of this.store.entries()) {
            if (type && item.type !== type) continue;
            
            // Search in item content
            const content = JSON.stringify(item).toLowerCase();
            if (content.includes(lowerQuery)) {
                item.lastAccessed = Date.now();
                item.accessCount++;
                results.push({ ...item });
            }
        }
        
        return results;
    }

    /**
     * Check if item matches pattern
     */
    matchesPattern(item, pattern) {
        for (const [key, value] of Object.entries(pattern)) {
            if (item[key] !== value) {
                return false;
            }
        }
        return true;
    }

    /**
     * Index item for faster retrieval
     */
    indexItem(item) {
        const type = item.type || this.inferType(item);
        
        switch (type) {
            case 'recipe':
                this.index.recipes.set(item.id, item);
                break;
            case 'preference':
                this.index.preferences.set(item.id, item);
                break;
            case 'pattern':
                this.index.patterns.set(item.id, item);
                break;
            case 'source':
                this.index.sources.set(item.id, item);
                break;
            case 'playbook':
                this.index.playbooks.set(item.id, item);
                break;
        }
    }

    /**
     * Infer type from item content
     */
    inferType(item) {
        if (item.pattern) return 'pattern';
        if (item.recipe || item.ingredients) return 'recipe';
        if (item.preference) return 'preference';
        if (item.source || item.url) return 'source';
        if (item.playbook || item.steps) return 'playbook';
        return 'general';
    }

    /**
     * Get all items of a type
     */
    getByType(type) {
        const index = this.index[type + 's'] || this.index[type];
        if (index) {
            return Array.from(index.values());
        }
        
        // Fallback: filter from store
        const results = [];
        for (const item of this.store.values()) {
            if (item.type === type) {
                results.push({ ...item });
            }
        }
        return results;
    }

    /**
     * Check if item should be promoted from working memory
     */
    shouldPromote(item) {
        const existing = this.find(item.pattern || item);
        
        if (!existing) return false;
        
        // Check if meets promotion criteria
        const now = Date.now();
        const windowStart = now - this.promotionWindow;
        
        // Count accesses within window
        if (existing.accessCount >= this.promotionThreshold &&
            existing.storedAt >= windowStart) {
            return true;
        }
        
        return false;
    }

    /**
     * Demote/archive unused items
     */
    demoteOld() {
        const now = Date.now();
        const demoted = [];
        
        for (const [id, item] of this.store.entries()) {
            const age = now - item.lastAccessed;
            
            if (age > this.demotionAge && !item.protected) {
                this.store.delete(id);
                this.removeFromIndex(item);
                demoted.push(item);
            }
        }
        
        if (demoted.length > 0) {
            console.log(`🗄️  Archived ${demoted.length} unused items`);
        }
        
        return demoted;
    }

    /**
     * Remove item from index
     */
    removeFromIndex(item) {
        const type = item.type || this.inferType(item);
        const indexName = type + 's';
        
        if (this.index[indexName]) {
            this.index[indexName].delete(item.id);
        }
    }

    /**
     * Update item
     */
    update(id, updates) {
        const item = this.store.get(id);
        if (!item) return false;
        
        Object.assign(item, updates);
        item.updatedAt = Date.now();
        item.lastAccessed = Date.now();
        
        return true;
    }

    /**
     * Delete item
     */
    delete(id) {
        const item = this.store.get(id);
        if (!item) return false;
        
        this.store.delete(id);
        this.removeFromIndex(item);
        
        return true;
    }

    /**
     * Get all recipes
     */
    getRecipes() {
        return Array.from(this.index.recipes.values());
    }

    /**
     * Get preferences
     */
    getPreferences() {
        return Array.from(this.index.preferences.values());
    }

    /**
     * Get trusted sources
     */
    getTrustedSources() {
        return Array.from(this.index.sources.values())
            .filter(s => s.trusted === true);
    }

    /**
     * Get playbooks
     */
    getPlaybooks() {
        return Array.from(this.index.playbooks.values());
    }

    /**
     * Get successful patterns
     */
    getPatterns() {
        return Array.from(this.index.patterns.values());
    }

    /**
     * Mark source as trusted
     */
    trustSource(sourceId) {
        const source = this.get(sourceId);
        if (source) {
            this.update(sourceId, { trusted: true });
            return true;
        }
        return false;
    }

    /**
     * Store preference
     */
    storePreference(key, value, rationale = '') {
        return this.store({
            type: 'preference',
            key,
            value,
            rationale,
            protected: true // Don't demote preferences
        });
    }

    /**
     * Get preference
     */
    getPreference(key) {
        for (const pref of this.index.preferences.values()) {
            if (pref.key === key) {
                return pref.value;
            }
        }
        return null;
    }

    /**
     * Get memory size
     */
    size() {
        return this.store.size;
    }

    /**
     * Get status
     */
    getStatus() {
        return {
            totalItems: this.store.size,
            recipes: this.index.recipes.size,
            preferences: this.index.preferences.size,
            patterns: this.index.patterns.size,
            sources: this.index.sources.size,
            playbooks: this.index.playbooks.size
        };
    }

    /**
     * Export all data (for backup)
     */
    export() {
        return {
            store: Array.from(this.store.entries()),
            exportedAt: Date.now()
        };
    }

    /**
     * Import data (from backup)
     */
    import(data) {
        if (!data || !data.store) return false;
        
        this.store.clear();
        for (const [id, item] of data.store) {
            this.store.set(id, item);
            this.indexItem(item);
        }
        
        return true;
    }

    /**
     * Generate unique ID
     */
    generateId(item) {
        const type = item.type || 'item';
        return `lt_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Clear all memory (dangerous!)
     */
    clear() {
        this.store.clear();
        this.index = {
            recipes: new Map(),
            preferences: new Map(),
            patterns: new Map(),
            sources: new Map(),
            playbooks: new Map()
        };
        console.log('⚠️  Long-term memory cleared');
    }
}

module.exports = LongTermMemory;
