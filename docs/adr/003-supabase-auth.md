# ADR-003: Authentication with Supabase Auth

**Status:** Accepted  
**Date:** 2025-12-01  
**Context:** The application needs email/password authentication, Google OAuth, and session management with secure HTTP-only cookies. 

## Decision

Use **Supabase Auth** via `@supabase/ssr` for both server and client.

## Rationale

- Supabase is already used for the database — unifying auth reduces infrastructure.
- `@supabase/ssr` handles cookie-based sessions compatible with Next.js middleware.
- Built-in support for OAuth providers (Google), email/password, and magic links.
- Row Level Security (RLS) in Postgres ties directly to `auth.uid()`.

## Implementation

- **Browser client:** Singleton in `lib/supabase/client.ts` (prevents GoTrue listener leaks).
- **Server client:** Per-request in `lib/supabase/server.ts` (uses `cookies()` from `next/headers`).
- **Middleware:** Refreshes session on every request via `middleware.ts`.
- **Auth Context:** React context in `lib/auth/context.tsx` provides `user` to client components.

## Consequences

- Session state is stored in HTTP-only cookies, not localStorage.
- Protected routes redirect to `/login` in middleware before the page renders.
- The singleton browser client prevents duplicate `onAuthStateChange` listeners.
