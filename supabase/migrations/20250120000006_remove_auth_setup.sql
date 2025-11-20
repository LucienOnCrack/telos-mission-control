-- Remove auth setup that was previously applied
-- This rollback migration removes user_profiles table and any auth-related columns

-- Drop user_profiles table if it exists
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Drop any auth-related functions
DROP FUNCTION IF EXISTS check_user_role(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS is_paying_user(uuid) CASCADE;

-- Drop any auth-related policies
-- (The tables already have RLS policies, so we'll keep those as they allow all operations)

-- Note: We're keeping the existing RLS policies on main tables as they currently 
-- allow all operations which is what we want for a non-auth system

