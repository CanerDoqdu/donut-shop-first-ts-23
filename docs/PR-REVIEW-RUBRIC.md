# PR Review Rubric (Self-Review Checklist)

**Purpose:** Solo developer self-review checklist per update.md section 2-D.  
**When:** Before every PR merge.  
**Where:** Copy this checklist into PR body or commit message.

---

## Quick Checklist

Copy-paste into every PR:

```markdown
## Self-Review Checklist

### 1. Security
- [ ] Does this PR accept new user input? → If yes, validation exists
- [ ] No secrets/credentials in code
- [ ] No new SQL injection vectors (parameterized queries)
- [ ] Auth checks present for protected endpoints

### 2. Performance
- [ ] New DB query added? → Index/EXPLAIN reviewed
- [ ] No N+1 query patterns introduced
- [ ] Cache strategy considered for hot paths
- [ ] Bundle size impact checked (< 5 MB client JS)

### 3. Test Coverage
- [ ] New code coverage ≥ 80%
- [ ] Unit tests for business logic
- [ ] Integration test for API changes (if applicable)
- [ ] Edge cases covered (empty, null, error states)

### 4. Backward Compatibility
- [ ] API response shape unchanged? → If changed, contract test updated
- [ ] No breaking changes to public API
- [ ] Database migration is reversible

### 5. Rollback
- [ ] This PR can be reverted safely
- [ ] Rollback plan: [describe in 1 sentence]
```

---

## Thresholds (Must Pass)

| Check | Requirement |
|-------|-------------|
| Test coverage (new code) | ≥ 80% |
| TypeScript | 0 errors |
| ESLint | 0 errors (warnings OK) |
| Build | Successful |
| Bundle size | < 5 MB client JS |

---

## Detailed Rubric

### Security Review

| Question | Yes → Action | No → OK |
|----------|-------------|---------|
| Accepts new input? | Validate with Zod/schema | — |
| New API endpoint? | Auth guard present | — |
| Handles PII? | GDPR compliance checked | — |
| New dependency? | License + vulnerability scan | — |
| Modifies auth flow? | Threat model review | — |

### Performance Review

| Question | Yes → Action | No → OK |
|----------|-------------|---------|
| New DB query? | Check EXPLAIN, add index if needed | — |
| New API endpoint? | Rate limiting configured | — |
| Large data fetch? | Pagination implemented | — |
| Client-side computation? | Bundle impact measured | — |
| Cache bypass? | Justify why cache is skipped | — |

### Test Review

| Question | Yes → Action | No → OK |
|----------|-------------|---------|
| New function/module? | Unit test exists | — |
| New API route? | Integration test exists | — |
| Error handling? | Error path tested | — |
| State change? | Before/after state verified | — |
| External dependency? | Mock/stub in place | — |

### Maintainability Review

| Question | Yes → Action | No → OK |
|----------|-------------|---------|
| Complex logic? | Comments explain "why" | — |
| Magic numbers? | Named constants used | — |
| Duplicated code? | Extracted to shared function | — |
| Config change? | Documented in appropriate doc | — |
| New pattern? | Consistent with existing codebase | — |

---

## PR Body Template

```markdown
## Problem
[What issue does this PR solve?]

## Scope
[What files/modules are changed?]

## Risks
[What could go wrong?]

## Security Impact
[None / Describe]

## Migration/Data Impact
[None / Describe]

## Test Plan
[What tests were added/updated?]

## Rollback Plan
[How to revert if something goes wrong]

## Monitoring
[Which metrics/alerts are affected?]

## Self-Review Checklist
[Paste quick checklist above]
```

---

## Anti-Patterns to Watch

- ❌ PR with no tests
- ❌ PR touching > 500 lines (split it)
- ❌ PR with "misc" or "various fixes" title
- ❌ PR without rollback plan for prod-affecting changes
- ❌ PR that changes API shape without contract test update
- ❌ PR with TODO comments and no linked issue

---

## References

- [Error Budget Process](../lib/error-budget.ts)
- [Incident Severity Model](./INCIDENT-SEVERITY.md)
- [Threat Model](./THREAT-MODEL.md)
- [Deploy Checklist](./DEPLOY-CHECKLIST.md)
- [SLO Definitions](./SLO.md)
