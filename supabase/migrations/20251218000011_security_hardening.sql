-- ============================================
-- HARDEN RLS POLICIES FOR TRADING TABLES
-- Includes 030_harden_rls.sql limits and extra tables
-- ============================================

-- Force RLS on all tables
ALTER TABLE public.trading_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.limit_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.executed_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Additional tables from Consolidated Schema
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_trade_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_trade_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- HELPER: is_admin() is already defined as SECURITY DEFINER
-- We trust public.is_admin() to prevent recursion.

-- 1. TRADING PAIRS (Public Read, Admin Write)
DROP POLICY IF EXISTS "Public Read Trading Pairs" ON public.trading_pairs;
CREATE POLICY "Public Read Trading Pairs" 
ON public.trading_pairs FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Admin Write Trading Pairs" ON public.trading_pairs;
CREATE POLICY "Admin Write Trading Pairs" 
ON public.trading_pairs FOR ALL
USING (public.is_admin());

-- 2. ASSETS (Public Read, Admin Write)
DROP POLICY IF EXISTS "Public Read Assets" ON public.assets;
CREATE POLICY "Public Read Assets" 
ON public.assets FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Admin Write Assets" ON public.assets;
CREATE POLICY "Admin Write Assets" 
ON public.assets FOR ALL
USING (public.is_admin());

-- 3. LIMIT ORDERS (Users Own, Admin All)
DROP POLICY IF EXISTS "Users View Own Orders" ON public.limit_orders;
CREATE POLICY "Users View Own Orders" 
ON public.limit_orders FOR SELECT 
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users Create Own Orders" ON public.limit_orders;
CREATE POLICY "Users Create Own Orders" 
ON public.limit_orders FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users Cancel Own Orders" ON public.limit_orders;
CREATE POLICY "Users Cancel Own Orders" 
ON public.limit_orders FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. EXECUTED TRADES (Users Own, Admin All)
DROP POLICY IF EXISTS "Users View Own Trades" ON public.executed_trades;
CREATE POLICY "Users View Own Trades" 
ON public.executed_trades FOR SELECT 
USING (auth.uid() = buyer_id OR auth.uid() = seller_id OR public.is_admin());

-- 5. TRANSACTIONS (Users View/Insert Own, Admin All)
DROP POLICY IF EXISTS "Users View Own Transactions" ON public.transactions;
CREATE POLICY "Users View Own Transactions" 
ON public.transactions FOR SELECT 
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users Insert Own (Deposit/Withdraw)" ON public.transactions;
CREATE POLICY "Users Insert Own (Deposit/Withdraw)" 
ON public.transactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin Update Transactions" ON public.transactions;
CREATE POLICY "Admin Update Transactions" 
ON public.transactions FOR UPDATE 
USING (public.is_admin());

-- 6. WALLETS (Users View Own, Admin All)
DROP POLICY IF EXISTS "Users View Own Wallets" ON public.wallets;
CREATE POLICY "Users View Own Wallets" 
ON public.wallets FOR SELECT 
USING (auth.uid() = user_id OR public.is_admin());

-- 7. BANK ACCOUNTS (Consolidated Table)
DROP POLICY IF EXISTS "Users View Own Bank Accounts" ON public.bank_accounts;
CREATE POLICY "Users View Own Bank Accounts" 
ON public.bank_accounts FOR SELECT 
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users Manage Own Bank Accounts" ON public.bank_accounts;
CREATE POLICY "Users Manage Own Bank Accounts" 
ON public.bank_accounts FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 8. AUTO TRADE SETTINGS
DROP POLICY IF EXISTS "Users Manage Own Auto Trade Settings" ON public.auto_trade_settings;
CREATE POLICY "Users Manage Own Auto Trade Settings" 
ON public.auto_trade_settings FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 9. AUTO TRADE LOGS
DROP POLICY IF EXISTS "Users View Own Auto Trade Logs" ON public.auto_trade_logs;
CREATE POLICY "Users View Own Auto Trade Logs" 
ON public.auto_trade_logs FOR SELECT 
USING (auth.uid() = user_id OR public.is_admin());

-- 10. EXCHANGE RATES (Public Read, Admin Write)
DROP POLICY IF EXISTS "Public Read Exchange Rates" ON public.exchange_rates;
CREATE POLICY "Public Read Exchange Rates" 
ON public.exchange_rates FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Admin Write Exchange Rates" ON public.exchange_rates;
CREATE POLICY "Admin Write Exchange Rates" 
ON public.exchange_rates FOR ALL 
USING (public.is_admin());
