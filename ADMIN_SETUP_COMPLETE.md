# Binapex Admin Setup Guide

## Admin Credentials

- **Email:** `admin.01@binapex.my`
- **Password:** `[REDACTED_FOR_SECURITY]`

## Step-by-Step Setup Instructions

### Step 1: Create the Admin User Account

You have THREE options:

#### Option A: Sign Up Then Promote (Recommended for Testing)

1. Go to your Binapex app homepage
2. Click "Sign Up" 
3. Fill in the form with:
   - Email: `admin.01@binapex.my`
   - Password: `[REDACTED_FOR_SECURITY]` (must contain uppercase, lowercase, number, special character)
   - Other required fields
4. Complete the signup
5. Go to your Supabase Dashboard → SQL Editor
6. Run this query:

```sql
UPDATE public.profiles
SET 
  role = 'admin',
  full_name = 'System Administrator',
  kyc_verified = true,
  membership_tier = 'diamond'
WHERE email = 'admin.01@binapex.my';
```

#### Option B: Create Directly in Supabase Dashboard

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User"
3. Fill in:
   - Email: `admin.01@binapex.my`
   - Password: `[REDACTED_FOR_SECURITY]`
   - Check "Auto confirm user"
4. Click "Create"
5. Copy the user ID from the newly created user
6. Go to SQL Editor and run:

```sql
INSERT INTO public.profiles (id, email, role, full_name, kyc_verified, membership_tier)
VALUES ('{USER_ID}', 'admin.01@binapex.my', 'admin', 'System Administrator', true, 'diamond');
```

Replace `{USER_ID}` with the actual user ID.

### Step 2: Login to Admin Panel

1. Go to your app homepage
2. Click "Admin Portal" button
3. You'll be redirected to `/admin/login`
4. Enter credentials:
   - Email: `admin.01@binapex.my`
   - Password: `[REDACTED_FOR_SECURITY]`
5. Click "Access Control Panel"

### Step 3: Access Admin Features

Once logged in, you can access:
- **Dashboard** - View platform statistics
- **Users** - Manage user accounts and KYC status
- **Deposits** - Approve/reject deposit requests
- **Withdrawals** - Approve/reject withdrawal requests
- **Tickets** - Handle support tickets
- **Risk Monitor** - Monitor trading risk
- **Finance** - Manage platform finances

## Troubleshooting

### "Invalid Admin Credentials" Error

**Problem:** Login fails even with correct credentials

**Solutions:**
1. **Verify user exists:** Go to Supabase Dashboard → Authentication → Users. You should see `admin.01@binapex.my`
2. **Verify profile role:** Run in SQL Editor:
   ```sql
   SELECT id, email, role FROM public.profiles WHERE email = 'admin.01@binapex.my';
   ```
   The `role` field must be exactly `'admin'` (lowercase)

3. **Check password:** Ensure password meets requirements:
   - ✅ At least 8 characters
   - ✅ At least 1 uppercase letter (A)
   - ✅ At least 1 lowercase letter (dmin)
   - ✅ At least 1 number (2024)
   - ✅ At least 1 special character (@!)

4. **Verify no RLS blocks:** Check if RLS policies allow the query:
   ```sql
   SELECT * FROM public.profiles WHERE email = 'admin.01@binapex.my';
   ```

### Login Page Shows "Checking authentication..." Too Long

- This is normal on first load (5-10 seconds)
- Subsequent logins are cached and faster
- If it persists, check browser console for errors

### Can't Find "Admin Portal" Link

- Make sure you're on the homepage (`/`)
- The link is in the navbar under "Admin Portal"
- If not visible, check your user role - only admins should see it after login

## Security Notes

⚠️ **Important:** 
- Change the default admin password immediately after first login in production
- Enable two-factor authentication if available
- All admin logins are logged in `admin_logs` table
- Never share admin credentials
- Use strong, unique passwords

## Admin Permissions

The admin role grants access to:
- View all user accounts
- Approve/reject deposits and withdrawals  
- Update user KYC status
- Modify credit scores
- View all transactions
- Manage support tickets
- Monitor platform risk

Use admin access responsibly!
