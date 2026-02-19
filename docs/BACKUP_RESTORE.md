# Backup & Restore Procedure

> Disaster recovery plan for Glazed & Sipped Supabase database.

---

## 1. Automated Backups (Supabase)

Supabase Pro plan provides:
- **Daily automated backups** with 7-day retention.
- **Point-in-time recovery (PITR)** — restore to any second within the retention window.

Access via: Supabase Dashboard → Settings → Database → Backups.

---

## 2. Manual Backup

### Prerequisites
```bash
# Install PostgreSQL client tools
# Ensure DATABASE_URL is set (from Supabase Dashboard → Settings → Database)
```

### Full Dump
```bash
pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-acl \
  --format=custom \
  --file=backup_$(date +%Y%m%d_%H%M%S).dump
```

### Schema-Only Dump
```bash
pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-acl \
  --schema-only \
  --file=schema_$(date +%Y%m%d).sql
```

### Tables-Only Dump (Data)
```bash
pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-acl \
  --data-only \
  --file=data_$(date +%Y%m%d).dump
```

---

## 3. Restore

### To a Fresh Database
```bash
pg_restore \
  --dbname="$TARGET_DATABASE_URL" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  backup_YYYYMMDD_HHMMSS.dump
```

### To Existing Database (Additive)
```bash
pg_restore \
  --dbname="$DATABASE_URL" \
  --no-owner \
  --no-acl \
  --data-only \
  data_YYYYMMDD.dump
```

---

## 4. Post-Restore Validation

Run these checks after every restore:

### Row Count Verification
```sql
SELECT 'profiles'   AS t, COUNT(*) FROM profiles
UNION ALL
SELECT 'orders'     AS t, COUNT(*) FROM orders
UNION ALL
SELECT 'order_items' AS t, COUNT(*) FROM order_items
UNION ALL
SELECT 'products'   AS t, COUNT(*) FROM products
UNION ALL
SELECT 'audit_log'  AS t, COUNT(*) FROM audit_log
UNION ALL
SELECT 'stores'     AS t, COUNT(*) FROM stores;
```

### Integrity Checks
```sql
-- Orphaned order items (should return 0)
SELECT COUNT(*) FROM order_items oi
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.id IS NULL;

-- Profiles without auth user (should return 0)
SELECT COUNT(*) FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;

-- Orders with invalid user_id (should return 0)
SELECT COUNT(*) FROM orders o
WHERE o.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = o.user_id);
```

### Application Health Check
```bash
# Verify the app can connect and serve data
curl -f https://your-domain.com/api/products
curl -f https://your-domain.com/api/stores
```

---

## 5. Backup Schedule (Recommended)

| Type | Frequency | Retention | Storage |
|------|-----------|-----------|---------|
| Supabase auto backup | Daily | 7 days | Supabase (managed) |
| Manual full dump | Weekly | 30 days | Cloud storage (S3/GCS) |
| Schema dump | Before each migration | Indefinite | Git repository |
| Pre-migration snapshot | Before running migrations | 7 days | Cloud storage |

---

## 6. Migration Rollback

If a migration fails:

1. **Restore from pre-migration snapshot:**
   ```bash
   pg_restore --dbname="$DATABASE_URL" --clean --if-exists pre_migration.dump
   ```

2. **Or use Supabase PITR:**
   - Go to Dashboard → Settings → Database → Backups
   - Select a timestamp before the migration ran
   - Click "Restore"

3. **Fix the migration SQL** and re-run.

All migrations use `BEGIN; ... COMMIT;` transactions, so a failed migration auto-rolls back.

---

## 7. Disaster Recovery Runbook

| Step | Action | Owner | SLA |
|------|--------|-------|-----|
| 1 | Detect outage (monitoring/alerts) | On-call | < 5 min |
| 2 | Assess: is it app-level or data-level? | On-call | < 15 min |
| 3a | App-level → redeploy from last good commit | DevOps | < 30 min |
| 3b | Data-level → restore from latest backup | DevOps | < 1 hour |
| 4 | Run post-restore validation (Section 4) | DevOps | < 15 min |
| 5 | Verify application health | DevOps | < 5 min |
| 6 | Notify stakeholders | On-call | < 2 hours |
| 7 | Post-mortem | Team | < 1 week |
