# Implementation Plan: UI Hardening & Standardization

This plan focuses on standardizing the Admin UI for operator efficiency, ensuring deterministic states, and hardening tables and the sidebar.

## Task A: Sidebar Guarantee
- **Logic Refinement**: Ensure `AdminSidebar` uses strictly route-based active states in `admin-sidebar.tsx`.
- **Reliability**: Verify active state survives hard refreshes and deep links by relying on `usePathname`.

## Task B, D, E, F: Table Standardization & Determinism
- **Enhance `AdminDataTable`**:
  - Add `isLoading`, `error`, `onRetry`, and `emptyMessage` props to `components/admin/data-table.tsx`.
  - Implement **Sticky Headers** using `sticky top-0 z-10 bg-muted/80 backdrop-blur-md`.
  - Increase **Data Density** by reducing vertical padding in `TableCell`.
  - Implement **Deterministic States**:
    - **Loading**: Render `AdminLoader` skeleton rows matching the column count.
    - **Success**: Render data rows.
    - **Empty**: Render a standardized `TableEmptyState` with explanatory copy.
    - **Error**: Render an error banner with a retry action.
- **Standardize Operational Tables**:
  - Refactor `WithdrawalApprovalList` and `TradeSettlementTable` to use `AdminDataTable`.
  - Ensure numeric columns (Amounts, IDs) are **right-aligned**.
  - Ensure status columns use standardized **Badges**.

## Task C: Dashboard "Recent Deposits" Upgrade
- **Table Conversion**: Replace the card list in `AdminDashboard.tsx` with a compact `Table`.
- **Layout**:
  - Columns: **User** (Email + slice of ID), **Amount** (Right-aligned, bold), **Status** (Badge), **Time** (Muted).
  - Interaction: Make rows clickable, navigating to `/admin/withdrawals` or the specific transaction.

## Task G: Actions & Micro-interactions
- **Consistency**: Standardize action icons (`Eye`, `CheckCircle`, `XCircle`).
- **Visibility**: Use `group` hover states in `AdminDataTable` to highlight action buttons on row hover for desktop.

## Task H: Responsiveness
- **Horizontal Scroll**: Ensure all table containers use `overflow-x-auto` to handle overflow on mobile without clipping or card-wrapping.
- **Sidebar**: Verify mobile overlay and collapse behavior.

## Task I: Visual Consistency Audit
- **Badges**: Standardize colors (Emerald = Positive, Red = Negative, Amber = Neutral/Pending).
- **Typography**: Enforce mono fonts for IDs and numeric values.

## Task J: Regression Check
- Verify sidebar highlights correctly across all 10+ routes.
- Confirm no layout shifts or infinite spinners under simulated slow network conditions.
- Test UI resilience with realtime disconnected.

## Key Components to Modify:
- `components/layout/admin-sidebar.tsx`
- `components/admin/data-table.tsx`
- `components/admin/admin-dashboard.tsx`
- `components/admin/users/users-table.tsx`
- `components/admin/withdrawal-approval-list.tsx`
- `components/admin/trade-settlement-table.tsx`
- `components/support-chat/admin-chat-panel.tsx`
- `components/admin/notifications/notification-center.tsx`
