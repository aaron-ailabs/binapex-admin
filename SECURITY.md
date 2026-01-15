# Security Checklist for Production Launch

## Database Security

- [ ] All tables have Row Level Security (RLS) enabled
- [ ] RLS policies tested for all user roles (authenticated, anon, admin)
- [ ] Foreign keys have indexes for performance
- [ ] Financial columns use `numeric` type (not `float`)
- [ ] Check constraints prevent negative amounts
- [ ] Storage buckets have proper access policies
- [ ] Database connection uses SSL
- [ ] Supabase service role key is never exposed to client

## Authentication & Authorization

- [ ] Supabase Auth rate limiting enabled
- [ ] Password reset emails have short expiration
- [ ] Email verification required before trading
- [ ] Admin routes protected with role checks
- [ ] JWT tokens validated on server-side
- [ ] Session timeout configured (default: 1 hour)
- [ ] OAuth redirect URLs whitelisted in Supabase

## Input Validation

- [ ] All forms use Zod schema validation
- [ ] Negative amounts rejected in deposits/withdrawals
- [ ] Leverage capped at 100x
- [ ] File uploads limited to 5MB
- [ ] Only allowed file types accepted (jpg, png, pdf)
- [ ] SQL injection prevented (using parameterized queries)
- [ ] XSS prevented (React escapes by default)

## API Security

- [ ] Edge Functions use environment variables for secrets
- [ ] CoinGecko API key stored in Supabase secrets
- [ ] Alpha Vantage API key stored in Supabase secrets
- [ ] Rate limiting on Edge Functions (10 req/sec)
- [ ] CORS configured for production domain only
- [ ] API responses don't leak sensitive data

## Edge Functions Deployment

```bash
# Set secrets
supabase secrets set COINGECKO_API_KEY=<YOUR_COINGECKO_API_KEY>
supabase secrets set ALPHA_VANTAGE_API_KEY=<YOUR_ALPHA_VANTAGE_API_KEY>

# Deploy all functions
supabase functions deploy market-data-cron
supabase functions deploy execute-order
supabase functions deploy check-liquidations
```

## Storage Security

- [ ] Receipts bucket allows authenticated uploads only
- [ ] QR codes bucket public read, admin write only
- [ ] File size limits enforced (5MB)
- [ ] Virus scanning enabled (Supabase Enterprise)
- [ ] Old files cleanup policy set (90 days)

## Frontend Security

- [ ] Environment variables use NEXT_PUBLIC_ prefix for client
- [ ] No sensitive keys in client-side code
- [ ] Error messages don't expose system details
- [ ] HTTPS enforced in production
- [ ] Security headers set in vercel.json
- [ ] Dependencies updated (npm audit)

## Monitoring & Logging

- [ ] Supabase logging enabled
- [ ] Admin actions logged to `admin_logs` table
- [ ] Failed login attempts monitored
- [ ] Suspicious trading patterns flagged
- [ ] Vercel Analytics installed
- [ ] Error tracking configured (optional: Sentry)

## Pre-Launch Tests

- [ ] Try to access admin pages as regular user (should fail)
- [ ] Try to modify another user's trade (should fail)
- [ ] Try SQL injection in form inputs (should be escaped)
- [ ] Try negative deposit amount (should be rejected)
- [ ] Try leverage over 100x (should be capped)
- [ ] Test password reset flow
- [ ] Test email verification flow
- [ ] Test mobile responsiveness
- [ ] Test with slow network (3G)
- [ ] Load test with 100+ concurrent users

## Compliance (if applicable)

- [ ] Privacy Policy page created
- [ ] Terms of Service page created
- [ ] Cookie consent banner (if EU users)
- [ ] KYC/AML procedures documented
- [ ] Data retention policy defined
- [ ] GDPR compliance checked (if EU)

## Disaster Recovery

- [ ] Database backups enabled (Supabase automatic)
- [ ] Backup restoration tested
- [ ] Incident response plan documented
- [ ] Admin emergency contact list
- [ ] Platform pause mechanism (circuit breaker)

## Post-Launch Monitoring

- [ ] Set up alerts for failed deposits
- [ ] Monitor Edge Function errors
- [ ] Track API rate limit hits
- [ ] Review admin logs daily
- [ ] Check for unusual trading patterns
- [ ] Monitor system performance metrics
