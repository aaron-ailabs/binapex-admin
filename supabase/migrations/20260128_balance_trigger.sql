-- Function to update balance
CREATE OR REPLACE FUNCTION public.maintain_profile_balance() RETURNS TRIGGER AS $$ BEGIN -- Update balance for the affected user
    -- We use an incremental update for performance, unless it's a bulk operation where recalculation might be safer.
    -- For simplicity and robustness (as requested: "Derived from transactions"), we recalculate.
    IF (TG_OP = 'DELETE') THEN
UPDATE profiles
SET balance_usd = (
        SELECT COALESCE(SUM(amount), 0)
        FROM transactions
        WHERE user_id = OLD.user_id
            AND status = 'completed'
    )
WHERE id = OLD.user_id;
RETURN OLD;
ELSE
UPDATE profiles
SET balance_usd = (
        SELECT COALESCE(SUM(amount), 0)
        FROM transactions
        WHERE user_id = NEW.user_id
            AND status = 'completed'
    )
WHERE id = NEW.user_id;
RETURN NEW;
END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Trigger definition
DROP TRIGGER IF EXISTS trg_maintain_balance ON transactions;
CREATE TRIGGER trg_maintain_balance
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON transactions FOR EACH ROW EXECUTE FUNCTION public.maintain_profile_balance();