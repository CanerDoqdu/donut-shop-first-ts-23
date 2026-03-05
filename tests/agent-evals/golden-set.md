# Golden Evaluation Set

Use these fixed tasks for Athena/Jarvis/Thoth optimization. Do not change wording during a cycle.

## A) Analysis Tasks (Athena)

1. Explain checkout flow end-to-end with evidence.
2. Identify top 3 risks in webhook processing.
3. Find likely branch drift hazards after manual merge.
4. Review cache strategy and potential stale-data risks.
5. Evaluate queue reliability weak points.
6. Assess RLS and auth boundary coverage.
7. Identify likely perf bottlenecks in API layer.
8. Detect documentation gaps for incident response.
9. Compare two approaches for reducing flaky tests.
10. Audit dependency risk posture from package manifests.

## B) Implementation-Routing Tasks (Athena -> Jarvis)

11. Fix a failing test with minimal diff and verify.
12. Add a missing error-code mapping safely.
13. Refactor duplicated logic in one module only.
14. Stabilize CI failure caused by lockfile mismatch.
15. Add guard clause to prevent null crash in API route.
16. Improve logging context for one critical path.
17. Add a targeted unit test for a regression.
18. Patch a type error without behavior change.
19. Reduce overfetch in one query path.
20. Apply branch-safe workflow before edits.

## C) Asset-Design Tasks (Athena -> Thoth)

21. Create a prompt for PR risk review.
22. Create a prompt for flaky test triage.
23. Create an agent for dependency-upgrade impact analysis.
24. Create a prompt for incident postmortem draft.
25. Create an agent for security checklist auditing.
26. Create a prompt for API contract diff checks.
27. Create an agent for migration safety planning.
28. Create a prompt for i18n consistency review.
29. Create an agent for docs staleness detection.
30. Create a prompt for release readiness scoring.

## Scoring Sheet

For each task, score 0-100:
- Precision
- Speed
- Delegation Accuracy
- Simplicity
- Risk Control

Then compute average per category and global average.
