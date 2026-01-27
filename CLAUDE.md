# CLAUDE.md - AI Continuity Document

## Project: BINAPEX Trading Platform

### Current State (2026-01-27)

**Active Focus**: Trader Portal Verification (Phase 3-7)

---

## Critical Fixes Applied This Session

### 1. Server-Side Session Hydration (CRITICAL)

**Files Modified**:

- `binapex-trader/app/layout.tsx` - Added `await createClient()` + `getSession()` + `initialSession` prop
- `binapex-trader/contexts/auth-context.tsx` - Added `initialSession` prop, initializes state from server session

**Problem**: Client-side `AuthContext` failed to rehydrate session from HttpOnly cookies, causing "No user session found" even when logged in.

**Solution**: Fetch session server-side in `RootLayout` and pass to `AuthProvider` for immediate hydration.

### 2. MaintenanceGuard Graceful Degradation

**File**: `binapex-trader/components/maintenance-guard.tsx`

**Problem**: 401 error on `system_settings` table blocked entire UI.

**Solution**: Wrapped fetch in `try/finally` to ensure `setChecking(false)` always runs.

### 3. useUserPortfolio Loading Fix

**File**: `binapex-trader/hooks/use-user-portfolio.ts`

**Problem**: Hook initialized with `isLoading: true` but never set to `false` if `user` was null.

**Solution**: Added explicit `setData(prev => ({ ...prev, isLoading: false }))` in `useEffect` when user is null.

---

## Trader Verification Progress

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Auth & Session | ✅ Complete | Login, refresh, multi-tab verified |
| 2. Permission Isolation | ✅ Complete | Admin lockout, API boundary verified |
| 3. Core Trading Flow | ✅ Complete | Deal discovery, order placement verified |
| 4.1 Realtime (Live Updates) | ✅ Complete | WebSocket connects, no CHANNEL_ERROR |
| 4.2 Realtime (Network Interruption) | ⬜ Pending | Manual test recommended |
| 5. Data Integrity | ⬜ Pending | Balance accuracy, double-submit protection |
| 6. UX Failure Handling | ⬜ Pending | Backend failure recovery |
| 7. Performance | ⬜ Pending | Load time, memory leaks |

---

## Key Files for Continuation

### Trader App (`binapex-trader/`)

- `app/layout.tsx` - Root layout with session hydration
- `contexts/auth-context.tsx` - Auth state management
- `components/maintenance-guard.tsx` - Maintenance mode check
- `hooks/use-user-portfolio.ts` - Portfolio data hook
- `hooks/useMarketData.ts` - Realtime price updates
- `tests/trader_verification_sim.spec.ts` - Playwright verification tests

### Admin App (`binapex-admin/`)

- All Phase 6-8 admin verification complete
- User: `admin88@binapex.my` / `Admin8888@`

### Supabase

- Project: `kzpbaacqhpszizgsyflc`
- RLS policies hardened, Realtime publication fixed

---

## Test Commands

```bash
# Trader verification (Phase 3+)
cd binapex-trader
npx playwright test tests/trader_verification_sim.spec.ts --project=chromium --grep "Phase 3"

# Admin verification
cd binapex-admin
npx playwright test tests/manual_verification_sim.spec.ts --project=chromium
```

---

## Known Issues

1. **Playwright Timeout**: TradingView widget causes slow page load, leading to test timeouts. Consider adding `domcontentloaded` wait instead of `load`.

2. **system_settings 401**: RLS policy blocks trader access. Graceful degradation implemented, but consider adding SELECT policy for authenticated users.

---

## Next Steps for AI

1. Run Phase 4.2 (Network Interruption) test manually or automate
2. Implement Phase 5 (Data Integrity) tests
3. Verify Phase 6 (UX Failure Handling)
4. Performance audit (Phase 7)
5. Generate final verification report
