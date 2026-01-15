# Creating Admin User for Binapex

## Steps to Create Admin Account

### Option 1: Sign Up Then Promote (Recommended)

1. **Sign Up Through the UI:**
   - Go to `https://your-app-url.vercel.app/signup`
   - Register with:
     - Email: `admin.01@binapex.my`
     - Password: `[REDACTED_FOR_SECURITY]`
     - Full Name: `Admin User`
   - Verify your email if required

2. **Promote to Admin:**
   After signup, run the SQL script to promote the user to admin:

```sql
UPDATE public.profiles
SET 
  role = 'admin',
  full_name = 'Admin User',
  kyc_verified = true
WHERE email = 'admin.01@binapex.my';
```

3. **Verify Admin Access:**
   - Log out and log back in
   - Navigate to `/admin` - you should now see the admin dashboard

---

### Option 2: Using Supabase Dashboard (Alternative)

1. **Go to Supabase Dashboard:**
   - Navigate to: https://supabase.com/dashboard
   - Select your Binapex project

2. **Create User via Auth:**
   - Go to Authentication > Users
   - Click "Add User"
   - Enter:
     - Email: `admin.01@binapex.my`
     - Password: `[REDACTED_FOR_SECURITY]`
     - Auto Confirm User: ✓ (checked)

3. **Set Admin Role:**
   - Go to Table Editor > profiles
   - Find the user by email `admin.01@binapex.my`
   - Edit the row:
     - role: `admin`
     - full_name: `Admin User`
     - kyc_verified: `true`

---

### Option 3: Using SQL Editor (Quick Method)

Run this in the Supabase SQL Editor:

```sql
-- This assumes the user already signed up
UPDATE public.profiles
SET 
  role = 'admin',
  full_name = 'Admin User',
  kyc_verified = true
WHERE email = 'admin.01@binapex.my';
```

---

## Verify Admin Access

After creating the admin user, verify access by:

1. **Login:**
   - Email: `admin.01@binapex.my`
   - Password: `[REDACTED_FOR_SECURITY]`

2. **Test Admin Routes:**
   - Navigate to `/admin` - should see admin dashboard
   - Navigate to `/admin/users` - should see user management
   - Navigate to `/admin/finance` - should see deposit approvals

3. **Check Database:**
```sql
SELECT id, email, role, full_name, created_at
FROM public.profiles
WHERE role = 'admin';
```

---

## Security Notes

- Change the password immediately after first login
- Enable 2FA if available
- Never share admin credentials
- Regularly audit admin actions in the `admin_logs` table

---

## Troubleshooting

**Can't access /admin routes:**
- Check that the profile role is set to 'admin' (not 'Admin' or 'ADMIN')
- Clear browser cache and cookies
- Try logging out and back in

**User not in profiles table:**
- The trigger should auto-create profiles on signup
- Verify the trigger exists: `on_auth_user_created`
- Manually insert if needed

**Email not confirmed:**
- Go to Supabase Dashboard > Authentication > Users
- Find the user and click "Send verification email" or manually confirm
