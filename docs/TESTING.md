# Testing Guide

## Setup

Test framework: **Vitest** with **React Testing Library** and **jsdom** environment.

```bash
# Run all tests once
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# With coverage report
npm run test:coverage
```

## Test Structure

```
tests/
  setup.ts              → jest-dom matchers registration
  lib/
    security.test.ts    → sanitizeString, sanitizePayload, isValidEmail, clampNumber
    rate-limit.test.ts  → rateLimit, getClientIP
    data.test.ts        → getProductById, getProductsByIds, data integrity
```

## Configuration

- **Config**: `vitest.config.ts` (root)
- **Environment**: jsdom (for DOM APIs)
- **Path alias**: `@/` → project root
- **Setup**: `tests/setup.ts` (imports `@testing-library/jest-dom/vitest`)
- **Coverage**: v8 provider, includes `lib/**` and `components/**`

## Writing Tests

### Pure function test
```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '@/lib/my-module';

describe('myFunction', () => {
  it('does the expected thing', () => {
    expect(myFunction('input')).toBe('output');
  });
});
```

### With fake timers (rate limiter, expiry)
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('refills tokens after window', () => {
  // ... exhaust tokens
  vi.advanceTimersByTime(61_000);
  // ... tokens refilled
});
```

### React component test
```typescript
import { render, screen } from '@testing-library/react';
import { MyComponent } from '@/components/MyComponent';

it('renders heading', () => {
  render(<MyComponent />);
  expect(screen.getByRole('heading')).toHaveTextContent('Hello');
});
```

## Test Coverage Targets

| Module | Coverage Goal |
|--------|--------------|
| `lib/security.ts` | 100% |
| `lib/rate-limit.ts` | 100% |
| `lib/data.ts` | 100% |
| `lib/env.ts` | Best-effort (env-dependent) |
| Components | Smoke tests for critical UI |

## CI Integration

Tests run in the CI pipeline via `npm test`. The CI workflow in `.github/workflows/ci.yml` includes lint, typecheck, and build steps. Add a test job by extending the workflow.
