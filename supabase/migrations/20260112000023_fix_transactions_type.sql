-- Migration: Fix Transactions Type Constraint
-- Date: 2026-01-12
-- Purpose: Allow both 'withdraw' and 'withdrawal' for backwards compatibility

-- Drop existing constraint if it exists
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Add new constraint with all possible transaction types
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_type_check
  CHECK (type IN (
    'deposit',
    'withdraw',
    'withdrawal',
    'bonus',
    'commission',
    'balance_adjustment',
    'trade_profit',
    'trade_loss',
    'referral_bonus',
    'cashback'
  ));

-- Add comment for documentation
COMMENT ON COLUMN public.transactions.type IS 'Transaction type - supports both withdraw and withdrawal for backwards compatibility';
