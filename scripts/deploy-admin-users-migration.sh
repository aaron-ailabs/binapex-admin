#!/bin/bash

# Deployment Script: Admin Users Table Migration
# This script deploys the admin_users migration to Supabase
# and runs the migration script for existing admins

set -e  # Exit on error

echo "=========================================="
echo "Admin Users Table Migration Deployment"
echo "=========================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   https://supabase.com/docs/guides/cli"
    exit 1
fi

# Check if logged in to Supabase
if ! supabase status &> /dev/null; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "   supabase login"
    exit 1
fi

echo "✅ Supabase CLI is installed and logged in"
echo ""

# Step 1: Link to Supabase project
echo "Step 1: Linking to Supabase project..."
echo "--------------------------------------"
read -p "Enter your Supabase project reference ID: " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Project reference ID is required"
    exit 1
fi

supabase link --project-ref "$PROJECT_REF"
echo "✅ Linked to project: $PROJECT_REF"
echo ""

# Step 2: Deploy migration
echo "Step 2: Deploying admin_users migration..."
echo "-------------------------------------------"
echo "This will create the admin_users table in your Supabase database."
echo ""

read -p "Are you sure you want to deploy? (y/N): " CONFIRM

if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

echo "Deploying migration..."
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ Migration deployed successfully"
else
    echo "❌ Migration deployment failed"
    exit 1
fi
echo ""

# Step 3: Run migration script
echo "Step 3: Running migration script..."
echo "------------------------------------"
echo "This will migrate existing admins from profiles.role to admin_users table."
echo ""

read -p "Do you want to run the migration script? (y/N): " RUN_MIGRATION

if [[ "$RUN_MIGRATION" =~ ^[Yy]$ ]]; then
    echo "Running migration script..."

    # Read the migration script
    MIGRATION_SCRIPT=$(cat scripts/migrate-admins-to-admin-users.sql)

    # Execute via psql (requires PostgreSQL client)
    if command -v psql &> /dev/null; then
        # Get connection string from environment or prompt
        if [ -z "$DATABASE_URL" ]; then
            read -p "Enter PostgreSQL connection string: " DATABASE_URL
        fi

        if [ -z "$DATABASE_URL" ]; then
            echo "❌ No database connection string provided"
            exit 1
        fi

        echo "$MIGRATION_SCRIPT" | psql "$DATABASE_URL"

        if [ $? -eq 0 ]; then
            echo "✅ Migration script executed successfully"
        else
            echo "❌ Migration script execution failed"
            exit 1
        fi
    else
        echo "⚠️  PostgreSQL client (psql) not found."
        echo "   Please run the migration script manually via Supabase SQL Editor:"
        echo "   https://supabase.com/dashboard/project/$PROJECT_REF/sql"
        echo ""
        echo "   Copy and execute the contents of:"
        echo "   binapex-admin/scripts/migrate-admins-to-admin-users.sql"
    fi
else
    echo "⚠️  Migration script skipped. Run it manually later."
fi
echo ""

# Step 4: Verify migration
echo "Step 4: Verifying migration..."
echo "-------------------------------"
echo "Running verification query..."
echo ""

VERIFICATION_QUERY="
SELECT
    'Total admins in profiles' as metric,
    COUNT(*) as count
FROM profiles
WHERE role = 'admin'
UNION ALL
SELECT
    'Total admins in admin_users' as metric,
    COUNT(*) as count
FROM admin_users;
"

if command -v psql &> /dev/null && [ -n "$DATABASE_URL" ]; then
    echo "$VERIFICATION_QUERY" | psql "$DATABASE_URL"
else
    echo "⚠️  Cannot verify automatically."
    echo "   Please run this query in Supabase SQL Editor:"
    echo ""
    echo "$VERIFICATION_QUERY"
fi
echo ""

# Step 5: Smoke test instructions
echo "Step 5: Smoke Test Instructions"
echo "--------------------------------"
echo ""
echo "1. Deploy admin app to Vercel:"
echo "   cd binapex-admin && vercel --prod"
echo ""
echo "2. Deploy trader app to Vercel:"
echo "   cd binapex-trader && vercel --prod"
echo ""
echo "3. Test admin access:"
echo "   - Access: https://admin.binapex.my/login"
echo "   - Login with admin credentials"
echo "   - Verify admin dashboard loads"
echo ""
echo "4. Test trader access:"
echo "   - Access: https://www.binapex.my/login"
echo "   - Login with trader credentials"
echo "   - Verify no admin routes accessible"
echo "   - Verify /admin redirects to admin.binapex.my"
echo ""
echo "5. Test realtime subscriptions:"
echo "   - Login to trader app"
echo "   - Check browser console for WebSocket errors"
echo "   - Verify prices update in real-time"
echo ""
echo "6. Test environment variables:"
echo "   - Remove NEXT_PUBLIC_SUPABASE_URL from .env.local"
echo "   - Restart dev server"
echo "   - Verify app fails with clear error message"
echo ""

echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Run P2: Add session guards to remaining trader components"
echo "2. Run P3: Add auth boundary tests"
echo ""
echo "Documentation: binapex-admin/scripts/ADMIN_USERS_MIGRATION_README.md"
