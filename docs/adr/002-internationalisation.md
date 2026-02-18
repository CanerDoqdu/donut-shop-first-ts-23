# ADR-002: Internationalisation with next-intl

**Status:** Accepted  
**Date:** 2025-12-01  
**Context:** The donut shop targets both Turkish and English-speaking customers. We need URL-based locale routing (`/tr/...`, `/en/...`) with type-safe translations.

## Decision

Use **next-intl** v4 with the App Router plugin.

## Rationale

- First-class App Router support (middleware-based locale detection).
- Type-safe message keys via JSON namespace files (`messages/tr.json`, `messages/en.json`).
- Static params generation with `generateStaticParams()` for SSG.
- No separate translation build step — JSON files are loaded at request time.

## Alternatives considered

| Library | Rejected because |
|---------|-----------------|
| react-i18next | Requires client-side init; no built-in routing |
| Paraglide.js | Compile-time approach adds build complexity |

## Consequences

- All translatable strings live in `i18n/messages/{locale}.json`.
- Middleware at `middleware.ts` handles locale detection & redirect.
- Every page/component uses `useTranslations()` or `getTranslations()`.
