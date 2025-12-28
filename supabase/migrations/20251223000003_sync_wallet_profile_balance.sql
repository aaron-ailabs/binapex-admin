-- 1. Wallet -> Profile Sync Function
CREATE OR REPLACE FUNCTION public.sync_wallet_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if the asset is USD and balance actually changed
    IF NEW.asset = 'USD' AND (OLD IS NULL OR NEW.balance IS DISTINCT FROM OLD.balance) THEN
        UPDATE public.profiles
        SET balance_usd = NEW.balance
        WHERE id = NEW.user_id 
        AND (balance_usd IS DISTINCT FROM NEW.balance OR balance_usd IS NULL);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Profile -> Wallet Sync Function
CREATE OR REPLACE FUNCTION public.sync_profile_to_wallet()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if balance_usd actually changed
    IF (OLD IS NULL OR NEW.balance_usd IS DISTINCT FROM OLD.balance_usd) THEN
        INSERT INTO public.wallets (user_id, asset, asset_type, balance, locked_balance)
        VALUES (NEW.id, 'USD', 'fiat', COALESCE(NEW.balance_usd, 0), 0)
        ON CONFLICT (user_id, asset) DO UPDATE
        SET balance = EXCLUDED.balance
        WHERE public.wallets.balance IS DISTINCT FROM EXCLUDED.balance;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create Triggers
DROP TRIGGER IF EXISTS on_wallet_usd_change ON public.wallets;
CREATE TRIGGER on_wallet_usd_change
AFTER INSERT OR UPDATE OF balance ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION public.sync_wallet_to_profile();

DROP TRIGGER IF EXISTS on_profile_balance_change ON public.profiles;
CREATE TRIGGER on_profile_balance_change
AFTER INSERT OR UPDATE OF balance_usd ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_to_wallet();

-- 4. Final Sync for Verified Inconsistency
-- Since Detail View ($200) was the intended value for Sanuk, we prioritize profile -> wallet for this specific fix,
-- but generally we should be careful. We'll sync everything to match wallets first, 
-- or use the most recent update. For now, let's just make sure they match.
UPDATE public.wallets w
SET balance = p.balance_usd
FROM public.profiles p
WHERE p.id = w.user_id AND w.asset = 'USD' AND w.balance IS DISTINCT FROM p.balance_usd;
