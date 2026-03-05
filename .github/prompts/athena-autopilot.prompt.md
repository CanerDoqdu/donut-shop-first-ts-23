---
description: "Run Athena in end-to-end autopilot mode. Use when: you want one-command project triage where Athena diagnoses, fixes/delegates critical issues, rechecks, and returns final status."
name: "Athena Autopilot"
argument-hint: "What scope should Athena handle end-to-end?"
agent: "Athena"
model: ['GPT-5.3-Codex', 'Claude Opus 4.6', 'Claude Sonnet 4.6']
---

Run in full autopilot for the requested scope.

Requirements:
1. Diagnose current state and classify findings into Critical / Important / Improvements.
2. Automatically remediate Critical items end-to-end.
3. For each Critical item, choose safest path:
- Direct execution by Athena when bounded and low-risk.
- Delegation contract to implementation workflow when coding-heavy.
4. Recheck after each fix and refresh priorities.
5. Stop only when no Critical items remain.
6. Return only compact final report:
- `DURUM:`
- `YAPILAN:`
- `KALAN:`

Keep output concise and actionable.
