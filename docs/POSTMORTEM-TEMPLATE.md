# Blameless Postmortem Template

## Instructions

Copy this template for each incident. Fill in all sections. Every action item **must** have an owner and a due date.

**Principles:**
- Focus on systems and processes, not individuals
- Ask "what" and "how", never "who"
- Every postmortem produces at least one preventive action item

---

## Incident Report: [TITLE]

**Date:** YYYY-MM-DD  
**Severity:** Sev1 / Sev2 / Sev3 (see [INCIDENT-SEVERITY.md](./INCIDENT-SEVERITY.md))  
**Duration:** HH:MM (from detection to resolution)  
**Author:** [Name]  
**Status:** Draft / Reviewed / Closed  

---

### 1. Summary

> One paragraph: What happened? What was the user impact?

### 2. Timeline (UTC)

| Time | Event |
|------|-------|
| HH:MM | First alert / detection |
| HH:MM | Investigation started |
| HH:MM | Root cause identified |
| HH:MM | Fix deployed |
| HH:MM | Incident resolved |

### 3. Impact

| Metric | Value |
|--------|-------|
| Users affected | N |
| Failed requests | N |
| Revenue impact | $ or N/A |
| SLO violation | Yes/No — which SLO? |
| Duration of impact | HH:MM |

### 4. Root Cause

> What was the underlying cause? Be specific about the system failure, not person.

**Contributing factors:**
1. 
2. 
3. 

### 5. Detection

> How was the incident detected? (Alert, user report, manual check)

- **Detection method:** 
- **Time to detect (TTD):** 
- **Could we have detected sooner?** Yes/No — How?

### 6. Resolution

> What was done to resolve the incident?

- **Immediate fix:** 
- **Rollback used?** Yes/No
- **Rollback steps:** (if applicable)

### 7. Lessons Learned

**What went well:**
1. 
2. 

**What went poorly:**
1. 
2. 

**Where we got lucky:**
1. 

### 8. Action Items

> Every action item MUST have an owner and a due date.

| # | Action | Priority | Owner | Due Date | Status |
|---|--------|----------|-------|----------|--------|
| 1 | | P1/P2/P3 | | YYYY-MM-DD | Open |
| 2 | | P1/P2/P3 | | YYYY-MM-DD | Open |
| 3 | | P1/P2/P3 | | YYYY-MM-DD | Open |

### 9. Error Budget Impact

> Reference: [Error Budget Process](../lib/error-budget.ts)

- **SLO(s) affected:** 
- **Error budget consumed:** 
- **Current budget remaining:** 
- **Action per error budget policy:** continue / fix first / all stops

### 10. Follow-Up

- [ ] Postmortem reviewed by team/self
- [ ] Action items tracked in issue tracker
- [ ] Monitoring/alerting gaps addressed
- [ ] Runbook updated (if applicable)
- [ ] This postmortem linked from incident log

---

## Postmortem Quality Checklist

Before closing this postmortem, verify:

- [ ] **Blameless:** No individual blame. Focus on systems.
- [ ] **Timeline complete:** Every significant event timestamped.
- [ ] **Root cause identified:** Not just symptoms.
- [ ] **Action items have owners:** No orphaned items.
- [ ] **Action items have due dates:** No open-ended commitments.
- [ ] **Measurable improvement:** At least one action prevents recurrence.
- [ ] **SLO impact documented:** Error budget status updated.
