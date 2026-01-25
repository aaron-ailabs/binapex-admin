# Admin Users Table Migration

## Overview

This migration creates a dedicated `admin_users` table to manage admin access control, removing the dependency on `profiles.role` for admin authorization.

## Why This Migration?

### Problems with `profiles.role`:
1. **Single point of failure** - All admin access controlled via one column
2. **Not auditable** - No history of who granted admin access
3. **Mixed concerns** - User profile and admin access in same table
4. **RLS complexity** - Harder to enforce proper admin-only policies

### Benefits of `admin_users` table:
1. **Dedicated access control** - Separate table for admin authorization
2. **Audit trail** - `created_by` tracks who granted admin access
3. **Clear boundaries** - Admin access is explicit, not a profile attribute
4. **Better RLS** - Simpler, more secure policies

## Migration Steps

### Step 1: Deploy Migration

Run the migration on Supabase:

```bash
# Using Supabase CLI
supabase db push

# Or manually via SQL Editor in Supabase Dashboard
# Copy contents of 20260121000000_create_admin_users_table.sql
```

### Step 2: Migrate Existing Admins

Run the migration script:

```bash
# Using Supabase CLI
supabase db reset --with-migrations

# Or manually via SQL Editor
# Copy contents of migrate-admins-to-admin-users.sql
```

### Step 3: Update Admin App

The admin app has been updated to use `admin_users` table:

- `lib/supabase/proxy.ts` - Checks `admin_users` table
- `lib/middleware/admin-auth.ts` - Verifies admin via `admin_users`

### Step 4: Verify Migration

Run verification query:

```sql
SELECT
    'Total admins in profiles' as metric,
    COUNT(*) as count
FROM profiles
WHERE role = 'admin'
UNION ALL
SELECT
    'Total admins in admin_users' as metric,
    COUNT(*) as count
FROM admin_users;
```

Expected result:
```
metric                       | count
-----------------------------|------
Total admins in profiles     | 5
Total admins in admin_users  | 5
```

### Step 5: Update Trader App

The trader app has been updated to remove admin logic:

- `lib/middleware/auth.ts` - Removed `requireAdmin()`
- `lib/supabase/proxy.ts` - Removed admin route protection
- `hooks/use-market-prices.ts` - Added session guard
- `hooks/use-live-data.ts` - Added session guard

### Step 6: Cleanup (Optional, After Verification)

After confirming the migration works correctly:

1. Remove `role` column from `profiles` table:
   ```sql
   ALTER TABLE profiles DROP COLUMN role;
   ```

2. Update RLS policies to remove role dependency:
   ```sql
   DROP POLICY IF EXISTS "admins can view all profiles" ON profiles;
   CREATE POLICY "admins can view all profiles"
   ON profiles FOR SELECT
   USING (
       EXISTS (
           SELECT 1 FROM admin_users au
           WHERE au.user_id = auth.uid()
       )
   );
   ```

## Deployment Checklist

- [ ] Migration file created in `supabase/migrations/`
- [ ] Migration deployed to Supabase
- [ ] Existing admins migrated to `admin_users` table
- [ ] Admin app updated to use `admin_users` table
- [ ] Trader app admin logic removed
- [ ] Realtime subscriptions guarded with session checks
- [ ] Environment variable fallbacks removed
- [ ] Port configuration fixed (3000/3001)
- [ ] Type safety enforced (no `ignoreBuildErrors`)
- [ ] Verification query confirms migration success
- [ ] No 401 errors in browser console
- [ ] Admin routes redirect correctly in production

## Rollback Plan

If issues arise, rollback steps:

1. Restore `profiles.role` column (if removed):
   ```sql
   ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'trader';
   ```

2. Restore admin logic in trader app (if needed):
   - Revert changes to `lib/middleware/auth.ts`
   - Revert changes to `lib/supabase/proxy.ts`

3. Restore environment variable fallbacks (if needed):
   - Revert changes to `lib/supabase/proxy.ts`

## Post-Migration Tasks

1. **Update documentation** - Update CLAUDE.md and other docs
2. **Update deployment scripts** - Ensure CI/CD handles new table
3. **Add monitoring** - Monitor admin_users table access
4. **Security review** - Review RLS policies for admin_users

## Timeline

- **Migration deployment**: 5 minutes
- **Admin migration**: 2 minutes
- **Verification**: 5 minutes
- **Total**: ~12 minutes

## Support

For issues with this migration:
1. Check Supabase logs for errors
2. Verify migration file syntax
3. Check admin_users table exists and has RLS enabled
4. Verify admin app is using correct table
