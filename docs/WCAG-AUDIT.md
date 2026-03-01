# WCAG AA Audit Report

> Last updated: 2026-03-01  
> Scope: Donut Shop — keyboard, focus, ARIA, contrast, semantic HTML  
> Standard: WCAG 2.1 Level AA

## Audit Summary

| Criterion | Status | Notes |
|-----------|--------|-------|
| **1.3.1** Info & Relationships | ✅ Pass | Semantic HTML: `<main>`, `<nav>`, `<footer>`, `lang` attr |
| **1.4.3** Contrast (Minimum) | ⚠️ Partial | Core components pass heuristic check; full runtime audit recommended with axe-core |
| **2.1.1** Keyboard Accessible | ✅ Pass | All interactive elements are natively keyboard-accessible (buttons, links, inputs) |
| **2.4.1** Bypass Blocks | ✅ Pass | Skip-to-content link with `sr-only focus:not-sr-only` pattern |
| **2.4.3** Focus Order | ✅ Pass | Natural DOM order, no `tabindex` manipulation |
| **2.4.7** Focus Visible | ✅ Pass | `focus-visible:ring-2 ring-offset-2` on buttons, checkbox, variant selector |
| **3.3.1** Error Identification | ✅ Pass | `role="alert"` on checkout errors, `aria-live` on toasts |
| **3.3.2** Labels | ✅ Pass | Form inputs have labels or `aria-label`; cart buttons have descriptive labels |
| **4.1.2** Name, Role, Value | ✅ Pass | `aria-expanded`, `aria-haspopup`, `aria-pressed`, `aria-hidden` used correctly |

## Existing ARIA Coverage (from tests/a11y/aria-attributes.test.ts)

| Component | ARIA Attributes |
|-----------|----------------|
| Header | `aria-label="Main navigation"`, `aria-expanded`, `aria-haspopup`, `role="menu"` |
| Footer | `aria-label="Footer navigation"`, `<nav>` |
| Product detail | `aria-label="Breadcrumb"`, `aria-live="polite"` |
| Admin | `role="navigation"`, `aria-current`, `aria-expanded`, `aria-label` |
| Cart item row | Per-item `aria-label` for increase/decrease/remove/quantity |
| Checkout | `ref={retryButtonRef}`, auto-focus on retry, `role="alert"` |
| SprinkleRain | `aria-hidden="true"` (decorative) |
| Layout | Skip-to-content, `id="main-content"`, `lang={locale}` |

## New WCAG AA Tests (tests/a11y/wcag-aa-audit.test.ts)

| Test Group | Count | What's Tested |
|-----------|-------|---------------|
| Focus Visible (2.4.7) | 6 | `focus-visible:ring` on button, checkbox, variant selector, input |
| Bypass Blocks (2.4.1) | 5 | Skip link presence, target, sr-only + focus reveal |
| Semantic HTML (1.3.1) | 4 | `<main>`, `<nav>` in header/footer, `lang` attribute |
| Labels (3.3.2) | 5 | Login form labels, cart control labels |
| Error Identification (3.3.1) | 3 | `role="alert"`, field-error component, `aria-live` |
| Name/Role/Value (4.1.2) | 4 | `aria-expanded`, `aria-haspopup`, `aria-pressed`, `aria-hidden` |
| Contrast (1.4.3) | 2 | No low-contrast patterns in core components |
| Compliance Summary | 2 | No focus suppression, loading state accessibility |

## Known Gaps & Recommendations

### Priority 1 (should fix)
- **`GiftCardPurchase.tsx`** uses `focus:ring-0` on inputs — suppresses focus indicator. Fix: change to `focus-visible:ring-2`.
- **Runtime contrast audit** recommended with axe-core for full color contrast verification.

### Priority 2 (nice to have)
- Standardize all inputs to use `focus-visible:` instead of `focus:` for focus rings.
- Add keyboard navigation (Arrow keys, Escape) to header dropdown menus.
- Add `aria-required` and `aria-invalid` to form inputs.
- Add `aria-describedby` linking form errors to their inputs.

### Priority 3 (future)
- Integrate `@axe-core/playwright` in E2E tests for runtime a11y scanning.
- Add reduced-motion media query support (`prefers-reduced-motion`).
- Screen reader testing with NVDA/VoiceOver.

## Test Commands

```bash
# Run WCAG AA audit tests
npx vitest run tests/a11y/wcag-aa-audit.test.ts

# Run all a11y tests (ARIA + WCAG)
npx vitest run tests/a11y/

# Full Lighthouse accessibility audit (CI)
lhci autorun --config=lighthouserc.json
```

## References

- [WCAG 2.1 AA Guidelines](https://www.w3.org/TR/WCAG21/)
- [Lighthouse Accessibility](https://developer.chrome.com/docs/lighthouse/accessibility/)
- Lighthouse config: `lighthouserc.json` — accessibility score gate ≥ 0.90
