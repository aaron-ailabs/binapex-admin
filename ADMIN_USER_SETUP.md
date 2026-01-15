# Admin User Setup Guide

## Option 1: Create via Supabase Dashboard (Easiest)

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **Authentication > Users** (left sidebar)
4. Click **"Create a new user"** button
5. Fill in:
   - **Email**: `admin@binapex.my`
   - **Password**: `[REDACTED_FOR_SECURITY]`
   - Toggle **"Auto Confirm User"** ON
6. Click **"Create User"**
7. The user is now created in auth.users

Then run this SQL in the SQL Editor to promote them to admin:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'admin@binapex.my';
```

## Option 2: Create via Signup Form (Alternative)

1. Go to your Binapex app at `/signup`
2. Sign up with:
   - **Email**: `admin@binapex.my`
   - **Password**: `[REDACTED_FOR_SECURITY]`
3. Confirm your email if needed
4. Then run the SQL command above to promote the user to admin

## Option 3: Use Node.js Script (For Backend)

Run this in your terminal:

```bash
node scripts/create-admin.js
```

## Verification

After setup, verify the admin user was created:

```sql
SELECT id, email, role FROM public.profiles WHERE email = 'admin@binapex.my';
```

Login with:
- **Email**: `admin@binapex.my`
- **Password**: `[REDACTED_FOR_SECURITY]`
- Navigate to `/admin` - you should have full admin access
