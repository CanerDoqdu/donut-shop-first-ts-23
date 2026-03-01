# API Versioning Policy

> **Current version:** `2025-07-01`
> **Header:** `x-api-version`

## Overview

Every API response includes an `x-api-version` response header containing a
date-based version string (`YYYY-MM-DD`). This communicates the active response
contract to consumers without requiring URL changes.

Routes wrapped by `withHandler` receive the header automatically. Routes that
bypass `withHandler` (webhooks, cron, standalone endpoints) use the exported
`withVersionHeader()` utility from `lib/api-handler.ts`.

## Version Format

| Part  | Example      | Meaning                         |
|-------|--------------|---------------------------------|
| Date  | `2025-07-01` | Date the contract was published |

We use a date-based scheme instead of semver because:

1. The project has a single API surface — no independent sub-APIs.
2. Dates clearly communicate *when* a contract was established.
3. There is no need for independent major/minor/patch tracks.

## Constant Location

```ts
// lib/constants.ts
export const API_VERSION = '2025-07-01';
```

All references import from this single constant. Changing the value in one place
updates every response.

## Breaking Change Rules

A **breaking change** is any modification that can cause an existing consumer to
fail or misinterpret a response:

- Removing or renaming a response field
- Changing a field's type (e.g. `string` → `number`)
- Changing an HTTP status code's semantic meaning
- Removing an endpoint
- Changing authentication requirements

### What is NOT a breaking change

- Adding a new optional response field
- Adding a new endpoint
- Adding a new optional query parameter
- Improving an error message string (when consumers key on `code`, not `message`)
- Performance or internal refactors with identical external behaviour

## Deprecation Process

When a breaking change is necessary:

1. **Announce** — Add a `Deprecation` response header to the affected endpoint
   at least 2 weeks before removal:
   ```
   Deprecation: true
   Sunset: Sat, 01 Nov 2025 00:00:00 GMT
   ```
2. **Bump** — Update `API_VERSION` in `lib/constants.ts` to the new date.
3. **Document** — Record the change in this file under the Changelog section.
4. **Test** — Add or update contract tests in `tests/lib/api-versioning.test.ts`
   to verify the new schema.
5. **Communicate** — Notify consumers (internal dashboard, Slack, changelog).

## Consumer Guidance

API consumers should:

- Log the `x-api-version` header value on every response.
- Alert when the version changes unexpectedly.
- Pin integration tests to a known version and update deliberately.

## Changelog

### 2025-07-01 — Initial version

- `x-api-version` response header added to all API routes.
- Established breaking-change rules and deprecation process.
- Contract test suite created (`tests/lib/api-versioning.test.ts`).
