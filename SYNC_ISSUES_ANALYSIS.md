# Trader Portal Data Sync Issues - Analysis & Fixes

**Date**: 2026-01-12
**Issue**: Data from trader portal (trades, deposits, withdrawals) not syncing to admin portal

---

## 🔍 **ROOT CAUSES IDENTIFIED**

### 1. **CRITICAL: Missing Admin RLS Policies on Orders Table**

**Problem**: Admins cannot view trader orders because Row Level Security policies are missing after table rename.

**Details**:
- `20251218000001_security_hardening.sql` created policies on `limit_orders` table with admin access: `USING (auth.uid() = user_id OR public.is_admin())`
- `20251218000000_reconstruct_schema.sql` renamed `limit_orders` → `orders`
- **The policies were likely dropped or not migrated** when the table was renamed
- Current policy on `orders` only allows: `USING (auth.uid() = user_id)` - **no admin access!**

**Impact**:
- ❌ Admin dashboard cannot query `SELECT * FROM orders` - RLS blocks it
- ❌ TradeSettlementTable.tsx shows no trades even if they exist
- ❌ Admin cannot monitor or settle binary options trades

**Fix Required**:
```sql
-- Add admin access to orders policies
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- Add admin update policy for settlement
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE USING (public.is_admin());
```

---

### 2. **Schema Mismatch: Orders Table Missing Binary Trading Columns**

**Problem**: Admin interface expects binary trading columns that don't exist in orders table.

**Admin Interface Expects** (`components/admin/trade-settlement-table.tsx` lines 23-34):
```typescript
interface Trade {
  id: string
  user_id: string
  asset_symbol: string        // ❌ Missing
  direction: 'UP' | 'DOWN'    // ❌ Missing
  amount: number              // ❌ Missing (table has 'size')
  payout_rate: number         // ❌ Missing
  status: 'OPEN' | 'WIN' | 'LOSS'  // ✅ Exists (added in 20260112000004)
  created_at: string          // ✅ Exists
  end_time: string            // ❌ Missing
  type: 'binary'              // ✅ Should exist
}
```

**Current Orders Table Schema** (`20240101000000_init_trade_schema.sql`):
```sql
CREATE TABLE public.orders (
  id UUID PRIMARY KEY,
  user_id UUID,
  asset_id UUID,              -- Uses asset_id (FK), not asset_symbol (TEXT)
  side TEXT,                  -- 'buy'/'sell', not 'UP'/'DOWN'
  type TEXT,                  -- 'market'/'limit', needs 'binary' support
  price NUMERIC,              -- Strike price? Or entry price?
  size NUMERIC,               -- Investment amount
  leverage NUMERIC,           -- Being reused for payout_rate
  status TEXT,                -- ✅ Extended to support 'OPEN'/'WIN'/'LOSS'
  created_at TIMESTAMPTZ,     -- ✅ Exists
  updated_at TIMESTAMPTZ      -- ✅ Exists
)
```

**Partially Added Columns**:
- `expiry_at TIMESTAMPTZ` - Added in `20260112000002_add_cron.sql`
- But missing: `asset_symbol`, `direction`, `amount`, `payout_rate`, `end_time`, `entry_price`, `exit_price`, `profit_loss`

**Multiple RPC Function Versions Use Different Schemas**:

1. **Version 1** (`20260112000003_update_binary_rpc.sql`):
   - Uses: `symbol`, `side`, `type='market'`, `size`, `entry_price`, `leverage` (as payout_rate)

2. **Version 2** (`20260112000006_unify_binary_trading.sql`):
   - Uses: `asset_symbol`, `direction`, `amount`, `strike_price`, `payout_rate`, `end_time`, `expiry_at`
   - Queries `wallets` with `asset = 'USD'` (but wallets uses `asset`, not `asset_symbol` after migration)

3. **Version 3** (`20260112000007_fix_binary_trade_ambiguity.sql`):
   - Similar to Version 2

**Impact**:
- ❌ RPC functions fail with "column does not exist" errors
- ❌ Admin UI queries fail or return incomplete data
- ❌ Binary trades from trader portal cannot be stored properly

**Fix Required**: Create comprehensive migration to add ALL missing columns to orders table.

---

### 3. **Schema Inconsistency: Wallets Table Column Names**

**Problem**: Migrations renamed columns but code/RPC functions use old names.

**Column Name Changes** (`20251218000000_reconstruct_schema.sql`):
```sql
-- OLD NAME          → NEW NAME
asset_symbol         → asset
available_balance    → balance
-- Removed: total_balance (was generated column)
-- Kept: locked_balance
```

**But RPC Functions Still Use**:
- `execute_binary_trade` (20260112000006) uses: `wallets.balance` and `wallets.asset` ✅ Correct
- Other code may still use: `asset_symbol`, `available_balance` ❌ Wrong

**Impact**:
- ⚠️ Potential runtime errors if code uses old column names
- ⚠️ Need to verify all queries use new names

---

### 4. **Missing Audit Table: `trade_settlement_audit_logs`**

**Problem**: Settlement RPC function tries to insert into non-existent table.

**RPC Function** (`settle_binary_order` in 20260112000006_unify_binary_trading.sql, lines 138-155):
```sql
INSERT INTO public.trade_settlement_audit_logs (
  order_id, user_id, admin_id, outcome,
  rationale, supporting_document_url, final_price
) VALUES (...)
```

**But Table Doesn't Exist**: No migration creates `trade_settlement_audit_logs` table.

**Impact**:
- ❌ Settlement RPC function fails with "relation does not exist" error
- ❌ Admins cannot settle trades
- ❌ No audit trail for trade settlements

**Fix Required**:
```sql
CREATE TABLE IF NOT EXISTS public.trade_settlement_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  outcome TEXT NOT NULL CHECK (outcome IN ('WIN', 'LOSS')),
  rationale TEXT,
  supporting_document_url TEXT,
  final_price DECIMAL(18,8),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 5. **Transactions Table Status Values Mismatch**

**Problem**: Code uses 'withdrawal' but constraint may expect 'withdraw'.

**Admin Queries** (`lib/supabase/admin-queries.ts`, line 18):
```typescript
.eq("type", "withdrawal")  // Uses 'withdrawal'
```

**But Consolidated Schema** (`99999999999999_consolidated_schema.sql`, line 92):
```sql
type VARCHAR(20) CHECK (type IN ('deposit', 'withdraw', 'bonus', 'commission', 'balance_adjustment'))
```

**Possible Issue**: Should be `'withdraw'` not `'withdrawal'`.

**However**: Migration `20251222000001_fix_transaction_type_constraint.sql` might have fixed this.

**Fix Required**: Verify constraint includes both 'withdraw' and 'withdrawal' for backwards compatibility.

---

### 6. **Missing `type` Column on Orders for Binary/Regular Trades**

**Problem**: Query filters by `type = 'binary'` but initial schema only has `type IN ('market', 'limit')`.

**Admin Query** (`components/admin/trade-settlement-table.tsx`, line 54):
```typescript
.from('orders')
.eq('type', 'binary')  // Needs type constraint to include 'binary'
```

**Initial Schema** (20240101000000_init_trade_schema.sql):
```sql
type TEXT CHECK (type IN ('market', 'limit'))  -- No 'binary' option
```

**Status**: Need to verify if type constraint was updated to include 'binary'.

**Fix Required**:
```sql
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_type_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_type_check
  CHECK (type IN ('market', 'limit', 'binary', 'stop_limit'));
```

---

## 📊 **MISSING COLUMNS SUMMARY**

### Orders Table Needs These Columns for Binary Trading:

| Column Name | Type | Description | Status |
|------------|------|-------------|--------|
| `asset_symbol` | TEXT | Symbol (e.g., 'BTC-USD') | ❌ Missing |
| `direction` | TEXT | 'UP' or 'DOWN' for binary | ❌ Missing |
| `amount` | DECIMAL | Investment amount | ❌ (exists as 'size') |
| `payout_rate` | DECIMAL | Payout percentage | ❌ (stored in 'leverage'?) |
| `strike_price` | DECIMAL | Entry price for binary | ❌ (exists as 'price'?) |
| `entry_price` | DECIMAL | Actual entry price | ❌ Missing |
| `exit_price` | DECIMAL | Settlement price | ❌ Missing |
| `end_time` | TIMESTAMPTZ | When trade closes | ❌ Missing |
| `expiry_at` | TIMESTAMPTZ | Expiration time | ✅ Added (20260112000002) |
| `profit_loss` | DECIMAL | Calculated P&L | ❌ Missing |
| `closed_at` | TIMESTAMPTZ | Settlement timestamp | ❌ Missing |
| `type` | TEXT | Need 'binary' in constraint | ⚠️ Verify |

---

## 🔧 **COMPREHENSIVE FIX PLAN**

### Migration 1: Fix Orders Table Schema for Binary Trading

```sql
-- File: supabase/migrations/20260112000020_fix_orders_schema_binary.sql

-- 1. Add missing binary trading columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS asset_symbol TEXT,
  ADD COLUMN IF NOT EXISTS direction TEXT CHECK (direction IN ('UP', 'DOWN')),
  ADD COLUMN IF NOT EXISTS amount DECIMAL(18,8),
  ADD COLUMN IF NOT EXISTS payout_rate DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS strike_price DECIMAL(18,8),
  ADD COLUMN IF NOT EXISTS entry_price DECIMAL(18,8),
  ADD COLUMN IF NOT EXISTS exit_price DECIMAL(18,8),
  ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS profit_loss DECIMAL(18,8),
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- 2. Update type constraint to include 'binary'
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_type_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_type_check
  CHECK (type IN ('market', 'limit', 'binary', 'stop_limit'));

-- 3. Migrate existing data if needed
-- If 'size' was used for investment amount, copy to 'amount'
UPDATE public.orders SET amount = size WHERE amount IS NULL AND type = 'binary';

-- If 'leverage' was used for payout_rate, copy it
UPDATE public.orders SET payout_rate = leverage WHERE payout_rate IS NULL AND type = 'binary';

-- If 'price' was used for strike_price, copy it
UPDATE public.orders SET strike_price = price WHERE strike_price IS NULL AND type = 'binary';

-- 4. Get asset_symbol from asset_id
UPDATE public.orders o
SET asset_symbol = a.symbol
FROM public.assets a
WHERE o.asset_id = a.id AND o.asset_symbol IS NULL;

-- 5. Map side to direction for binary trades
UPDATE public.orders
SET direction = CASE WHEN side = 'buy' THEN 'UP' ELSE 'DOWN' END
WHERE type = 'binary' AND direction IS NULL;
```

### Migration 2: Create Audit Table

```sql
-- File: supabase/migrations/20260112000021_create_settlement_audit_table.sql

CREATE TABLE IF NOT EXISTS public.trade_settlement_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  outcome TEXT NOT NULL CHECK (outcome IN ('WIN', 'LOSS')),
  rationale TEXT,
  supporting_document_url TEXT,
  final_price DECIMAL(18,8),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.trade_settlement_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can view settlement logs"
  ON public.trade_settlement_audit_logs FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can create settlement logs"
  ON public.trade_settlement_audit_logs FOR INSERT
  WITH CHECK (public.is_admin());

-- Create index for performance
CREATE INDEX idx_settlement_audit_order_id ON public.trade_settlement_audit_logs(order_id);
CREATE INDEX idx_settlement_audit_user_id ON public.trade_settlement_audit_logs(user_id);
```

### Migration 3: Fix Orders RLS Policies for Admin Access

```sql
-- File: supabase/migrations/20260112000022_fix_orders_rls_admin.sql

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Public can view OPEN orders" ON public.orders;

-- Create new policies with admin access
CREATE POLICY "Users and admins can view orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can create own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders, admins can update all"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Admins can delete orders"
  ON public.orders FOR DELETE
  USING (public.is_admin());
```

### Migration 4: Fix Transactions Type Constraint

```sql
-- File: supabase/migrations/20260112000023_fix_transactions_type.sql

-- Allow both 'withdraw' and 'withdrawal' for backwards compatibility
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('deposit', 'withdraw', 'withdrawal', 'bonus', 'commission', 'balance_adjustment', 'trade_profit', 'trade_loss'));
```

### Migration 5: Add Missing RLS Policies for Transactions

```sql
-- File: supabase/migrations/20260112000024_transactions_rls_admin.sql

-- Ensure admins can see all transactions
DROP POLICY IF EXISTS "Users view own transactions" ON public.transactions;
CREATE POLICY "Users and admins view transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- Admins can update transaction status (approve/reject)
DROP POLICY IF EXISTS "Admins update transactions" ON public.transactions;
CREATE POLICY "Admins update transactions"
  ON public.transactions FOR UPDATE
  USING (public.is_admin());
```

---

## 🚀 **IMPLEMENTATION STEPS**

### Step 1: Apply Database Migrations (in order)

```bash
# Apply migrations in sequence
psql $DATABASE_URL -f supabase/migrations/20260112000020_fix_orders_schema_binary.sql
psql $DATABASE_URL -f supabase/migrations/20260112000021_create_settlement_audit_table.sql
psql $DATABASE_URL -f supabase/migrations/20260112000022_fix_orders_rls_admin.sql
psql $DATABASE_URL -f supabase/migrations/20260112000023_fix_transactions_type.sql
psql $DATABASE_URL -f supabase/migrations/20260112000024_transactions_rls_admin.sql

# Or via Supabase CLI
supabase db push
```

### Step 2: Update RPC Functions

Update `execute_binary_trade` to use correct column names:
```sql
-- File: supabase/migrations/20260112000025_fix_binary_trade_rpc.sql

CREATE OR REPLACE FUNCTION public.execute_binary_trade(
  p_user_id UUID,
  p_amount DECIMAL,
  p_asset_symbol TEXT,
  p_direction TEXT,
  p_duration_seconds INTEGER,
  p_strike_price DECIMAL,
  p_payout_rate DECIMAL
) RETURNS JSONB AS $$
DECLARE
  v_order_id UUID;
  v_expiry TIMESTAMPTZ;
  v_balance DECIMAL;
BEGIN
  -- Check balance from wallets (USD)
  SELECT balance INTO v_balance
  FROM public.wallets
  WHERE user_id = p_user_id AND asset = 'USD';

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Deduct balance
  UPDATE public.wallets
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id AND asset = 'USD';

  -- Calculate expiry
  v_expiry := NOW() + (p_duration_seconds || ' seconds')::INTERVAL;

  -- Insert order with ALL required columns
  INSERT INTO public.orders (
    user_id, asset_symbol, direction, amount, strike_price,
    payout_rate, type, status, expiry_at, end_time, entry_price,
    created_at
  ) VALUES (
    p_user_id, p_asset_symbol, p_direction, p_amount, p_strike_price,
    p_payout_rate, 'binary', 'OPEN', v_expiry, v_expiry, p_strike_price,
    NOW()
  ) RETURNING id INTO v_order_id;

  -- Create admin notification
  INSERT INTO admin_notifications (user_id, type, message)
  VALUES (
    p_user_id, 'trade',
    concat('New Binary Trade: ', p_asset_symbol, ' ', p_direction, ' $', p_amount)
  );

  RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'expiry_at', v_expiry);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 3: Verify Real-time Sync

Ensure orders table is in realtime publication:
```sql
-- Add orders to realtime if not already added
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
```

### Step 4: Test Data Flow

1. **From Trader Portal**: Place a binary trade
2. **Check Database**: `SELECT * FROM orders WHERE type = 'binary' ORDER BY created_at DESC LIMIT 5;`
3. **Check Admin Portal**: Verify trade appears in "Active Trades" tab
4. **Test Settlement**: Settle a trade as WIN/LOSS
5. **Check Audit Log**: `SELECT * FROM trade_settlement_audit_logs ORDER BY created_at DESC LIMIT 5;`

---

## ✅ **VERIFICATION CHECKLIST**

After applying all fixes, verify:

- [ ] Admin can see all orders: `SELECT COUNT(*) FROM orders;` (should not error)
- [ ] Binary trades have all required columns populated
- [ ] Settlement function works without errors
- [ ] Audit logs are created on settlement
- [ ] Admin dashboard shows pending trades
- [ ] Admin dashboard shows pending deposits/withdrawals
- [ ] Transactions can be approved/rejected
- [ ] Real-time updates work (trade appears immediately after creation)
- [ ] No RLS policy violations in logs

---

## 🎯 **QUICK FIX FOR IMMEDIATE TESTING**

If you need to test immediately without migrations, temporarily disable RLS:

```sql
-- ⚠️ ONLY FOR TESTING - NOT FOR PRODUCTION
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
```

Then re-enable after adding proper policies.

---

## 📝 **ADDITIONAL NOTES**

1. **Consolidate Schema**: The `99999999999999_consolidated_schema.sql` file is outdated and doesn't reflect the current schema after all migrations. Consider regenerating it.

2. **Migration Order**: Migrations have non-sequential timestamps which makes it hard to determine correct order. Consider renaming them sequentially.

3. **Testing Strategy**: Set up integration tests to verify data flow from trader portal → database → admin portal.

4. **Documentation**: Update API documentation to reflect current schema and available endpoints.

---

**End of Analysis**
