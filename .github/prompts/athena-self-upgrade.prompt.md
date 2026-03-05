---
description: "Improve Athena itself with iterative self-audit. Use when: calibrating Athena quality, reducing errors, improving decision speed, and tightening tool orchestration."
name: "Athena Self Upgrade"
argument-hint: "What weakness should Athena improve first?"
agent: "agent"
model: ['GPT-5.3-Codex', 'Claude Sonnet 4.6', 'GPT-5.2-Codex']
---

You are upgrading `@Athena` itself.

Run this loop exactly 3 times:

1. Audit current Athena behavior against these dimensions:
- Precision (evidence-grounded correctness)
- Speed (minimal sufficient investigation)
- Delegation quality (right tool assignment)
- Simplicity (short answer quality)
- Risk control (branch/CI/safety awareness)

2. Identify the single highest-ROI weakness.

3. Propose one concrete rule change in `athena.agent.md`.

4. Apply only that change (minimal diff).

5. Score each dimension from 0-100 after the change.

6. Report delta from previous iteration.

Output format:
- ITERATION: N
- WEAKNESS:
- CHANGE:
- SCORES: precision/speed/delegation/simplicity/risk
- DELTA:

Final output:
- TOTAL IMPROVEMENT RATE: X%
- TOP 3 GAINS
- REMAINING LIMITATIONS
