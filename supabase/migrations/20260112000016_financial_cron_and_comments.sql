-- =============================================
-- FINANCIAL SNAPSHOTS & SUGGESTION COMMENTS
-- =============================================
-- 1. FINANCIAL REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.financial_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date DATE NOT NULL UNIQUE,
    metrics JSONB NOT NULL,
    -- Stores the JSON dump of the report
    total_deposits DECIMAL(28, 8),
    total_withdrawals DECIMAL(28, 8),
    net_flow DECIMAL(28, 8),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Enable RLS
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view reports" ON public.financial_reports FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
-- 2. SNAPSHOT FUNCTION
-- Can be called via Cron or Manually
CREATE OR REPLACE FUNCTION snapshot_daily_financials() RETURNS VOID AS $$
DECLARE r RECORD;
report_json JSONB;
BEGIN -- Get yesterday's data (assuming we run this at 00:00 UTC for the previous day)
-- OR we can pass a date. Let's default to CURRENT_DATE - 1 day if running daily?
-- Actually, if running at 23:59, we use CURRENT_DATE.
-- Let's assume on-demand or end-of-day run for CURRENT_DATE.
SELECT * INTO r
FROM get_daily_financial_report(CURRENT_DATE);
IF r.metric_date IS NULL THEN -- No data found, maybe insert empty record or skip?
-- Let's skip to avoid clutter if no activity
RETURN;
END IF;
report_json := jsonb_build_object(
    'date',
    r.metric_date,
    'deposits',
    r.total_deposits,
    'withdrawals',
    r.total_withdrawals,
    'net_flow',
    r.net_flow,
    'deposit_count',
    r.deposit_count,
    'withdrawal_count',
    r.withdrawal_count,
    'currency',
    r.currency
);
INSERT INTO public.financial_reports (
        report_date,
        metrics,
        total_deposits,
        total_withdrawals,
        net_flow
    )
VALUES (
        CURRENT_DATE,
        report_json,
        r.total_deposits,
        r.total_withdrawals,
        r.net_flow
    ) ON CONFLICT (report_date) DO
UPDATE
SET metrics = EXCLUDED.metrics,
    total_deposits = EXCLUDED.total_deposits,
    total_withdrawals = EXCLUDED.total_withdrawals,
    net_flow = EXCLUDED.net_flow,
    created_at = NOW();
-- Update timestamp
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 3. TRY PG_CRON (May fail in some envs, wrap in DO block to warn but not fail migration)
DO $$ BEGIN -- Check if pg_cron extension is available to be installed
-- This often requires superuser. If it fails, the user must set it up manually.
-- We will try to create extension if not exists.
BEGIN CREATE EXTENSION IF NOT EXISTS pg_cron;
-- Schedule daily at 23:59 UTC
-- job_name property prevents duplicates
PERFORM cron.schedule(
    'daily_financial_snapshot',
    '59 23 * * *',
    'SELECT snapshot_daily_financials()'
);
EXCEPTION
WHEN OTHERS THEN RAISE NOTICE 'Could not enable pg_cron or schedule job. Please configure manually if needed. Error: %',
SQLERRM;
END;
END;
$$;
-- 4. SUGGESTION COMMENTS
CREATE TABLE IF NOT EXISTS public.suggestion_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suggestion_id UUID REFERENCES public.admin_suggestions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.suggestion_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view comments" ON public.suggestion_comments FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
CREATE POLICY "Admins can create comments" ON public.suggestion_comments FOR
INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );