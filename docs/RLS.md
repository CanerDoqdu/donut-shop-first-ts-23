# Row-Level Security (RLS) Policy Reference

> Canonical reference for every RLS policy in the Glazed & Sipped database.

## Migration Coverage

| Migration | Tables | Status |
|-----------|--------|--------|
| 001_core_schema | products, profiles, orders, order_items | ✅ |
| 002_extended_features | stores, store_inventory, loyalty_points, points_transactions, gift_cards, subscriptions, reviews, referrals, notifications | ✅ |
| 004_stripe_events | stripe_events | ✅ |
| 005_soft_delete_audit | audit_log (+ orders policy update) | ✅ |

---

## Core Tables (001)

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
| Users can view own orders | SELECT | `auth.uid() = user_id OR jwt role = admin` |
| Anyone can create orders | INSERT | `true` |
| Admin can update orders | UPDATE | `auth.jwt() ->> 'role' = 'admin'` |
| Users can view their own active orders* | SELECT | `auth.uid() = user_id AND deleted_at IS NULL` |

> *Added by 005 migration; replaces the base SELECT policy for soft-delete support.

### order_items
| Policy | Operation | Rule |
|--------|-----------|------|
| Users can view own order items | SELECT | Subquery: order belongs to user or admin |
| Anyone can create order items | INSERT | `true` |

---

## Extended Tables (002)

### stores
| Policy | Operation | Rule |
|--------|-----------|------|
| Stores are viewable by everyone | SELECT | `true` |

### store_inventory
| Policy | Operation | Rule |
|--------|-----------|------|
| Store inventory viewable by everyone | SELECT | `true` |

### loyalty_points
| Policy | Operation | Rule |
|--------|-----------|------|
| Users can view own points | SELECT | `auth.uid() = user_id` |

### points_transactions
| Policy | Operation | Rule |
|--------|-----------|------|
| Users can view own transactions | SELECT | `auth.uid() = user_id` |

### gift_cards
| Policy | Operation | Rule |
|--------|-----------|------|
| Users can view own gift cards | SELECT | `purchaser_id = uid OR recipient_email matches` |

### subscriptions
| Policy | Operation | Rule |
|--------|-----------|------|
| Users can view own subscriptions | SELECT | `auth.uid() = user_id` |
| Users can update own subscriptions | UPDATE | `auth.uid() = user_id` |

### reviews
| Policy | Operation | Rule |
|--------|-----------|------|
| Reviews are viewable by everyone | SELECT | `is_approved = true OR auth.uid() = user_id` |
| Users can create own reviews | INSERT | `auth.uid() = user_id` |
| Users can update own reviews | UPDATE | `auth.uid() = user_id` |

### referrals
| Policy | Operation | Rule |
|--------|-----------|------|
| Users can view own referrals | SELECT | `referrer_id = uid OR referred_id = uid` |

### notifications
| Policy | Operation | Rule |
|--------|-----------|------|
| Users can view own notifications | SELECT | `auth.uid() = user_id` |

---

## Service-Role Only Tables

### stripe_events (004)
No anon/authenticated policies. RLS enabled, accessed only via `service_role` key from webhook handler.

### audit_log (005)
| Policy | Operation | Rule |
|--------|-----------|------|
| Admins can read audit log | SELECT | `EXISTS (SELECT 1 FROM admin_users WHERE user_id = uid)` |

No INSERT/UPDATE/DELETE policies — writes via `service_role` only.

---

## Admin Access Pattern

Admin operations use the Supabase **service_role** key which bypasses RLS entirely. This is used for:
- Webhook processing (stripe_events, order updates)
- Audit log writes
- Admin dashboard data fetching
- Inventory management

## Idempotent Pattern

All policies use `DROP POLICY IF EXISTS` before `CREATE POLICY` to ensure migrations can be re-run safely:

```sql
DROP POLICY IF EXISTS "Policy name" ON table_name;
CREATE POLICY "Policy name" ON table_name FOR SELECT USING (...);
```

## Testing RLS

```sql
-- Test as anonymous user
SET request.jwt.claim.sub = '';
SELECT * FROM products;  -- should return all
SELECT * FROM orders;    -- should return none

-- Test as authenticated user
SET request.jwt.claim.sub = '<user-uuid>';
SELECT * FROM profiles;  -- should return own profile only
```
