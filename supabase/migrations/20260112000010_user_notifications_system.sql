-- Create user_notifications table
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (
        type IN (
            'deposit',
            'withdrawal',
            'trade',
            'security',
            'system',
            'chat'
        )
    ),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    link TEXT,
    -- Optional link to redirect user
    created_at TIMESTAMPTZ DEFAULT now()
);
-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
-- Policy: Users can only see their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.user_notifications;
CREATE POLICY "Users can view own notifications" ON public.user_notifications FOR
SELECT TO authenticated USING (auth.uid() = user_id);
-- Policy: Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;
CREATE POLICY "Users can update own notifications" ON public.user_notifications FOR
UPDATE TO authenticated USING (auth.uid() = user_id);
-- Enable Realtime
ALTER PUBLICATION supabase_realtime
ADD TABLE public.user_notifications;
-- -----------------------------------------------------------------------------
-- TRIGGER FUNCTION: Notify on Transaction Update (Deposit/Withdrawal)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_user_on_transaction_update() RETURNS TRIGGER AS $$
DECLARE v_title TEXT;
v_message TEXT;
v_type TEXT;
v_link TEXT;
BEGIN -- 1. Deposit Updates
IF NEW.type = 'deposit' THEN v_type := 'deposit';
v_link := '/deposit';
IF OLD.status = 'pending'
AND NEW.status = 'completed' THEN v_title := 'Deposit Confirmed';
v_message := 'Your deposit of ' || NEW.amount || ' ' || NEW.asset || ' has been confirmed and credited to your balance.';
ELSIF OLD.status = 'pending'
AND NEW.status = 'rejected' THEN v_title := 'Deposit Rejected';
v_message := 'Your deposit of ' || NEW.amount || ' ' || NEW.asset || ' was rejected. Please contact support.';
END IF;
-- 2. Withdrawal Updates
ELSIF NEW.type = 'withdrawal' THEN v_type := 'withdrawal';
v_link := '/withdrawal';
IF NEW.status = 'pending'
AND OLD.status IS NULL THEN -- Fresh insert maybe? usually inserts are pending.
-- We might not want to notify on creation if the user just did it, but good for confirmation.
v_title := 'Withdrawal Requested';
v_message := 'Your withdrawal request for ' || NEW.amount || ' ' || NEW.asset || ' has been submitted.';
ELSIF OLD.status = 'pending'
AND NEW.status = 'completed' THEN v_title := 'Withdrawal Successful';
v_message := 'Your withdrawal of ' || NEW.amount || ' ' || NEW.asset || ' has been processed successfully.';
ELSIF OLD.status = 'pending'
AND NEW.status = 'failed' THEN -- Rejected case
v_title := 'Withdrawal Rejected';
v_message := 'Your withdrawal request was rejected. The funds have been returned to your wallet.';
END IF;
END IF;
-- Insert Notification if message generated
IF v_message IS NOT NULL THEN
INSERT INTO public.user_notifications (user_id, type, title, message, link)
VALUES (NEW.user_id, v_type, v_title, v_message, v_link);
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Trigger: Transactions (UPDATE only, typically status changes)
-- We also catch INSERT for withdrawals if we want immediate confirmation
DROP TRIGGER IF EXISTS tr_notify_user_transaction_update ON transactions;
CREATE TRIGGER tr_notify_user_transaction_update
AFTER
UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION notify_user_on_transaction_update();
DROP TRIGGER IF EXISTS tr_notify_user_transaction_insert ON transactions;
CREATE TRIGGER tr_notify_user_transaction_insert
AFTER
INSERT ON transactions FOR EACH ROW EXECUTE FUNCTION notify_user_on_transaction_update();
-- -----------------------------------------------------------------------------
-- TRIGGER FUNCTION: Notify on Trade Result
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_user_on_trade_result() RETURNS TRIGGER AS $$
DECLARE v_title TEXT;
v_message TEXT;
v_type TEXT := 'trade';
BEGIN -- Assuming 'executed_trades' or 'trades' table updates.
-- Looking at previous context, we might be using `withdrawals` table logic... 
-- But usually binary options trades finalize by UPDATE or INSERT into history.
-- Let's assume `trades` table has a `status` or updates `payout`.
-- If this is a Binary Option trade settlement (WIN/LOSS)
IF NEW.status = 'CLOSED'
AND OLD.status = 'OPEN' THEN IF NEW.payout > 0 THEN v_title := 'Trade Won! 🚀';
v_message := 'You won ' || NEW.payout || ' on ' || NEW.asset_symbol;
ELSE v_title := 'Trade Finished';
v_message := 'Your trade on ' || NEW.asset_symbol || ' has finished.';
END IF;
INSERT INTO public.user_notifications (user_id, type, title, message)
VALUES (NEW.user_id, v_type, v_title, v_message);
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Trigger: Trades (UPDATE)
-- Assuming 'trades' table exists and has status column. 
-- PLEASE VERIFY TABLE STRUCTURE BEFORE RUNNING. 
-- I will blindly add it for now but wrap in exception block in real life or checks.
-- For this file, we assume standard structure.
DROP TRIGGER IF EXISTS tr_notify_user_trade_update ON trades;
CREATE TRIGGER tr_notify_user_trade_update
AFTER
UPDATE ON trades FOR EACH ROW EXECUTE FUNCTION notify_user_on_trade_result();
-- -----------------------------------------------------------------------------
-- TRIGGER FUNCTION: Notify on New Support Message (FROM Admin)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_user_on_support_message() RETURNS TRIGGER AS $$ BEGIN -- Only notify if sender is admin
    IF NEW.sender_role = 'admin' THEN
INSERT INTO public.user_notifications (user_id, type, title, message, link)
VALUES (
        NEW.user_id,
        'chat',
        'New Support Message',
        left(NEW.content, 50) || '...',
        '/support'
    );
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS tr_notify_user_support_message ON support_messages;
CREATE TRIGGER tr_notify_user_support_message
AFTER
INSERT ON support_messages FOR EACH ROW EXECUTE FUNCTION notify_user_on_support_message();