# Deployment Guide for Binapex

## Prerequisites

1. Vercel account
2. Supabase project (with all migrations applied)
3. Domain name (optional: binapex.com)
4. API Keys:
   - CoinGecko: set via Supabase secrets
   - Alpha Vantage: set via Supabase secrets

## Step 1: Database Setup

### Apply All Migrations

```bash
# Connect to your Supabase project
supabase link --project-ref your-project-ref

# Push all migrations
supabase db push
```

### Run Security Audit

```bash
# Execute security audit script
psql $DATABASE_URL -f scripts/006_security_audit.sql
```

### Enable Realtime

In Supabase Dashboard:
1. Go to Database → Replication
2. Enable replication for tables: `assets`, `trades`, `transactions`, `tickets`

### Configure Storage

1. Create buckets:
   - `receipts` (private)
   - `qr-codes` (public read)
2. Set size limits: 5MB max per file
3. Allowed file types: `image/jpeg`, `image/png`, `application/pdf`

## Step 2: Edge Functions Deployment

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Set secrets
supabase secrets set COINGECKO_API_KEY=<YOUR_COINGECKO_API_KEY>
supabase secrets set ALPHA_VANTAGE_API_KEY=<YOUR_ALPHA_VANTAGE_API_KEY>

# Deploy functions
supabase functions deploy market-data-cron
supabase functions deploy execute-order
supabase functions deploy check-liquidations

# Set up cron triggers (in Supabase Dashboard)
# 1. Go to Database → Functions → Cron Jobs
# 2. Create job: market_data_update
#    - Schedule: */10 * * * * (every 10 seconds)
#    - Function: market-data-cron
# 3. Create job: liquidation_check
#    - Schedule: */30 * * * * (every 30 seconds)
#    - Function: check-liquidations
```

## Step 3: Frontend Deployment (Vercel)

### Via Vercel Dashboard

1. Import GitHub repository
2. Framework: Next.js
3. Build Command: `npm run build`
4. Output Directory: `.next`
5. Install Command: `npm install`

### Environment Variables

Add these in Vercel Project Settings → Environment Variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
```

### Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## Step 4: Domain Configuration

### In Vercel

1. Go to Project Settings → Domains
2. Add custom domain: `binapex.com`
3. Configure DNS:
   - Type: `A` → Value: `76.76.21.21`
   - Type: `CNAME` → Value: `cname.vercel-dns.com`

### In Supabase

1. Go to Authentication → URL Configuration
2. Site URL: `https://binapex.com`
3. Redirect URLs:
   - `https://binapex.com/**`
   - `http://localhost:3000/**` (for development)

## Step 5: Seed Initial Data

```bash
# Run seed script
psql $DATABASE_URL -f scripts/003_seed_initial_data.sql
```

This creates:
- Sample assets (BTC, ETH, EUR/USD, Gold)
- Platform bank accounts
- Membership tier configurations

## Step 6: Create First Admin User

```sql
-- In Supabase SQL Editor
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@binapex.com';
```

## Step 7: Post-Deployment Verification

### Health Checks

- [ ] Landing page loads: `https://binapex.com`
- [ ] Can create account
- [ ] Email verification works
- [ ] Can login
- [ ] Dashboard loads
- [ ] Market prices update (check console)
- [ ] Can view trading page
- [ ] Admin can access `/admin`
- [ ] Regular users blocked from `/admin`

### Test Trading Flow

1. Login as regular user
2. Navigate to Deposit page
3. Upload receipt
4. Login as admin
5. Approve deposit in `/admin/finance`
6. Return to user account
7. Verify balance updated
8. Place a test trade
9. Verify trade appears in history

### Monitor Edge Functions

```bash
# View logs
supabase functions logs market-data-cron
supabase functions logs execute-order
supabase functions logs check-liquidations
```

## Step 8: Performance Optimization

### Enable Caching

In `next.config.mjs`:

```javascript
const nextConfig = {
  images: {
    domains: ['your-project.supabase.co'],
  },
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 'no-store' },
      ],
    },
  ],
}
```

### Database Optimization

```sql
-- Add more indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_trades_user_status ON trades(user_id, status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, type, status);
CREATE INDEX IF NOT EXISTS idx_tickets_status_created ON tickets(status, created_at DESC);
```

## Rollback Plan

If issues occur:

1. Revert Vercel deployment:
   ```bash
   vercel rollback
   ```

2. Pause Edge Functions:
   ```bash
   supabase functions delete market-data-cron
   ```

3. Database rollback:
   ```bash
   supabase db reset
   ```

## Support Contacts

- Vercel Support: vercel.com/support
- Supabase Support: supabase.com/support
- DNS Issues: Your domain registrar

## Success Metrics

After 24 hours, verify:
- Zero 500 errors in Vercel logs
- Edge Functions running without errors
- Database CPU < 50%
- Response time < 2 seconds
- No security alerts
```

```typescript file="" isHidden
