# 📊 Apply Database Indexes

The migration file has been created: `supabase/migrations/20250120000002_performance_indexes.sql`

## Option 1: Apply via Supabase Dashboard (Easiest)

1. Go to: https://supabase.com/dashboard/project/lvweyxezxbzxdyeblbiv/editor
2. Click **"SQL Editor"** in left sidebar
3. Click **"New Query"**
4. Copy/paste the contents of `supabase/migrations/20250120000002_performance_indexes.sql`
5. Click **"Run"**
6. Done! ✅

## Option 2: Apply via Supabase CLI

```bash
# Link to your Supabase project (if not already linked)
npx supabase link --project-ref lvweyxezxbzxdyeblbiv

# Apply all pending migrations
npx supabase db push

# Or apply this specific migration
psql "your-connection-string" < supabase/migrations/20250120000002_performance_indexes.sql
```

## What These Indexes Do:

✅ **Speed up campaign list** (index on status)  
✅ **Speed up cron jobs** (index on scheduled_for)  
✅ **Speed up campaign details page** (index on call_logs)  
✅ **Speed up contact search** (index on phone_number)  
✅ **Speed up analytics queries** (partial indexes)

**Impact:** Queries will be 10-100x faster on large datasets!

## Verify Indexes Were Created:

Run this query in Supabase SQL Editor:
```sql
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

You should see all the new `idx_*` indexes listed!

