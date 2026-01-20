# Implementation Plan: Binapex Admin Fixes

This plan addresses critical production issues focusing on stability, performance, and user experience without unnecessary refactoring.

## Task 1: Fix Supabase Realtime 401 (Critical)
**Objective**: Ensure reliable WebSocket connections by enforcing session validity before subscription.
1.  **Update Supabase Client Config**:
    *   Modify `lib/supabase/client.ts` to explicitly set `persistSession: true`, `autoRefreshToken: true`, and `detectSessionInUrl: true`.
2.  **Secure Subscriptions**:
    *   Refactor `hooks/use-admin-realtime.ts`, `hooks/use-support-chat.ts`, and `components/admin/withdrawal-approval-list.tsx`.
    *   Add a `useEffect` dependency on `session`.
    *   Guard: `if (!session) return;` inside subscription effects.
3.  **Connection Status UI**:
    *   Add a small "Realtime Status" indicator (Green/Red dot) in `components/layout/Header.tsx` or `Sidebar.tsx`.
    *   Log connection events (`CONNECTED`, `DISCONNECTED`, `CHANNEL_ERROR`) to console.

## Task 2: Fix Infinite Loading (Trades / Withdrawals)
**Objective**: Guarantee deterministic UI states (Loading -> Success/Empty/Error) with timeouts.
1.  **Create `useDeterministicFetch` Hook**:
    *   Inputs: fetch function, timeout (10s).
    *   Outputs: `data`, `status` ('idle', 'loading', 'success', 'empty', 'error'), `error`, `retry`.
    *   Logic: Handles timeouts and empty array checks.
2.  **Refactor Components**:
    *   `components/admin/trading/active-trades-table.tsx`
    *   `components/admin/withdrawal-approval-list.tsx`
    *   Apply the new hook to replace ad-hoc loading states.
    *   **Empty State**: Show "No active trades" / "No pending withdrawals" banner instead of spinner.
    *   **Error State**: Show error message with a "Retry" button.

## Task 3: Assets Table Performance
**Objective**: Prevent main-thread blocking by paginating the assets list.
1.  **Create `AssetsTable` Client Component**:
    *   Move row rendering from `app/admin/assets/page.tsx` to a new client component `components/admin/assets/AssetsTable.tsx`.
2.  **Implement Pagination**:
    *   Accept full `assets` array as props (Server Component fetches all).
    *   Implement client-side pagination (limit 50 per page).
    *   Add "Previous" / "Next" buttons.

## Task 4: Standardize Loading States
**Objective**: Consistent visual feedback across the admin panel.
1.  **Create Shared Component**:
    *   `components/ui/admin-loader.tsx`: A standard skeleton loader or spinner designed for tables/lists.
2.  **Replace Ad-hoc Loaders**:
    *   Update `app/loading.tsx`.
    *   Replace spinners in Trades, Withdrawals, and Assets pages with `<AdminLoader />`.

## Task 5: Error Visibility & Logging
**Objective**: Make errors visible to admins and traceable for developers.
1.  **Enhanced Error Handling**:
    *   Use `sonner` (already in project) to display API errors in a non-blocking toast.
2.  **Structured Logging**:
    *   Create a `logError` utility in `lib/utils.ts`.
    *   Log API failures: `[API Error] ${endpoint}: ${message} (Timestamp)`.
    *   Log Realtime failures: `[Realtime Error] ${channel}: ${status}`.

## Validation Steps
1.  **Realtime**: Verify no 401s in console and status indicator is green.
2.  **Loading**: Disconnect network and verify 10s timeout triggers error state on Trades page.
3.  **Assets**: Verify Assets table shows 50 rows and pagination works.
4.  **General**: Build project and check for type errors.
