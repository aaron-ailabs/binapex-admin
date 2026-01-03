-- Step 1: Database Reset & Clean Slate
-- Drop existing tables if they exist to start fresh
DROP TABLE IF EXISTS withdrawals CASCADE;
DROP TABLE IF EXISTS user_withdrawal_secrets CASCADE;
DROP TABLE IF EXISTS admin_audit_logs CASCADE;
-- Note: usage mentions Payment Methods or Bank Transfers, keeping those potentially if used by other modules, 
-- but instructions say "Clear all old withdrawal-specific paths". 
-- I will be careful not to drop generic tables unless they are purely for the old withdrawal flow.
-- Looking at previous context, `user_bank_accounts` might be used for deposits too, so I'll leave it unless explicitly told to drop.
-- Dropping functions
DROP FUNCTION IF EXISTS verify_withdrawal_password(text);
DROP FUNCTION IF EXISTS admin_view_user_password(uuid);
DROP FUNCTION IF EXISTS admin_reset_user_password(uuid, text);
DROP FUNCTION IF EXISTS request_withdrawal(numeric, jsonb);
DROP FUNCTION IF EXISTS approve_withdrawal(uuid);
DROP FUNCTION IF EXISTS reject_withdrawal(uuid, text);


-- Step 2: Schema Definition

-- 1. Table: user_withdrawal_secrets
CREATE TABLE user_withdrawal_secrets (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    password_plaintext TEXT NOT NULL, -- CRITICAL: Stored as plaintext per requirements
    failed_attempts INT DEFAULT 0,
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table: withdrawals
CREATE TABLE withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    method TEXT CHECK (method IN ('BANK', 'EWALLET')) NOT NULL,
    amount_usd DECIMAL(10,2) NOT NULL,
    exchange_rate DECIMAL(10,4) NOT NULL,
    amount_myr DECIMAL(10,2) NOT NULL,
    fee_deducted DECIMAL(10,2) NOT NULL DEFAULT 0,
    payout_details JSONB NOT NULL,
    status TEXT CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED')) NOT NULL DEFAULT 'PENDING',
    admin_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Table: admin_audit_logs
CREATE TABLE admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL, -- Assuming linked to auth.users or profiles, but storing as UUID for flexibility
    target_user_id UUID NOT NULL,
    action_type TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);


-- Step 3: Security & Row Level Security (RLS)

ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_withdrawal_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin (assuming `is_admin` RPC or claim exists, implementing a basic check)
-- Re-using existing `is_admin` if available, or defining a simple check on profiles tier/role.
-- Ideally we rely on the `is_admin` function seen in previous files. 

-- RLS: withdrawals
CREATE POLICY "Users can select own withdrawals" ON withdrawals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own withdrawals" ON withdrawals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins have full access to withdrawals" ON withdrawals
    FOR ALL USING ( (SELECT is_admin() FROM auth.users WHERE id = auth.uid()) = true );

-- RLS: user_withdrawal_secrets
CREATE POLICY "Users can insert their secret" ON user_withdrawal_secrets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users CANNOT SELECT their own row (Blind Input). No SELECT policy for users.

CREATE POLICY "Admins can select secrets" ON user_withdrawal_secrets
    FOR SELECT USING ( (SELECT is_admin() FROM auth.users WHERE id = auth.uid()) = true );

CREATE POLICY "Admins can update secrets" ON user_withdrawal_secrets
    FOR UPDATE USING ( (SELECT is_admin() FROM auth.users WHERE id = auth.uid()) = true );

CREATE POLICY "Admins can insert secrets" ON user_withdrawal_secrets
    FOR INSERT WITH CHECK ( (SELECT is_admin() FROM auth.users WHERE id = auth.uid()) = true );

-- RLS: admin_audit_logs
-- Users: No Access (No policies created for standard users)
CREATE POLICY "Admins can insert audit logs" ON admin_audit_logs
    FOR INSERT WITH CHECK ( (SELECT is_admin() FROM auth.users WHERE id = auth.uid()) = true );

CREATE POLICY "Admins can select audit logs" ON admin_audit_logs
    FOR SELECT USING ( (SELECT is_admin() FROM auth.users WHERE id = auth.uid()) = true );


-- Step 4: Backend Logic (Postgres RPC Functions)

-- Function A: verify_withdrawal_password
CREATE OR REPLACE FUNCTION verify_withdrawal_password(input_pwd TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_secret_row user_withdrawal_secrets%ROWTYPE;
BEGIN
    -- Fetch row
    SELECT * INTO v_secret_row
    FROM user_withdrawal_secrets
    WHERE user_id = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Withdrawal password not set.';
    END IF;

    -- Check Lock
    IF v_secret_row.is_locked THEN
        RAISE EXCEPTION 'Withdraw password entered incorrectly three times. Please contact Customer Service for assistance.';
    END IF;

    -- Check Match
    IF input_pwd = v_secret_row.password_plaintext THEN
        -- Success: Reset failed attempts
        UPDATE user_withdrawal_secrets
        SET failed_attempts = 0, updated_at = NOW()
        WHERE user_id = v_user_id;
        
        RETURN TRUE;
    ELSE
        -- Failure
        DECLARE
            v_new_attempts INT := v_secret_row.failed_attempts + 1;
        BEGIN
            UPDATE user_withdrawal_secrets
            SET failed_attempts = v_new_attempts,
                is_locked = (v_new_attempts >= 3),
                updated_at = NOW()
            WHERE user_id = v_user_id;

            IF v_new_attempts >= 3 THEN
                RAISE EXCEPTION 'Withdraw password entered incorrectly three times. Please contact Customer Service for assistance.';
            ELSE
                RAISE EXCEPTION 'Incorrect password. You have % tries remaining.', (3 - v_new_attempts);
            END IF;
        END;
    END IF;
END;
$$;


-- Function B: admin_view_user_password
CREATE OR REPLACE FUNCTION admin_view_user_password(target_uid UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_is_admin BOOLEAN;
    v_pwd TEXT;
BEGIN
    -- Check Admin
    SELECT is_admin() INTO v_is_admin;
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    -- Insert Audit Log
    INSERT INTO admin_audit_logs (admin_id, target_user_id, action_type)
    VALUES (v_admin_id, target_uid, 'VIEW_PASSWORD');

    -- Retrieve Password
    SELECT password_plaintext INTO v_pwd
    FROM user_withdrawal_secrets
    WHERE user_id = target_uid;

    RETURN v_pwd;
END;
$$;


-- Function C: admin_reset_user_password
CREATE OR REPLACE FUNCTION admin_reset_user_password(target_uid UUID, new_pwd TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_id UUID := auth.uid();
    v_is_admin BOOLEAN;
BEGIN
    -- Check Admin
    SELECT is_admin() INTO v_is_admin;
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    -- Update Secret
    UPDATE user_withdrawal_secrets
    SET password_plaintext = new_pwd,
        failed_attempts = 0,
        is_locked = FALSE,
        updated_at = NOW()
    WHERE user_id = target_uid;
    
    -- If row doesn't exist (e.g. admin setting it for the first time for a user?), insert it.
    IF NOT FOUND THEN
        INSERT INTO user_withdrawal_secrets (user_id, password_plaintext, failed_attempts, is_locked)
        VALUES (target_uid, new_pwd, 0, FALSE);
    END IF;

    -- Insert Audit Log
    INSERT INTO admin_audit_logs (admin_id, target_user_id, action_type)
    VALUES (v_admin_id, target_uid, 'RESET_PASSWORD');
END;
$$;
