# Row Level Security (RLS)

## Overview

All tables have RLS enabled. Access is controlled by Supabase Auth JWT claims.

## Policies

### products
| Policy | Operation | Rule |
|--------|-----------|------|
| Products are viewable by everyone | SELECT | `true` |
| Products are editable by admin only | ALL | `auth.jwt() ->> 'role' = 'admin'` |

### profiles
| Policy | Operation | Rule |
|--------|-----------|------|
| Users can view own profile | SELECT | `auth.uid() = id` |
| Users can update own profile | UPDATE | `auth.uid() = id` |

### orders
| Policy | Operation | Rule |
|--------|-----------|------|
| Users can view own orders | SELECT | `auth.uid() = user_id OR admin` |
| Anyone can create orders | INSERT | `true` |
| Admin can update orders | UPDATE | `admin` |

With soft-delete migration (`005-soft-delete-and-audit.sql`):
- Active orders filter: `deleted_at IS NULL`

### order_items
| Policy | Operation | Rule |
|--------|-----------|------|
| Users can view own order items | SELECT | `EXISTS (order belongs to user or admin)` |
| Anyone can create order items | INSERT | `true` |

### stripe_events
| Policy | Operation | Rule |
|--------|-----------|------|
| Service role only | ALL | No anon/authenticated access |

### audit_log
| Policy | Operation | Rule |
|--------|-----------|------|
| Admins can read | SELECT | `admin_users` table check |
| Writes via service_role | INSERT | service_role bypasses RLS |

## Service Role Usage

The `service_role` key bypasses RLS entirely. Used in:
- **Checkout route**: Order/profile creation (admin client)
- **Webhook handler**: Order status updates
- **Audit log writes**: Server-side only

> **Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.**

## Migration Scripts

| File | Purpose |
|------|---------|
| `supabase/schema.sql` | Core tables (products, profiles, orders, order_items) |
| `supabase/schema-extended.sql` | Loyalty, referrals, subscriptions, gift cards |
| `scripts/005-soft-delete-and-audit.sql` | Soft-delete column + audit_log table |
