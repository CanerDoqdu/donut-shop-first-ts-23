# ADR-004: Performance Strategy

**Status:** Accepted  
**Date:** 2025-12-01  
**Context:** The project must deliver fast load times to rank well in search engines and provide a premium user experience for a commercial e-commerce storefront.

## Decision

Implement a multi-layered performance strategy covering images, fonts, caching, debounce, and real-user monitoring.

## Implementation

### Image Optimisation
- Next.js `<Image>` with AVIF + WebP via `formats: ['image/avif', 'image/webp']`.
- 1-year `Cache-Control` on static assets (`immutable`).
- Shimmer placeholder + fade-in transition eliminate layout shift.

### Font Loading
- `display: 'swap'` on both Inter and Fredoka fonts.
- Subset to `latin` to reduce payload.
- Fonts loaded via `next/font/google` for automatic self-hosting.

### Debounce
- All search inputs debounced at 300ms via `useDebounce` hook.
- Prevents unnecessary re-renders and (future) API calls on every keystroke.

### Caching Headers
- Images/fonts/JS/CSS: `max-age=31536000, immutable`.
- Security headers (HSTS, X-Frame-Options, etc.) on all routes.

### Web Vitals
- `useReportWebVitals` tracks LCP, CLS, INP, FCP, TTFB.
- Development: logs to console with colour-coded ratings.
- Production: beacons to `/api/vitals` endpoint.

## Consequences

- LCP improved by preloading hero images and using optimised formats.
- CLS minimised by explicit `width`/`height` on images and shimmer placeholders.
- TTFB depends on hosting (Vercel Edge) — no server-side bottleneck in the codebase.
- INP kept low because search filtering is debounced and state updates are granular.
