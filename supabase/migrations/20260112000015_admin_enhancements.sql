-- =============================================
-- ADMIN ENHANCEMENTS MIGRATION
-- =============================================
-- 1. SYSTEM SETTINGS
-- Store global configs like Maintenance Mode
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);
-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
-- Policy: Only admins can view/update
CREATE POLICY "Admins can view system settings" ON public.system_settings FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
CREATE POLICY "Admins can update system settings" ON public.system_settings FOR
UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
CREATE POLICY "Admins can insert system settings" ON public.system_settings FOR
INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
-- Seed Default Maintenance Mode
INSERT INTO public.system_settings (key, value, description)
VALUES (
        'maintenance_mode',
        'false',
        'Global maintenance mode switch. Set to true to disable user access.'
    ) ON CONFLICT (key) DO NOTHING;
INSERT INTO public.system_settings (key, value, description)
VALUES (
        'maintenance_message',
        'We are currently performing scheduled maintenance. Please check back later.',
        'Message displayed to users during maintenance.'
    ) ON CONFLICT (key) DO NOTHING;
-- 2. ADMIN SUGGESTIONS SYSTEM
CREATE TABLE IF NOT EXISTS public.admin_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) CHECK (
        priority IN ('Low', 'Medium', 'High', 'Critical')
    ),
    complexity VARCHAR(20) CHECK (complexity IN ('S', 'M', 'L', 'XL')),
    status VARCHAR(20) DEFAULT 'Pending' CHECK (
        status IN (
            'Pending',
            'Under Review',
            'Approved',
            'Rejected',
            'Implemented'
        )
    ),
    author_id UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Voting table
CREATE TABLE IF NOT EXISTS public.suggestion_votes (
    suggestion_id UUID REFERENCES public.admin_suggestions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_type INTEGER CHECK (vote_type IN (1, -1)),
    -- +1 for upvote, -1 for downvote
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (suggestion_id, user_id)
);
-- Enable RLS
ALTER TABLE public.admin_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestion_votes ENABLE ROW LEVEL SECURITY;
-- Policies
CREATE POLICY "Admins can view all suggestions" ON public.admin_suggestions FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
CREATE POLICY "Admins can create suggestions" ON public.admin_suggestions FOR
INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
CREATE POLICY "Admins can update suggestions" ON public.admin_suggestions FOR
UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
                AND role = 'admin'
        )
    );
CREATE POLICY "Admins can vote" ON public.suggestion_votes FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM profiles
        WHERE id = auth.uid()
            AND role = 'admin'
    )
);
-- 3. FINANCIAL REPORTING RPC
-- Calculates daily totals for Deposits, Withdrawals, and Net Flow
-- Uses DECIMAL(28, 8) for high precision
CREATE OR REPLACE FUNCTION get_daily_financial_report(report_date DATE DEFAULT CURRENT_DATE) RETURNS TABLE (
        metric_date DATE,
        total_deposits DECIMAL(28, 8),
        total_withdrawals DECIMAL(28, 8),
        net_flow DECIMAL(28, 8),
        deposit_count INTEGER,
        withdrawal_count INTEGER,
        currency TEXT
    ) AS $$ BEGIN RETURN QUERY WITH block_deposits AS (
        SELECT SUM(amount) as d_sum,
            COUNT(*) as d_count,
            COALESCE(currency, 'USD') as curr
        FROM transactions
        WHERE type = 'deposit'
            AND status = 'completed' -- Only completed deposits
            AND date_trunc('day', created_at) = report_date
        GROUP BY COALESCE(currency, 'USD')
    ),
    block_withdrawals AS (
        SELECT SUM(amount) as w_sum,
            COUNT(*) as w_count,
            COALESCE(currency, 'USD') as curr
        FROM transactions
        WHERE type = 'withdrawal' -- 'withdraw' or 'withdrawal' - normalizing check
            AND status IN ('completed', 'approved')
            AND date_trunc('day', updated_at) = report_date -- Use processing date
        GROUP BY COALESCE(currency, 'USD')
    )
SELECT report_date,
    COALESCE(d.d_sum, 0.00) as total_deposits,
    COALESCE(w.w_sum, 0.00) as total_withdrawals,
    (
        COALESCE(d.d_sum, 0.00) - COALESCE(w.w_sum, 0.00)
    ) as net_flow,
    COALESCE(d.d_count, 0)::INTEGER as deposit_count,
    COALESCE(w.w_count, 0)::INTEGER as withdrawal_count,
    COALESCE(d.curr, w.curr, 'USD') as currency
FROM block_deposits d
    FULL OUTER JOIN block_withdrawals w ON d.curr = w.curr;
-- If no rows returned (no activity), return nothing or we could return zeros.
-- Current logic returns nothing if no activity.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;