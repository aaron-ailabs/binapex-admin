-- Create RPC for atomic withdrawal request
CREATE OR REPLACE FUNCTION request_new_withdrawal(
    p_amount_usd NUMERIC,
    p_amount_myr NUMERIC,
    p_method TEXT,
    p_payout_details JSONB,
    p_password TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_current_balance NUMERIC;
    v_locked_balance NUMERIC;
    v_bonus_balance NUMERIC;
    v_available_balance NUMERIC;
    v_secret_row RECORD;
    v_withdrawal_id UUID;
BEGIN
    -- Get User ID
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 1. Security Check: Password
    SELECT * INTO v_secret_row FROM user_withdrawal_secrets WHERE user_id = v_user_id;
    
    IF v_secret_row IS NULL THEN
        RAISE EXCEPTION 'Withdrawal password not set.';
    END IF;
    
    IF v_secret_row.is_locked THEN
         RAISE EXCEPTION 'Account is locked. Contact Customer Service.';
    END IF;

    IF v_secret_row.password_plaintext != p_password THEN
        -- Increment fail attempt
        UPDATE user_withdrawal_secrets 
        SET failed_attempts = failed_attempts + 1,
            is_locked = (failed_attempts + 1) >= 3,
            updated_at = NOW()
        WHERE user_id = v_user_id;

        IF (v_secret_row.failed_attempts + 1) >= 3 THEN
             RAISE EXCEPTION 'Withdraw password entered incorrectly three times. Account locked.';
        ELSE
             RAISE EXCEPTION 'Incorrect password. % attempts remaining.', (3 - (v_secret_row.failed_attempts + 1));
        END IF;
    ELSE
        -- Reset attempts on success
        UPDATE user_withdrawal_secrets SET failed_attempts = 0 WHERE user_id = v_user_id;
    END IF;

    -- 2. Balance Check
    -- Check wallets table first
    SELECT balance, locked_balance INTO v_current_balance, v_locked_balance 
    FROM wallets WHERE user_id = v_user_id AND asset = 'USD';

    -- Fallback to profiles if no wallet (legacy support)
    IF v_current_balance IS NULL THEN
         SELECT balance_usd, bonus_balance INTO v_current_balance, v_bonus_balance
         FROM profiles WHERE id = v_user_id;
         v_locked_balance := 0; -- Assume 0 for profiles if not tracked there
    ELSE
         -- Get bonus from profiles even if wallet exists
         SELECT bonus_balance INTO v_bonus_balance FROM profiles WHERE id = v_user_id;
    END IF;
    
    v_available_balance := (COALESCE(v_current_balance, 0) + COALESCE(v_bonus_balance, 0)) - COALESCE(v_locked_balance, 0);

    IF v_available_balance < p_amount_usd THEN
        RAISE EXCEPTION 'Insufficient balance. Available: %', v_available_balance;
    END IF;

    -- 3. Deduct Balance (Prefer Wallets)
    IF EXISTS (SELECT 1 FROM wallets WHERE user_id = v_user_id AND asset = 'USD') THEN
        UPDATE wallets 
        SET balance = balance - p_amount_usd,
            updated_at = NOW()
        WHERE user_id = v_user_id AND asset = 'USD';
    ELSE
        UPDATE profiles
        SET balance_usd = balance_usd - p_amount_usd,
            updated_at = NOW()
        WHERE id = v_user_id;
    END IF;

    -- 4. Create Withdrawal Record
    INSERT INTO withdrawals (
        user_id,
        method,
        amount_usd,
        amount_myr,
        exchange_rate,
        fee_deducted,
        payout_details,
        status
    ) VALUES (
        v_user_id,
        p_method,
        p_amount_usd,
        p_amount_myr,
        4.45, -- Use passed rate or fixed
        0,
        p_payout_details,
        'PENDING'
    ) RETURNING id INTO v_withdrawal_id;
    
    -- Optional: Log transaction record for consistency
    INSERT INTO transactions (
        user_id,
        type,
        amount,
        currency,
        status,
        metadata
    ) VALUES (
        v_user_id,
        'withdrawal',
        p_amount_usd, -- stored as negative usually? Or just type withdrawal implies deduction. 
        -- Standard practice often negative for history
        -- but keeping positive with type 'withdrawal' is fine if consistent.
        -- Let's check consistency: UserDetailView shows amount. PendingWithdrawals uses absolute.
        -- We will store as negative to indicate outflow in transaction history
        -p_amount_usd,
        'USD',
        'pending',
        jsonb_build_object('withdrawal_id', v_withdrawal_id, 'method', p_method)
    );

    RETURN jsonb_build_object('success', true, 'id', v_withdrawal_id);
END;
$$;
