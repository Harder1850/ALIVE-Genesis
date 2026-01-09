// meta/MetaLoop.js
// MetaLoop v0: lightweight self-optimization via run logs + after-action review + simple promotions.
// - Writes JSONL run logs to /data/runlog.jsonl
// - Writes playbook drafts to /playbooks/drafts/
// - Never mutates core code; only writes logs and drafts.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function stableHash(obj) {
  // stable-ish hash for grouping similar tasks without heavy dependencies
  const json = JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash("sha256").update(json).digest("hex").slice(0, 16);
}

function clampInt(n, min, max) {
  const x = Number.isFinite(n) ? Math.trunc(n) : min;
  return Math.max(min, Math.min(max, x));
}

class MetaLoop {
  /**
   * @param {object} opts
   * @param {string} [opts.repoRoot] - absolute or relative root; defaults to process.cwd()
   * @param {string} [opts.dataDir] - where logs go; default "<root>/data"
   * @param {string} [opts.playbookDraftDir] - default "<root>/playbooks/drafts"
   * @param {number} [opts.promoteAfter] - repeat count to draft playbook; default 3
   * @param {number} [opts.maxRecentScan] - how many recent runs to scan for repeats; default 200
   */
  constructor(opts = {}) {
    this.repoRoot = opts.repoRoot || process.cwd();
    this.dataDir = opts.dataDir || path.join(this.repoRoot, "data");
    this.playbookDraftDir =
      opts.playbookDraftDir || path.join(this.repoRoot, "playbooks", "drafts");
    this.playbookActiveDir =
      opts.playbookActiveDir || path.join(this.repoRoot, "playbooks", "active");

    this.promoteAfter = clampInt(opts.promoteAfter ?? 3, 2, 10);
    this.maxRecentScan = clampInt(opts.maxRecentScan ?? 200, 50, 2000);
    
    // Task 3: Staleness threshold (days)
    this.stalenessThresholdDays = clampInt(opts.stalenessThresholdDays ?? 30, 1, 365);
    
    // Debug mode: gate stderr logging
    this.debug = opts.debug || process.env.METALOOP_DEBUG === '1';

    ensureDir(this.dataDir);
    ensureDir(this.playbookDraftDir);
    ensureDir(this.playbookActiveDir);

    this.runlogPath = path.join(this.dataDir, "runlog.jsonl");
    this.metaStatePath = path.join(this.dataDir, "meta_state.json");

    this.state = this._loadState();
    this.activePlaybooks = this._loadActivePlaybooks();
  }

  _loadState() {
    try {
      const raw = fs.readFileSync(this.metaStatePath, "utf8");
      const s = JSON.parse(raw);
      return {
        // Per (domain|taskType) lookup tendency: higher => more likely to browse/search
        lookupBias: s.lookupBias || {},
        // Track drafts already written to avoid duplicates
        draftedKeys: s.draftedKeys || {},
        // Track active playbook usage (Checkpoint 3)
        activeUsedCountById: s.activeUsedCountById || {},
        lastUsedAtById: s.lastUsedAtById || {},
        // Track playbook statistics (Task 2)
        firstUsedAtById: s.firstUsedAtById || {},
        usageHistoryById: s.usageHistoryById || {}, // Array of timestamps per playbook
      };
    } catch {
      return { 
        lookupBias: {}, 
        draftedKeys: {},
        activeUsedCountById: {},
        lastUsedAtById: {},
        firstUsedAtById: {},
        usageHistoryById: {},
      };
    }
  }

  _saveState() {
    // Atomic write: write to temp file then rename
    // Use unique temp file name to avoid collisions in rapid writes
    const tempPath = `${this.metaStatePath}.tmp.${process.pid}.${Date.now()}`;
    const content = JSON.stringify(this.state, null, 2);
    
    try {
      fs.writeFileSync(tempPath, content, "utf8");
      // Windows-safe rename (will overwrite existing file)
      if (fs.existsSync(this.metaStatePath)) {
        fs.unlinkSync(this.metaStatePath);
      }
      fs.renameSync(tempPath, this.metaStatePath);
    } catch (err) {
      // Cleanup temp file if operation failed
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch {}
      }
      throw err;
    }
  }

  // ========== ACTIVE PLAYBOOK METHODS (Checkpoint 3) ==========

  /**
   * Load all active playbooks from playbooks/active/
   * Returns array of playbook objects with their pattern keys
   */
  _loadActivePlaybooks() {
    const playbooks = [];
    
    try {
      if (!fs.existsSync(this.playbookActiveDir)) return playbooks;
      
      const files = fs.readdirSync(this.playbookActiveDir)
        .filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        try {
          const filepath = path.join(this.playbookActiveDir, file);
          const content = fs.readFileSync(filepath, 'utf8');
          const playbook = JSON.parse(content);
          
          // Validate required fields
          if (playbook.id && playbook.trigger && playbook.trigger.patternKey) {
            playbooks.push({
              ...playbook,
              _filepath: filepath,
            });
          }
        } catch (err) {
          // Skip invalid playbook files
          process.stderr.write(`Warning: Could not load playbook ${file}: ${err.message}\n`);
        }
      }
    } catch (err) {
      // Directory read failed, return empty array
    }
    
    return playbooks;
  }

  /**
   * Find an active playbook matching the given pattern key
   * @param {string} patternKey - normalized pattern key
   * @returns {object|null} playbook or null
   */
  _findActivePlaybook(patternKey) {
    if (!this.activePlaybooks || this.activePlaybooks.length === 0) {
      return null;
    }
    
    return this.activePlaybooks.find(pb => pb.trigger.patternKey === patternKey) || null;
  }

  /**
   * Record usage of an active playbook
   * Updates usage stats in state (Task 2: enhanced statistics)
   * @param {string} playbookId
   * @param {string} patternKey
   */
  recordPlaybookUse(playbookId, patternKey) {
    const now = nowIso();
    
    // Increment use count
    const currentCount = this.state.activeUsedCountById[playbookId] || 0;
    this.state.activeUsedCountById[playbookId] = currentCount + 1;
    
    // Track first use (Task 2)
    if (!this.state.firstUsedAtById[playbookId]) {
      this.state.firstUsedAtById[playbookId] = now;
    }
    
    // Update last used timestamp
    this.state.lastUsedAtById[playbookId] = now;
    
    // Track usage history (Task 2) - keep last 100 timestamps per playbook
    if (!this.state.usageHistoryById[playbookId]) {
      this.state.usageHistoryById[playbookId] = [];
    }
    this.state.usageHistoryById[playbookId].push(now);
    // Limit history to last 100 entries to prevent unbounded growth
    if (this.state.usageHistoryById[playbookId].length > 100) {
      this.state.usageHistoryById[playbookId] = this.state.usageHistoryById[playbookId].slice(-100);
    }
    
    // Save state atomically
    this._saveState();
    
    return {
      playbookId,
      patternKey,
      useCount: this.state.activeUsedCountById[playbookId],
      lastUsedAt: this.state.lastUsedAtById[playbookId],
      firstUsedAt: this.state.firstUsedAtById[playbookId],
    };
  }

  /**
   * Get enhanced statistics for a playbook (Task 2)
   * @param {string} playbookId
   * @returns {object|null} stats object or null if playbook not tracked
   */
  getPlaybookStats(playbookId) {
    const useCount = this.state.activeUsedCountById[playbookId];
    if (!useCount) return null; // Not tracked yet
    
    const firstUsedAt = this.state.firstUsedAtById[playbookId];
    const lastUsedAt = this.state.lastUsedAtById[playbookId];
    const history = this.state.usageHistoryById[playbookId] || [];
    
    // Calculate average interval between uses
    let avgIntervalMs = null;
    if (history.length >= 2) {
      const intervals = [];
      for (let i = 1; i < history.length; i++) {
        const prevTime = new Date(history[i - 1]).getTime();
        const currTime = new Date(history[i]).getTime();
        intervals.push(currTime - prevTime);
      }
      const sum = intervals.reduce((a, b) => a + b, 0);
      avgIntervalMs = Math.round(sum / intervals.length);
    }
    
    // Calculate days since first use
    let daysSinceFirstUse = null;
    if (firstUsedAt) {
      const firstTime = new Date(firstUsedAt).getTime();
      const nowTime = Date.now();
      daysSinceFirstUse = Math.round((nowTime - firstTime) / (1000 * 60 * 60 * 24));
    }
    
    // Calculate days since last use
    let daysSinceLastUse = null;
    if (lastUsedAt) {
      const lastTime = new Date(lastUsedAt).getTime();
      const nowTime = Date.now();
      daysSinceLastUse = Math.round((nowTime - lastTime) / (1000 * 60 * 60 * 24));
    }
    
    return {
      playbookId,
      useCount,
      firstUsedAt,
      lastUsedAt,
      daysSinceFirstUse,
      daysSinceLastUse,
      avgIntervalMs,
      avgIntervalHours: avgIntervalMs ? Math.round(avgIntervalMs / (1000 * 60 * 60) * 10) / 10 : null,
      historyLength: history.length,
    };
  }

  /**
   * Check if a playbook is considered stale (Task 3 - Observer Only)
   * Does NOT alter matching behavior or delete anything
   * @param {string} playbookId
   * @returns {boolean} true if stale, false otherwise
   */
  isPlaybookStale(playbookId) {
    const stats = this.getPlaybookStats(playbookId);
    if (!stats) return false; // Not tracked = not stale
    
    // A playbook is stale if it hasn't been used for more than threshold days
    return stats.daysSinceLastUse !== null && stats.daysSinceLastUse > this.stalenessThresholdDays;
  }

  /**
   * Get all active playbooks with their statistics
   * TASK 1: CLI Introspection helper (no CLI command yet)
   * @returns {array} Array of playbook objects with stats
   */
  getAllActivePlaybooksWithStats() {
    return this.activePlaybooks.map(pb => {
      const stats = this.getPlaybookStats(pb.id);
      const isStale = this.isPlaybookStale(pb.id);
      
      return {
        id: pb.id,
        domain: pb.domain,
        taskType: pb.taskType,
        patternKey: pb.trigger.patternKey,
        description: pb.trigger.description || null,
        stats: stats || { useCount: 0 },
        isStale,
        responsePrefix: pb.responseHints?.prefix || null,
      };
    });
  }

  /**
   * Get all draft playbooks with promotion counts
   * TASK 1: CLI Introspection helper
   * @returns {array} Array of draft playbook info
   */
  getAllDraftPlaybooks() {
    const drafts = [];
    
    try {
      if (!fs.existsSync(this.playbookDraftDir)) return drafts;
      
      const files = fs.readdirSync(this.playbookDraftDir)
        .filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        try {
          const filepath = path.join(this.playbookDraftDir, file);
          const content = fs.readFileSync(filepath, 'utf8');
          const draft = JSON.parse(content);
          
          // Check if already promoted (tracked in draftedKeys)
          const draftInfo = this.state.draftedKeys[draft.trigger?.patternKey];
          
          drafts.push({
            id: draft.id,
            domain: draft.domain,
            taskType: draft.taskType,
            patternKey: draft.trigger?.patternKey,
            minSuccessCount: draft.trigger?.minSuccessCount || 0,
            createdAt: draft.createdAt,
            filepath,
            draftedAt: draftInfo?.draftedAt || null,
          });
        } catch (err) {
          // Skip invalid drafts
        }
      }
    } catch (err) {
      // Directory read failed
    }
    
    return drafts;
  }

  /**
   * Get all stale playbooks
   * TASK 1: CLI Introspection helper
   * @returns {array} Array of stale playbook info
   */
  getStalePlaybooks() {
    return this.activePlaybooks
      .filter(pb => this.isPlaybookStale(pb.id))
      .map(pb => {
        const stats = this.getPlaybookStats(pb.id);
        return {
          id: pb.id,
          domain: pb.domain,
          taskType: pb.taskType,
          patternKey: pb.trigger.patternKey,
          stats,
        };
      });
  }

  // ========== END ACTIVE PLAYBOOK METHODS ==========

  /**
   * Record a completed run, then perform after-action review.
   * @param {object} run
   * @param {string} run.domain - e.g. "cooking"
   * @param {string} run.taskType - e.g. "compare" | "substitute" | "add_recipe"
   * @param {object} run.assessment - {urgency, stakes, difficulty, precision}
   * @param {object} run.metrics - {timeMs, stepCount, toolCalls, lookupUsed, lookupCount, resetTriggered}
   * @param {object} run.outcome - {status: "success"|"partial"|"fail", userCorrectionsCount?: number}
   * @param {object} run.inputs - small summary only; do NOT store secrets
   * @param {object} run.outputs - optional small summary; keep tiny
   * @param {object} [run.lookupImpact] - {decisionChanged?: boolean} (if you can compute it; else MetaLoop will infer crudely)
   */
  recordAndReview(run) {
    const safeRun = this._sanitizeRun(run);
    this._appendRunLog(safeRun);

    const review = this.afterActionReview(safeRun);
    return review;
  }

  _sanitizeRun(run) {
    // Keep logs compact & non-sensitive by design.
    const assessment = run.assessment || {};
    const metrics = run.metrics || {};
    const outcome = run.outcome || {};

    return {
      ts: nowIso(),
      domain: String(run.domain || "unknown"),
      taskType: String(run.taskType || "unknown"),
      assessment: {
        urgency: assessment.urgency || "LATER",
        stakes: assessment.stakes || "low",
        difficulty: assessment.difficulty || "easy",
        precision: assessment.precision || "flexible",
      },
      metrics: {
        timeMs: clampInt(metrics.timeMs ?? 0, 0, 24 * 60 * 60 * 1000),
        stepCount: clampInt(metrics.stepCount ?? 0, 0, 10000),
        toolCalls: clampInt(metrics.toolCalls ?? 0, 0, 10000),
        lookupUsed: Boolean(metrics.lookupUsed),
        lookupCount: clampInt(metrics.lookupCount ?? 0, 0, 1000),
        resetTriggered: Boolean(metrics.resetTriggered),
      },
      outcome: {
        status: outcome.status || "partial",
        userCorrectionsCount: clampInt(outcome.userCorrectionsCount ?? 0, 0, 1000),
      },
      // Inputs/outputs should be summaries only; caller responsibility.
      inputs: run.inputs || {},
      outputs: run.outputs || {},
      lookupImpact: run.lookupImpact || {},
    };
  }

  _appendRunLog(run) {
    fs.appendFileSync(this.runlogPath, JSON.stringify(run) + "\n", "utf8");
  }

  /**
   * After-action review: flag waste, adjust lookup bias, and draft playbooks if repeated success.
   * Also checks for active playbook matches and records usage.
   * @param {object} run - sanitized run object
   */
  afterActionReview(run) {
    const wasteFlags = [];
    const candidatePromotions = [];
    const policyAdjustments = [];
    let playbookMatch = null;

    // 0) Check for active playbook match (Checkpoint 3)
    const patternKey = this._patternKey(run);
    const activePlaybook = this._findActivePlaybook(patternKey);
    
    if (activePlaybook) {
      const usage = this.recordPlaybookUse(activePlaybook.id, patternKey);
      playbookMatch = {
        playbookId: activePlaybook.id,
        patternKey,
        useCount: usage.useCount,
        stepNames: activePlaybook.steps?.map(s => s.name) || [],
        responsePrefix: activePlaybook.responseHints?.prefix || null,
        responseOutline: activePlaybook.responseHints?.outline || null,  // TASK 2
      };
      
      // Log to stderr only if debug enabled
      if (this.debug) {
        process.stderr.write(`📗 MetaLoop: Active playbook "${activePlaybook.id}" matched (use #${usage.useCount})\n`);
      }
    }

    // 1) Infer whether lookup mattered
    const decisionChanged =
      typeof run.lookupImpact.decisionChanged === "boolean"
        ? run.lookupImpact.decisionChanged
        : this._inferLookupImpact(run);

    // 2) Waste flags
    if (run.metrics.lookupUsed && !decisionChanged) {
      wasteFlags.push("lookup_did_not_change_decision");
    }
    if (run.outcome.userCorrectionsCount > 0 && run.assessment.precision === "strict") {
      wasteFlags.push("precision_mode_had_user_corrections");
    }
    if (run.metrics.stepCount > 12 && run.assessment.stakes === "low") {
      wasteFlags.push("too_many_steps_for_low_stakes");
    }
    if (run.metrics.resetTriggered) {
      wasteFlags.push("reset_triggered");
    }

    // 3) Update lookup bias (very simple)
    // If lookup used but didn't change decision => reduce bias.
    // If lookup not used and outcome failed => increase bias (for next time).
    const biasKey = `${run.domain}|${run.taskType}`;
    const prevBias = Number.isFinite(this.state.lookupBias[biasKey])
      ? this.state.lookupBias[biasKey]
      : 0.0;

    let newBias = prevBias;

    if (run.metrics.lookupUsed && !decisionChanged) newBias -= 0.25;
    if (!run.metrics.lookupUsed && run.outcome.status === "fail") newBias += 0.25;

    // Clamp [-2, +2] (negative = browse less, positive = browse more)
    newBias = Math.max(-2, Math.min(2, newBias));

    if (newBias !== prevBias) {
      this.state.lookupBias[biasKey] = newBias;
      policyAdjustments.push({
        type: "lookup_bias_update",
        key: biasKey,
        from: prevBias,
        to: newBias,
      });
      
      if (this.debug) {
        process.stderr.write(`🔄 MetaLoop: Adjusted lookup bias for "${biasKey}": ${prevBias.toFixed(2)} → ${newBias.toFixed(2)}\n`);
      }
    }

    // 4) Draft playbook on repeats (simple: 3 successful runs with same "pattern key")
    if (run.outcome.status === "success") {
      const patternKey = this._patternKey(run);
      const count = this._countRecentMatches(patternKey, run.domain, run.taskType);

      if (count >= this.promoteAfter && !this.state.draftedKeys[patternKey]) {
        const draft = this._createPlaybookDraft(run, patternKey, count);
        const draftPath = this._writePlaybookDraft(draft);
        this.state.draftedKeys[patternKey] = { draftedAt: nowIso(), draftPath };
        candidatePromotions.push({
          type: "playbook_draft",
          patternKey,
          count,
          draftPath,
        });
        
        if (this.debug) {
          process.stderr.write(`📝 MetaLoop: Created playbook draft "${draft.id}" (${count} successful uses)\n`);
          process.stderr.write(`   Location: ${draftPath}\n`);
        }
      }
    }

    this._saveState();

    return {
      ts: nowIso(),
      domain: run.domain,
      taskType: run.taskType,
      decisionChangedByLookup: decisionChanged,
      wasteFlags,
      policyAdjustments,
      candidatePromotions,
      playbookMatch,
    };
  }

  getLookupBias(domain, taskType) {
    const biasKey = `${domain}|${taskType}`;
    return Number.isFinite(this.state.lookupBias[biasKey]) ? this.state.lookupBias[biasKey] : 0.0;
  }

  _inferLookupImpact(run) {
    // crude heuristic: if lookup used AND outcome success with no corrections in strict mode,
    // assume it helped; otherwise assume it didn't.
    if (!run.metrics.lookupUsed) return false;
    if (run.assessment.precision === "strict") return run.outcome.userCorrectionsCount === 0;
    // flexible mode: assume lookup helped only if it saved time/steps compared to typical (not available yet)
    return false;
  }

  // ========== NORMALIZATION HELPERS (Checkpoint 2) ==========
  
  /**
   * Normalize text: lowercase, remove punctuation, collapse whitespace
   */
  _normalizeText(s) {
    if (typeof s !== 'string') return '';
    return s
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')  // Replace punctuation with space
      .replace(/\s+/g, ' ')       // Collapse whitespace
      .trim();
  }

  /**
   * Normalize taskType via synonym map
   */
  _normalizeTaskType(taskType) {
    const normalized = (taskType || '').toLowerCase().trim();
    
    // Synonym map
    const synonyms = {
      'difference': 'compare',
      'vs': 'compare',
      'versus': 'compare',
      'which is better': 'compare',
      'better': 'compare',
      'how to': 'howto',
      'steps': 'howto',
      'instructions': 'howto',
    };
    
    return synonyms[normalized] || normalized;
  }

  /**
   * Bucket assessment fields to avoid tiny numeric changes breaking matches
   */
  _bucketAssessment(assessment) {
    const bucket = (val) => {
      if (typeof val === 'string') {
        const lower = val.toLowerCase();
        if (lower === 'low' || lower === 'easy' || lower === 'later') return 'low';
        if (lower === 'med' || lower === 'medium' || lower === 'moderate' || lower === 'soon') return 'med';
        if (lower === 'high' || lower === 'hard' || lower === 'critical' || lower === 'now') return 'high';
        return lower;
      }
      if (typeof val === 'number') {
        if (val < 0.34) return 'low';
        if (val < 0.67) return 'med';
        return 'high';
      }
      return 'low'; // default
    };

    return {
      urgency: bucket(assessment.urgency),
      stakes: bucket(assessment.stakes),
      difficulty: bucket(assessment.difficulty),
      precision: (assessment.precision || 'flexible').toLowerCase(),
    };
  }

  /**
   * Extract 1-3 "entities" (longest meaningful tokens) from text
   */
  _extractEntitiesFromText(text) {
    const normalized = this._normalizeText(text);
    
    // Simple stopwords list
    const stopwords = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
      'can', 'could', 'may', 'might', 'must', 'this', 'that', 'these', 'those',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
      'my', 'your', 'his', 'her', 'its', 'our', 'their', 'please', 'help',
    ]);

    const words = normalized.split(/\s+/).filter(w => w.length >= 4 && !stopwords.has(w));
    
    // Sort by length (longest first), then alphabetically for stability
    words.sort((a, b) => {
      if (b.length !== a.length) return b.length - a.length;
      return a.localeCompare(b);
    });

    // Return top 3 unique entities
    return [...new Set(words)].slice(0, 3);
  }

  /**
   * Normalize intent from a run object for better pattern matching
   */
  _normalizeIntent(run) {
    const querySummary = run.inputs?.querySummary || '';
    
    return {
      domain: (run.domain || 'unknown').toLowerCase().trim(),
      taskType: this._normalizeTaskType(run.taskType),
      intent: {
        queryNorm: this._normalizeText(querySummary),
        entities: this._extractEntitiesFromText(querySummary),
      },
      assessment: this._bucketAssessment(run.assessment || {}),
    };
  }

  // ========== END NORMALIZATION ==========

  _patternKey(run) {
    // Build a pattern key that ignores cosmetic differences but captures intent.
    // Uses normalization to increase match rate for same-intent queries.
    const normalized = this._normalizeIntent(run);
    const intentSig = stableHash(normalized);
    return `${normalized.domain}|${normalized.taskType}|${intentSig}`;
  }

  _readRecentRuns() {
    try {
      if (!fs.existsSync(this.runlogPath)) return [];
      const lines = fs.readFileSync(this.runlogPath, "utf8").trim().split("\n");
      const recent = lines.slice(Math.max(0, lines.length - this.maxRecentScan));
      return recent
        .map((l) => {
          try {
            return JSON.parse(l);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  _countRecentMatches(patternKey, domain, taskType) {
    const runs = this._readRecentRuns();
    let count = 0;
    for (const r of runs) {
      if (r.domain !== domain) continue;
      if (r.taskType !== taskType) continue;
      // recompute key for safety
      const k = this._patternKey(r);
      if (k === patternKey && r.outcome?.status === "success") count++;
    }
    return count;
  }

  _createPlaybookDraft(run, patternKey, count) {
    return {
      id: `pb_${patternKey.replace(/\|/g, "_")}`,
      version: "0.1",
      createdAt: nowIso(),
      domain: run.domain,
      taskType: run.taskType,
      trigger: {
        description: "Auto-drafted from repeated successful runs",
        patternKey,
        minSuccessCount: count,
        inputsExample: run.inputs,
      },
      steps: [
        // We don't have internal step trace here unless you add it.
        // Keep placeholder steps; Klein can later fill with actual step trace.
        { name: "Orient", notes: "Classify request and constraints" },
        { name: "Triage", notes: "Pick top priorities and dependencies" },
        { name: "Execute", notes: "Run minimal action sequence" },
        { name: "Validate", notes: "Check outcome criteria" },
      ],
      validation: {
        precision: run.assessment.precision,
        successCriteria: ["Outcome status == success", "No user corrections in strict mode"],
      },
      notes: {
        whyPromoted: "Same pattern succeeded repeatedly; capturing as reusable playbook draft.",
      },
    };
  }

  _writePlaybookDraft(draft) {
    const filename = `${draft.id}_${Date.now()}.json`;
    const p = path.join(this.playbookDraftDir, filename);
    fs.writeFileSync(p, JSON.stringify(draft, null, 2), "utf8");
    return p;
  }

  /**
   * Generate full audit snapshot for system state review (TASK 3)
   * Returns comprehensive snapshot of MetaLoop state + playbooks
   * Deterministic output for auditability
   * @returns {object} Complete audit snapshot
   */
  generateAuditSnapshot() {
    const timestamp = nowIso();
    
    // 1. State snapshot
    const stateSnapshot = {
      lookupBias: { ...this.state.lookupBias },
      draftedKeysCount: Object.keys(this.state.draftedKeys).length,
      draftedKeys: Object.keys(this.state.draftedKeys),
      activePlaybookTracking: {
        trackedCount: Object.keys(this.state.activeUsedCountById).length,
        totalUses: Object.values(this.state.activeUsedCountById).reduce((a, b) => a + b, 0),
      },
    };
    
    // 2. Active playbooks with full stats
    const activePlaybooksSnapshot = this.getAllActivePlaybooksWithStats();
    
    // 3. Draft playbooks summary
    const draftPlaybooksSnapshot = this.getAllDraftPlaybooks();
    
    // 4. Stale playbooks
    const stalePlaybooksSnapshot = this.getStalePlaybooks();
    
    // 5. Runlog summary
    const runs = this._readRecentRuns();
    const runlogSnapshot = {
      totalEntriesScanned: runs.length,
      oldestEntry: runs.length > 0 ? runs[0].ts : null,
      newestEntry: runs.length > 0 ? runs[runs.length - 1].ts : null,
      successCount: runs.filter(r => r.outcome?.status === 'success').length,
      failCount: runs.filter(r => r.outcome?.status === 'fail').length,
      partialCount: runs.filter(r => r.outcome?.status === 'partial').length,
    };
    
    // 6. Pattern distribution (top 10)
    const patternCounts = new Map();
    runs.forEach(r => {
      try {
        const key = this._patternKey(r);
        patternCounts.set(key, (patternCounts.get(key) || 0) + 1);
      } catch {}
    });
    
    const topPatterns = [...patternCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => ({ patternKey: key, occurrences: count }));
    
    return {
      snapshotVersion: '1.0',
      timestamp,
      config: {
        promoteAfter: this.promoteAfter,
        maxRecentScan: this.maxRecentScan,
        stalenessThresholdDays: this.stalenessThresholdDays,
      },
      state: stateSnapshot,
      activePlaybooks: {
        count: activePlaybooksSnapshot.length,
        playbooks: activePlaybooksSnapshot,
      },
      draftPlaybooks: {
        count: draftPlaybooksSnapshot.length,
        playbooks: draftPlaybooksSnapshot,
      },
      stalePlaybooks: {
        count: stalePlaybooksSnapshot.length,
        playbooks: stalePlaybooksSnapshot,
      },
      runlog: runlogSnapshot,
      patterns: {
        topPatterns,
      },
      paths: {
        repoRoot: this.repoRoot,
        dataDir: this.dataDir,
        playbookDraftDir: this.playbookDraftDir,
        playbookActiveDir: this.playbookActiveDir,
        runlogPath: this.runlogPath,
        metaStatePath: this.metaStatePath,
      },
    };
  }

  /**
   * Debug helper: returns last N runs + current policy state.
   */
  debugSnapshot(limit = 10) {
    const runs = this._readRecentRuns();
    const last = runs.slice(Math.max(0, runs.length - clampInt(limit, 1, 200)));
    return {
      runlogPath: this.runlogPath,
      metaStatePath: this.metaStatePath,
      lastRuns: last,
      lookupBias: this.state.lookupBias,
      draftedKeys: this.state.draftedKeys,
    };
  }
}

module.exports = { MetaLoop };

