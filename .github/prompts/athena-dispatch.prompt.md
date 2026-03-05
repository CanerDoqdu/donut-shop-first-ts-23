---
description: "One-command dispatch for Athena team lead mode. Use when: you want Athena to triage a problem and delegate to the correct worker agent (security, performance, test/CI, feature) with a strict contract."
name: "Athena Dispatch"
argument-hint: "Describe the problem or feature request"
agent: "Athena"
model: ['GPT-5.3-Codex', 'Claude Opus 4.6', 'Claude Sonnet 4.6']
---

Run team-lead dispatch mode.

Flow:
1. Diagnose the request and classify type: security | performance | test-ci | feature | mixed.
2. Select worker:
- security -> Security Sentinel
- performance -> Perf Engineer
- test-ci -> Test CI Medic
- feature -> Feature Architect
- mixed -> split into sub-tasks and assign each to one worker
3. Produce strict delegation contract for each assignment:
- Objective
- Scope (in/out)
- Constraints
- Verification
4. Execute or delegate and track completion.
5. Return compact status:
- `DURUM:`
- `ATAMA:`
- `YAPILAN:`
- `KALAN:`
