# Row-Level Security (RLS) Policy Reference

Canonical reference for every RLS policy.

## Overview

All public tables use RLS. Access is controlled by Supabase Auth JWT claims.
`service_role` bypasses RLS and must remain server-only.

## Migration Coverage

| Migration | Tables |
|---|---|
| `001_core_schema` | products, profiles, orders, order_items |
| `002_extended_features` | stores, store_inventory, loyalty_points, points_transactions, gift_cards, subscriptions, reviews, referrals, notifications |
| `004_stripe_events` | stripe_events |
| `005_soft_delete_audit` | audit_log + orders policy update |

## Core Tables

### products
| Policy | Operation | Rule |
|---|---|---|
| Products are viewable by everyone | SELECT | `true` |
| Products are editable by admin only | ALL | `auth.jwt() ->> 'role' = 'admin'` |

### profiles
| Policy | Operation | Rule |
|---|---|---|
| Users can view own profile | SELECT | `auth.uid() = id` |
| Users can update own profile | UPDATE | `auth.uid() = id` |

### orders
| Policy | Operation | Rule |
|---|---|---|
| Users can view own orders | SELECT | `auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin'` |
| Anyone can create orders | INSERT | `true` |
| Admin can update orders | UPDATE | `auth.jwt() ->> 'role' = 'admin'` |
| Users can view own active orders | SELECT | `auth.uid() = user_id AND deleted_at IS NULL` |

### order_items
| Policy | Operation | Rule |
|---|---|---|
| Users can view own order items | SELECT | `EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR auth.jwt() ->> 'role' = 'admin'))` |
| Anyone can create order items | INSERT | `true` |

## Extended Tables

### stores
| Policy | Operation | Rule |
|---|---|---|
| Stores are viewable by everyone | SELECT | `true` |

### store_inventory
| Policy | Operation | Rule |
|---|---|---|
| Store inventory viewable by everyone | SELECT | `true` |

### loyalty_points
| Policy | Operation | Rule |
|---|---|---|
| Users can view own points | SELECT | `auth.uid() = user_id` |

### points_transactions
| Policy | Operation | Rule |
|---|---|---|
| Users can view own transactions | SELECT | `auth.uid() = user_id` |

### gift_cards
| Policy | Operation | Rule |
|---|---|---|
| Users can view own gift cards | SELECT | `auth.uid() = purchaser_id OR recipient_email = (SELECT email FROM profiles WHERE id = auth.uid())` |

### subscriptions
| Policy | Operation | Rule |
|---|---|---|
| Users can view own subscriptions | SELECT | `auth.uid() = user_id` |
| Users can update own subscriptions | UPDATE | `auth.uid() = user_id` |

### reviews
| Policy | Operation | Rule |
|---|---|---|
| Reviews are viewable by everyone | SELECT | `is_approved = true OR auth.uid() = user_id` |
| Users can create own reviews | INSERT | `auth.uid() = user_id` |
| Users can update own reviews | UPDATE | `auth.uid() = user_id` |

### referrals
| Policy | Operation | Rule |
|---|---|---|
| Users can view own referrals | SELECT | `auth.uid() = referrer_id OR auth.uid() = referred_id` |

### notifications
| Policy | Operation | Rule |
|---|---|---|
| Users can view own notifications | SELECT | `auth.uid() = user_id` |

## Service-Role-Only Tables

### stripe_events
RLS enabled. No anon/authenticated policies. Access via server `service_role` only.

### audit_log
| Policy | Operation | Rule |
|---|---|---|
| Admins can read audit log | SELECT | `EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())` |

No UPDATE/DELETE policies. Writes are server-side via `service_role`.

## Service Role Usage

The `service_role` key bypasses RLS entirely. Used in:
- Checkout route (order/profile creation)
- Webhook handler (order status updates)
- Audit log writes (server-side only)

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.

## Idempotent Policy Pattern

```sql
DROP POLICY IF EXISTS "Policy name" ON table_name;
CREATE POLICY "Policy name" ON table_name FOR SELECT USING (...);
```
