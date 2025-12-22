-- Migration: Fix Admin Visibility for Transactions
-- Ensure the policy allows admins to see ALL transactions (not just their own)

-- 1. Drop potentially conflicting or missing policies
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;

-- 2. Re-create "Users can view their own transactions"
CREATE POLICY "Users can view their own transactions" 
ON transactions 
FOR SELECT 
TO authenticated 
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Note: I merged it into one OR policy for simplicity, but keeping them separate is also fine.
-- Let's stick to separate for clarity if preferred, but existing "Admins" policy should have worked.
-- Maybe "profiles" RLS prevents reading the role?
-- Critical: We must ensure 'profiles' is readable by authenticated users so the subquery works!

-- 3. Ensure 'profiles' table is readable!
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT 
TO authenticated 
USING (true);

-- 4. Re-Apply Admin Policy on Transactions explicitly
CREATE POLICY "Admins can view all transactions" 
ON transactions 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
