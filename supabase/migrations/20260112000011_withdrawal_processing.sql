-- Migration: Withdrawal Processing Logic (Approval and Rejection with Refund)
-- Created: 2026-01-12

-- 1. Function to approve withdrawal
CREATE OR REPLACE FUNCTION public.approve_withdrawal(p_withdrawal_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_withdrawal RECORD;
    v_admin_id UUID;
BEGIN
    -- 1. Check Admin
    v_admin_id := auth.uid();
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access Denied');
    END IF;

    -- 2. Lock & Get Withdrawal
    SELECT * INTO v_withdrawal FROM public.withdrawals WHERE id = p_withdrawal_id FOR UPDATE;
    IF v_withdrawal IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Withdrawal not found');
    END IF;

    IF v_withdrawal.status != 'PENDING' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Withdrawal is not pending');
    END IF;

    -- 3. Update Withdrawal Status
    UPDATE public.withdrawals
    SET status = 'COMPLETED',
        updated_at = NOW()
    WHERE id = p_withdrawal_id;

    -- 4. Update corresponding transaction record if exists
    UPDATE public.transactions
    SET status = 'completed',
        updated_at = NOW()
    WHERE metadata->>'withdrawal_id' = p_withdrawal_id::TEXT;

    -- 5. Log Audit Action
    INSERT INTO public.admin_audit_logs (admin_id, target_user_id, action_type)
    VALUES (v_admin_id, v_withdrawal.user_id, 'APPROVE_WITHDRAWAL');

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 2. Function to reject withdrawal and refund balance
CREATE OR REPLACE FUNCTION public.reject_withdrawal(p_withdrawal_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_withdrawal RECORD;
    v_admin_id UUID;
BEGIN
    -- 1. Check Admin
    v_admin_id := auth.uid();
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access Denied');
    END IF;

    -- 2. Lock & Get Withdrawal
    SELECT * INTO v_withdrawal FROM public.withdrawals WHERE id = p_withdrawal_id FOR UPDATE;
    IF v_withdrawal IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Withdrawal not found');
    END IF;

    IF v_withdrawal.status != 'PENDING' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Withdrawal is not pending');
    END IF;

    -- 3. Update Withdrawal Status to REJECTED
    UPDATE public.withdrawals
    SET status = 'REJECTED',
        admin_note = p_reason,
        updated_at = NOW()
    WHERE id = p_withdrawal_id;

    -- 4. Update corresponding transaction record status
    UPDATE public.transactions
    SET status = 'failed',
        admin_notes = p_reason,
        updated_at = NOW()
    WHERE metadata->>'withdrawal_id' = p_withdrawal_id::TEXT;

    -- 5. REFUND the amount to the user's wallet (or profile)
    IF EXISTS (SELECT 1 FROM public.wallets WHERE user_id = v_withdrawal.user_id AND asset = 'USD') THEN
        UPDATE public.wallets 
        SET balance = balance + v_withdrawal.amount_usd,
            updated_at = NOW()
        WHERE user_id = v_withdrawal.user_id AND asset = 'USD';
    ELSE
        UPDATE public.profiles
        SET balance_usd = balance_usd + v_withdrawal.amount_usd,
            updated_at = NOW()
        WHERE id = v_withdrawal.user_id;
    END IF;

    -- 6. Insert Refund Transaction record for history
    INSERT INTO public.transactions (
        user_id,
        type,
        amount,
        currency,
        status,
        metadata
    ) VALUES (
        v_withdrawal.user_id,
        'bonus', -- Using 'bonus' or generic credit for refund visibility
        v_withdrawal.amount_usd,
        'USD',
        'completed',
        jsonb_build_object(
            'withdrawal_id', p_withdrawal_id, 
            'type', 'refund', 
            'reason', p_reason,
            'original_amount', v_withdrawal.amount_usd
        )
    );

    -- 7. Log Audit Action
    INSERT INTO public.admin_audit_logs (admin_id, target_user_id, action_type)
    VALUES (v_admin_id, v_withdrawal.user_id, 'REJECT_WITHDRAWAL');

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
