# AgentOps Protocol

Purpose: push Athena/Jarvis/Thoth to maximum practical performance using measurable iterations.

## Scope

This protocol covers:
- `@Athena` (analysis + orchestration)
- `/Jarvis` (implementation + validation)
- `/Thoth` (prompt/agent design)

## Routing Baseline

- Analysis-only tasks -> `@Athena`
- Code-edit and verification tasks -> `/Jarvis`
- New reusable AI asset tasks -> `/Thoth`

## KPI Definitions

Track the same 5 scores (0-100) each run:

1. Precision
- Are claims grounded in project evidence?
- Scoring: unsupported claims reduce score.

2. Speed
- Was investigation proportional to task complexity?
- Scoring: unnecessary exploration reduces score.

3. Delegation Accuracy
- Was the right tool chosen on first decision?
- Scoring: wrong routing reduces score.

4. Simplicity
- Is output concise without losing correctness?
- Scoring: over-long or vague output reduces score.

5. Risk Control
- Were branch/CI/safety risks caught before guidance?
- Scoring: missed risk checks reduce score.

## Evaluation Loop

Run this loop for each optimization cycle:

1. Use fixed golden tasks from `tests/agent-evals/golden-set.md`.
2. Execute baseline with current agent definitions.
3. Change exactly one rule (minimal diff).
4. Re-run same tasks.
5. Compare KPI deltas.
6. Keep change only if total score improves.

## Change Policy

- One iteration = one rule change.
- No batching multiple logic changes.
- No tool creation unless recurrence >= 3 and ROI is clear.

## Ceiling Detection

Assume practical ceiling reached when all are true:

1. Last 3 iterations each improve total score by < 1.5 points.
2. No single KPI improved by >= 2 points in those 3 iterations.
3. Error profile is stable (same residual misses repeating).

When ceiling is reached:
- Freeze current version as stable.
- Stop prompt churn.
- Improve external factors instead:
  - better test fixtures
  - better repository docs
  - better task clarity
  - better model routing/fallback

## Weekly Cadence

- Weekly: 1 calibration cycle (max 2 rule changes)
- Monthly: model fallback benchmark refresh
- Release gate: no drop in average KPI vs previous stable baseline

## Post-Ceiling Optimization Ladder

If `CEILING_REACHED`, do not churn prompt text first. Improve external levers in this order:

1. Task Input Quality
- Standardize request templates for users (goal, scope, constraints, success criteria).
- Reject ambiguous asks with one targeted clarification.

2. Evidence Quality
- Expand golden set with fresh hard cases from real failures.
- Remove weak/duplicate eval tasks that inflate scores.

3. Retrieval Quality
- Add lightweight repo maps and critical-file index references.
- Prefer focused search patterns over broad scans.

4. Verification Quality
- Enforce task-type specific checks (analysis vs implementation vs asset-design).
- Add mandatory risk checks for branch/CI/rollback-sensitive tasks.

5. Model Routing Quality
- Re-benchmark fallback order quarterly or after model updates.
- Keep the fastest model only if precision and risk-control do not drop.

## Realistic Improvement Boundaries

- Prompt/agent-only tuning does not create a new base model.
- Practical gain usually plateaus after early iterations.
- A sustained `+8%` to `+20%` operational gain is realistic in mature setups.
- Targeting `100%` gain is not realistic for this layer; treat it as asymptotic and optimize toward the highest stable score.

## Re-Evaluation Rule

When new external improvements are applied:
1. Run a full golden-set pass.
2. Compute KPI deltas against current stable baseline.
3. Promote baseline only if total score improves and no KPI regresses materially.
4. If no material gain in 2 consecutive cycles, remain frozen.

## Reporting Template

Use this report after each cycle:

- Iteration:
- Changed Rule:
- Precision:
- Speed:
- Delegation Accuracy:
- Simplicity:
- Risk Control:
- Total:
- Delta vs Previous:
- Keep/Revert:
- Notes:

## Current Status

- Athena calibration state: `CEILING_REACHED`
- Baseline policy: frozen until unfreeze conditions are met
- Last cycle outcome: no high-ROI rule gap detected; shifted to stability mode
- Next action: run weekly verification cycle only (no structural rule churn)
