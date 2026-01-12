-- Migration: Create Trade Settlement Audit Logs Table
-- Date: 2026-01-12
-- Purpose: Track all binary trade settlements with admin rationale and supporting documents

CREATE TABLE IF NOT EXISTS public.trade_settlement_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  outcome TEXT NOT NULL CHECK (outcome IN ('WIN', 'LOSS')),
  rationale TEXT,
  supporting_document_url TEXT,
  final_price DECIMAL(18,8),
  payout_amount DECIMAL(18,8),
  profit_loss DECIMAL(18,8),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trade_settlement_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only access policies
DROP POLICY IF EXISTS "Admins can view settlement logs" ON public.trade_settlement_audit_logs;
CREATE POLICY "Admins can view settlement logs"
  ON public.trade_settlement_audit_logs FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can create settlement logs" ON public.trade_settlement_audit_logs;
CREATE POLICY "Admins can create settlement logs"
  ON public.trade_settlement_audit_logs FOR INSERT
  WITH CHECK (public.is_admin());

-- Users can view their own settlement history
DROP POLICY IF EXISTS "Users can view own settlement logs" ON public.trade_settlement_audit_logs;
CREATE POLICY "Users can view own settlement logs"
  ON public.trade_settlement_audit_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_settlement_audit_order_id ON public.trade_settlement_audit_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_settlement_audit_user_id ON public.trade_settlement_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_settlement_audit_admin_id ON public.trade_settlement_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_settlement_audit_created_at ON public.trade_settlement_audit_logs(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE public.trade_settlement_audit_logs IS 'Audit trail for all binary options trade settlements';
COMMENT ON COLUMN public.trade_settlement_audit_logs.order_id IS 'Reference to the settled order';
COMMENT ON COLUMN public.trade_settlement_audit_logs.outcome IS 'Settlement result: WIN or LOSS';
COMMENT ON COLUMN public.trade_settlement_audit_logs.rationale IS 'Admin explanation for settlement decision';
COMMENT ON COLUMN public.trade_settlement_audit_logs.supporting_document_url IS 'URL to price chart or other supporting evidence';
COMMENT ON COLUMN public.trade_settlement_audit_logs.final_price IS 'Market price at expiration time';
COMMENT ON COLUMN public.trade_settlement_audit_logs.payout_amount IS 'Total amount paid out to user (0 for LOSS)';
COMMENT ON COLUMN public.trade_settlement_audit_logs.profit_loss IS 'Net profit or loss for the user';
