# Admin User Setup Guide

## Admin Credentials
- **Email:** admin.01@binapex.my
- **Password:** [REDACTED_FOR_SECURITY]

---

## Setup Methods

### Method 1: Using Edge Function (Recommended)

The easiest way to create the admin user is using the Supabase Edge Function:

1. Deploy the Edge Function:
```bash
supabase functions deploy create-admin
```

2. Invoke the function (one-time setup):
```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/create-admin \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

The function will:
- Check if admin.01@binapex.my exists
- If yes: Promote to admin role
- If no: Create new user with admin role

---

### Method 2: Manual Signup + SQL Promotion

1. Go to the signup page: `https://yourdomain.com/signup`

2. Sign up with:
   - Email: `admin.01@binapex.my`
   - Password: `[REDACTED_FOR_SECURITY]`
   - Full Name: `System Administrator`

3. After signup, run the SQL script in Supabase SQL Editor:
   - Go to: Supabase Dashboard → SQL Editor
   - Run: `scripts/007_create_admin_user.sql`

4. The script will:
   - Promote the user to admin role
   - Set Diamond tier membership
   - Enable KYC verification
   - Add necessary admin RLS policies

---

### Method 3: Supabase Dashboard (Manual)

1. Go to: Supabase Dashboard → Authentication → Users

2. Create new user:
   - Email: `admin.01@binapex.my`
   - Password: `[REDACTED_FOR_SECURITY]`
   - Auto Confirm User: ✓

3. Go to: Database → Table Editor → profiles

4. Find the user by email and update:
   - role: `admin`
   - full_name: `System Administrator`
   - membership_tier: `diamond`
   - kyc_verified: `true`
   - balance_usd: `0`
   - bonus_balance: `0`

5. Run the RLS policy updates from `scripts/007_create_admin_user.sql`

---

## Verification

After creating the admin user, verify by:

1. Login at `/login` with the admin credentials

2. Navigate to `/admin` - you should see the admin dashboard

3. Check the profile in database:
```sql
SELECT id, email, role, full_name, membership_tier 
FROM profiles 
WHERE email = 'admin.01@binapex.my';
```

Expected result:
- role: `admin`
- membership_tier: `diamond`
- kyc_verified: `true`

---

## Security Notes

1. **Change the password immediately** after first login in production
2. Enable 2FA for admin accounts (future enhancement)
3. The admin role has access to:
   - All user data
   - Financial operations (deposits/withdrawals)
   - Support tickets
   - Risk management controls
4. Admin actions are logged in the `admin_logs` table
