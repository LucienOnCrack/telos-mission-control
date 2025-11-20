# Remove Auth Database Changes

The auth migration was applied but we've removed all auth code. Follow these steps to clean up the database:

## Option 1: Via Supabase Dashboard (Easiest)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Copy and paste the contents of `supabase/migrations/20250120000006_remove_auth_setup.sql`
5. Click **Run**

## Option 2: Via Supabase CLI

```bash
# Link your project (if not already linked)
supabase link --project-ref your-project-ref

# Push the migration
supabase db push
```

## What Gets Removed

This migration removes:
- `user_profiles` table (if it exists)
- Any auth-related functions (like `check_user_role`, `is_paying_user`)
- Any auth-related policies

## Verification

After running the migration, verify in your Supabase dashboard that:
1. The `user_profiles` table is gone
2. Your main tables (contacts, campaigns, etc.) still exist
3. Your application still works without auth

## Note

All API endpoints have been updated to work without authentication. The database RLS policies remain in place but allow all operations.

