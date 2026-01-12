#!/bin/bash

# Apply Sync Fix Migrations
# Usage: ./apply-migrations.sh "your_postgres_connection_string"

if [ -z "$1" ]; then
  echo "❌ Error: No connection string provided"
  echo ""
  echo "Usage: ./apply-migrations.sh 'postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres'"
  echo ""
  echo "Get your connection string from:"
  echo "Supabase Dashboard → Settings → Database → Connection string"
  echo ""
  exit 1
fi

DB_URL="$1"

echo "🚀 Applying Trader Portal Sync Fix Migrations..."
echo ""

MIGRATIONS=(
  "20260112000020_fix_orders_schema_binary.sql"
  "20260112000021_create_settlement_audit_table.sql"
  "20260112000022_fix_orders_rls_admin.sql"
  "20260112000023_fix_transactions_type.sql"
  "20260112000024_transactions_rls_admin.sql"
  "20260112000025_fix_binary_trade_rpc.sql"
  "20260112000026_enable_realtime_sync.sql"
)

FAILED=0
SUCCESS=0

for migration in "${MIGRATIONS[@]}"; do
  echo "📦 Applying: $migration"

  if psql "$DB_URL" -f "supabase/migrations/$migration" > /dev/null 2>&1; then
    echo "   ✅ Success"
    ((SUCCESS++))
  else
    echo "   ❌ Failed"
    ((FAILED++))
    echo "   Running with verbose output:"
    psql "$DB_URL" -f "supabase/migrations/$migration"
  fi
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Results: $SUCCESS succeeded, $FAILED failed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILED -eq 0 ]; then
  echo "✅ All migrations applied successfully!"
  echo ""
  echo "🎯 Next Steps:"
  echo "1. Test admin dashboard: http://localhost:3000/admin/trades"
  echo "2. Verify trades are visible"
  echo "3. Test trade settlement"
  echo "4. Check deposit/withdrawal approval"
  exit 0
else
  echo "⚠️  Some migrations failed. Please check errors above."
  exit 1
fi
