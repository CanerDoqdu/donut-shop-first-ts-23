# ADR-001: State Management with Zustand

**Status:** Accepted  
**Date:** 2025-12-01  
**Context:** The project needs client-side state management for the shopping cart with localStorage persistence and cross-tab sync.  

## Decision

Use **Zustand** with the `persist` middleware instead of React Context or Redux.

## Rationale

| Criterion | Zustand | React Context | Redux |
|-----------|---------|---------------|-------|
| Bundle size | ~1 KB | 0 (built-in) | ~7 KB |
| Boilerplate | Minimal | Medium | Heavy |
| Persistence | Built-in middleware | Manual | Manual |
| Re-render isolation | Selector-based | Full subtree | Selector-based |
| DevTools | Zustand devtools middleware | React DevTools | Redux DevTools |

React Context causes unnecessary re-renders of the entire subtree when any slice of state changes. Redux adds too much ceremony for a store that only manages cart state. Zustand's selector pattern gives us surgical re-renders with near-zero boilerplate.

## Consequences

- Cart state lives in `store/cart-store.ts` as a single Zustand store.
- Components subscribe to individual selectors to avoid re-renders.
- `persist` middleware handles localStorage serialization + rehydration.
- `skipHydration` is **not** used — the store auto-hydrates to avoid race conditions.
