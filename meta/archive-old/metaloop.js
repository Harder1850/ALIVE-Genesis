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

    this.promoteAfter = clampInt(opts.promoteAfter ?? 3, 2, 10);
    this.maxRecentScan = clampInt(opts.maxRecentScan ?? 200, 50, 2000);

    ensureDir(this.dataDir);
    ensureDir(this.playbookDraftDir);

    this.runlogPath = path.join(this.dataDir, "runlog.jsonl");
    this.metaStatePath = path.join(this.dataDir, "meta_state.json");

    this.state = this._loadState();
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
      };
    } catch {
      return { lookupBias: {}, draftedKeys: {} };
    }
  }

  _saveState() {
    fs.writeFileSync(this.metaStatePath, JSON.stringify(this.state, null, 2), "utf8");
  }

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
   * @param {object} run - sanitized run object
   */
  afterActionReview(run) {
    const wasteFlags = [];
    const candidatePromotions = [];
    const policyAdjustments = [];

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
      
      console.log(`🔄 MetaLoop: Adjusted lookup bias for "${biasKey}": ${prevBias.toFixed(2)} → ${newBias.toFixed(2)}`);
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
        
        console.log(`📝 MetaLoop: Created playbook draft "${draft.id}" (${count} successful uses)`);
        console.log(`   Location: ${draftPath}`);
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

  _patternKey(run) {
    // Build a pattern key that ignores cosmetic differences but captures intent.
    // Keep it simple: domain + taskType + a small hashed "intent signature"
    const intentSig = stableHash({
      // caller-provided summary should be stable-ish (e.g., target dish, constraints)
      inputs: run.inputs,
      assessment: run.assessment,
    });
    return `${run.domain}|${run.taskType}|${intentSig}`;
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

// Singleton instance
const instance = new MetaLoop();

module.exports = instance;
