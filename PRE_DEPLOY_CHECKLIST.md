# Pre-Deployment Checklist

**CRITICAL:** This checklist must be completed before **EVERY** deployment to production.

## 1. Code Safety & Integrity
- [ ] **No Unbounded Queries:** Verify all `select` queries on `trades`, `withdrawals`, `users` have `.limit()` and `.order()`.
- [ ] **Type Check:** Run `npm run type-check` (or equivalent) and ensure 0 errors.
- [ ] **Lint:** Run `npm run lint` and ensure 0 errors.
- [ ] **Build:** Run `npm run build` locally to catch compilation issues.

## 2. Admin Critical Path Verification
*Manually verify these pages in a staging/preview environment:*

### Authentication
- [ ] **Login:** Access `/admin/login`. Verify redirect to `/admin` if already logged in.
- [ ] **Access Control:** Try accessing `/admin` from an Incognito window (should redirect to login).
- [ ] **Role Check:** Verify a non-admin user (trader) is redirected to `/dashboard` if attempting to access `/admin`.

### Core Operations
- [ ] **Overview:** Dashboard loads stats without error.
- [ ] **Trades:** `/admin/trades` loads recent trades. Realtime updates work (simulate a trade if possible).
- [ ] **Withdrawals:** `/admin/finance` loads pending withdrawals.
- [ ] **Users:** `/admin/users` loads user list. Search functions.
- [ ] **Chat:** Support chat panel opens and connects.

## 3. Realtime & Observability
- [ ] **Realtime Fallback:** Disconnect network briefly. Verify data refreshes automatically (within 30-60s) or upon reconnect.
- [ ] **Error Logging:** Check Sentry (or logs) for new errors during verification.
- [ ] **Performance:** No "infinite loading" states on key pages.

## 4. Database Safety
- [ ] **Migrations:** All new migrations applied to staging.
- [ ] **RLS:** Row Level Security policies are active. Admin table access is restricted.

---
*Signed off by:* _________________ Date: _______________
