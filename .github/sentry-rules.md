# Sentry AI Rules for Donut Shop

These rules guide AI assistants (GitHub Copilot, Cursor, etc.) when working with Sentry in this project.

## Exception Catching

Use `Sentry.captureException(error)` to capture exceptions in try/catch blocks.

```typescript
import * as Sentry from "@sentry/nextjs";

try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error);
  throw error; // re-throw if needed
}
```

## Tracing / Spans

Create spans for meaningful actions: button clicks, API calls, DB queries.

### Component Actions
```typescript
import * as Sentry from "@sentry/nextjs";

function CheckoutButton() {
  const handleClick = () => {
    Sentry.startSpan(
      { op: "ui.click", name: "Checkout Button Click" },
      (span) => {
        span.setAttribute("cart.itemCount", cartItems.length);
        processCheckout();
      },
    );
  };
  return <button onClick={handleClick}>Checkout</button>;
}
```

### API Calls
```typescript
async function fetchProducts(categoryId: string) {
  return Sentry.startSpan(
    { op: "http.client", name: `GET /api/products?category=${categoryId}` },
    async () => {
      const response = await fetch(`/api/products?category=${categoryId}`);
      return response.json();
    },
  );
}
```

## Logging

Import: `import * as Sentry from "@sentry/nextjs"`
Logger: `const { logger } = Sentry`

```typescript
const { logger } = Sentry;

logger.trace("Starting database connection", { database: "users" });
logger.debug(logger.fmt`Cache miss for user: ${userId}`);
logger.info("Updated profile", { profileId: 345 });
logger.warn("Rate limit reached", { endpoint: "/api/checkout", isEnterprise: false });
logger.error("Failed to process payment", { orderId: "order_123", amount: 99.99 });
logger.fatal("Database connection pool exhausted", { database: "users", activeConnections: 100 });
```

## Configuration Files (DO NOT duplicate init)

Sentry initialization happens ONLY in these files:
- `sentry.client.config.ts` — client-side
- `sentry.server.config.ts` — server-side
- `sentry.edge.config.ts` — edge runtime

Other files just `import * as Sentry from "@sentry/nextjs"` and use it directly.

## DSN

```
https://417044e9c4ea872b9e0f4f2fa3325066@o4510924639174656.ingest.de.sentry.io/4510924722012240
```

DSN is set via `NEXT_PUBLIC_SENTRY_DSN` env var. Never hardcode in source files.

## Project Conventions

- Error classification: Operational (user recovers) / Programmer (bug) / Infrastructure (ops)
- All API handlers use `Sentry.captureException` in catch blocks
- Checkout flow has dedicated spans for each state transition
- Structured logger (`lib/logger.ts`) is primary; Sentry logger is supplementary
