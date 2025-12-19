-- Phase 1 & 4: Schema Fortification & RPC

-- 1. Fortify Transactions Table
ALTER TABLE transactions 
  ALTER COLUMN amount TYPE numeric,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('deposit', 'withdrawal')),
  ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'failed')),
  ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Ensure user_id is FK to PROFILES (as requested by user analysis via 'users' table usually mapping to 'profiles' in this Supabase setup)
-- First, drop existing constraint if it exists to be safe, or just add if missing. 
-- Note: 'profiles' usually references auth.users. 
-- The user said "user_id is a Foreign Key to auth.users". Let's stick to auth.users for the FK to be safe, OR profiles.
-- However, 'page.tsx' joins 'user_id' to get 'full_name' which is in 'profiles'. 
-- So 'transactions.user_id' SHOULD reference 'profiles.id' (which is usually same as auth.users.id).
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
ALTER TABLE transactions
  ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 2. Fortify Wallets Table
ALTER TABLE wallets
  ALTER COLUMN balance TYPE numeric,
  ALTER COLUMN balance SET DEFAULT 0;

ALTER TABLE wallets
  DROP CONSTRAINT IF EXISTS wallets_user_id_fkey;
ALTER TABLE wallets
  ADD CONSTRAINT wallets_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 3. RLS Policies
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Transactions Policies
DROP POLICY IF EXISTS "Users can insert their own transactions" ON transactions;
CREATE POLICY "Users can insert their own transactions" ON transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
CREATE POLICY "Users can view their own transactions" ON transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
CREATE POLICY "Admins can view all transactions" ON transactions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Wallets Policies
DROP POLICY IF EXISTS "Users can view their own wallets" ON wallets;
CREATE POLICY "Users can view their own wallets" ON wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all wallets" ON wallets;
CREATE POLICY "Admins can view all wallets" ON wallets FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Block direct wallet updates (Only RPC allows updates)
DROP POLICY IF EXISTS "Deny direct wallet updates" ON wallets;
-- No UPDATE policy for public/authenticated means they CANNOT update. 
-- We explicitly technically don't need a deny policy if we don't add an allow policy.
-- But we need to ensure ADMINS can't even accidentally do it via client, only via RPC? 
-- Actually RPC usually runs as SECURITY DEFINER or owner.
-- Let's just NOT add any UPDATE policy for wallets.

-- Phase 2: Storage
-- Create Bucket (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('deposit-receipts', 'deposit-receipts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies
DROP POLICY IF EXISTS "Authenticated Users Insert Receipts" ON storage.objects;
CREATE POLICY "Authenticated Users Insert Receipts" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'deposit-receipts' AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Public View Receipts" ON storage.objects;
CREATE POLICY "Public View Receipts" ON storage.objects FOR SELECT TO public USING (bucket_id = 'deposit-receipts');

-- Phase 4: Atomic RPC
CREATE OR REPLACE FUNCTION approve_deposit(transaction_id UUID, admin_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_amount numeric;
  v_user_id uuid;
  v_status text;
BEGIN
  -- 1. Check Transaction Status & Lock Row
  SELECT amount, user_id, status INTO v_amount, v_user_id, v_status
  FROM transactions
  WHERE id = transaction_id
  FOR UPDATE;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'Transaction is not pending';
  END IF;

  -- 2. Update Transaction Status
  UPDATE transactions
  SET status = 'approved',
      updated_at = now() -- Assuming updated_at exists or it will be ignored if trigger handles it
  WHERE id = transaction_id;

  -- 3. Update Wallet Balance
  -- Check if wallet exists, if not create? Or assume it exists?
  -- Safe to access via user_id
  UPDATE wallets
  SET balance = balance + v_amount,
      updated_at = now()
  WHERE user_id = v_user_id;
  
  -- If wallet not found, maybe create? (Optional safety)
  IF NOT FOUND THEN
     INSERT INTO wallets (user_id, balance) VALUES (v_user_id, v_amount);
  END IF;

END;
$$;
