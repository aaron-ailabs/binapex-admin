# 📖 Binapex Admin Portal - Complete Workflow Guide

**Version**: 1.0
**Last Updated**: 2026-01-12
**Platform**: Next.js 16 + Supabase + React 19

---

## 🎯 TABLE OF CONTENTS

1. [Admin Login & Authentication](#admin-login--authentication)
2. [Dashboard Overview](#dashboard-overview)
3. [User Management Workflow](#user-management-workflow)
4. [Financial Operations](#financial-operations)
5. [Trade Management](#trade-management)
6. [Support System](#support-system)
7. [Settings & Configuration](#settings--configuration)
8. [Notification System](#notification-system)
9. [Daily Admin Tasks](#daily-admin-tasks)
10. [Best Practices](#best-practices)

---

## 🔐 ADMIN LOGIN & AUTHENTICATION

### **Login Process**

**URL**: `https://your-domain.com/admin/login`

**Steps**:
1. Navigate to admin login page
2. Enter admin email (must be marked as admin in database)
3. Enter password
4. System validates credentials via Supabase Auth
5. Checks `profiles.role = 'admin'`
6. Redirects to `/admin/dashboard` on success

**Security Layers**:
- ✅ Edge Middleware authentication check (runs first)
- ✅ AdminRoute component server-side verification
- ✅ Database RLS policies (Row Level Security)
- ✅ All admin actions require `is_admin()` check

**Troubleshooting**:
```sql
-- Check if user has admin role
SELECT id, email, role FROM profiles WHERE email = 'admin@example.com';

-- Grant admin role (if needed)
UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';
```

---

## 📊 DASHBOARD OVERVIEW

**Route**: `/admin/dashboard`

### **Key Metrics Displayed**

1. **Total Users** 👥
   - Shows count of all registered users
   - Fetched from `profiles` table

2. **Pending Deposits** 💰
   - Count of transactions with `type = 'deposit'` and `status = 'pending'`
   - Requires immediate attention

3. **Pending Withdrawals** 💸
   - Count of transactions with `type = 'withdrawal'` and `status = 'pending'`
   - Critical for user satisfaction

4. **Recent Activity** 📈
   - Last 10 transactions across all types
   - Shows user name, transaction type, amount, and status

### **Real-time Updates**

Dashboard stats update automatically via:
- Supabase Realtime subscriptions
- WebSocket connections
- Automatic refresh on transaction changes

---

## 👥 USER MANAGEMENT WORKFLOW

### **Route**: `/admin/users`

### **1. View All Users**

**Features**:
- Paginated user list (20 users per page)
- Search by name or email
- Filter by tier (Silver, Gold, Platinum, Diamond)
- Sort by registration date, balance, or tier

**Displayed Information**:
```
User Card:
├── Full Name
├── Email
├── Balance (USD)
├── Bonus Balance
├── Membership Tier
├── Credit Score (0-100)
├── KYC Status
├── Registration Date
└── Actions (View, Edit, Suspend)
```

### **2. View User Details**

**Route**: `/admin/users/[userId]`

**Tabs Available**:

#### **Overview Tab**
- Personal information
- Account balances (USD + Bonus)
- Membership tier with benefits
- Total trade volume
- Credit score with history
- KYC verification status

#### **Transactions Tab**
- All deposits and withdrawals
- Filter by type and status
- Transaction details (amount, date, payment method, receipt)
- Approval/rejection actions

#### **Trades Tab**
- Binary options trades history
- Market orders (buy/sell)
- Trade P&L (profit/loss)
- Settlement history with audit logs

#### **Settings Tab**
- Edit user profile
- Adjust balances (with audit trail)
- Change tier manually
- Update credit score
- Reset withdrawal password

### **3. User Actions**

#### **Credit User Balance**
```typescript
Action: Credit Bonus
Flow:
1. Navigate to user detail page
2. Click "Credit Bonus"
3. Enter amount (e.g., $100)
4. Confirm action
5. System:
   - Updates bonus_balance
   - Creates transaction record (type: 'bonus')
   - Logs admin action in audit_logs
```

#### **Adjust Credit Score**
```typescript
Action: Update Credit Score
Flow:
1. Go to user settings
2. Find "Credit Score" section
3. Enter new score (0-100)
4. Provide reason (required)
5. System:
   - Updates profiles.credit_score
   - Creates entry in credit_score_history
   - Records admin_id and reason
```

#### **Change User Tier**
```typescript
Action: Manual Tier Change
Flow:
1. User settings → Membership section
2. Select new tier (Silver/Gold/Platinum/Diamond)
3. Override automatic calculation
4. System applies tier benefits immediately
```

---

## 💰 FINANCIAL OPERATIONS

### **Route**: `/admin/finance`

### **1. Deposit Management**

#### **View Pending Deposits**
**Route**: `/admin/finance` → Deposits Tab

**Workflow**:
```
1. User submits deposit request from trader portal
   ↓
2. Admin receives notification
   ↓
3. Admin views deposit details:
   - User information
   - Amount requested
   - Payment method
   - Receipt/proof (uploaded image)
   - Timestamp
   ↓
4. Admin verifies receipt authenticity
   ↓
5. Admin takes action:
   [APPROVE] → Credits user balance → Marks as 'completed'
   [REJECT]  → Adds rejection reason → Marks as 'rejected'
```

#### **Approve Deposit**
```typescript
Action: POST /api/admin/deposits/[id]/approve

What happens:
1. Calls approve_deposit() RPC function
2. Updates transaction status: 'pending' → 'completed'
3. Credits user balance: profiles.balance_usd += amount
4. Creates notification for user
5. Logs action in audit_logs with admin_id
6. Real-time update to user's dashboard
```

#### **Reject Deposit**
```typescript
Action: POST /api/admin/deposits/[id]/reject

What happens:
1. Updates transaction status: 'pending' → 'rejected'
2. Stores rejection reason in metadata
3. Notifies user with reason
4. Logs action in audit_logs
5. No balance change
```

### **2. Withdrawal Management**

#### **View Pending Withdrawals**
**Route**: `/admin/withdrawals`

**Workflow**:
```
1. User requests withdrawal from trader portal
   - Enters amount
   - Enters withdrawal password (separate from login password)
   - Selects bank account
   ↓
2. System deducts from user balance immediately
   (prevents double withdrawal)
   ↓
3. Admin receives notification
   ↓
4. Admin reviews:
   - User credit score (trust indicator)
   - Withdrawal history
   - Bank account details
   - Available balance
   ↓
5. Admin processes:
   [APPROVE] → Transfers money to user bank → Marks completed
   [REJECT]  → Refunds balance to user → Adds reason
```

#### **Approve Withdrawal**
```typescript
Action: POST /api/admin/withdrawals/[id]/approve

What happens:
1. Calls approve_withdrawal() RPC function
2. Updates transaction status: 'pending' → 'completed'
3. Admin manually transfers to user's bank account (external)
4. Logs completion in audit_logs
5. Notifies user: "Withdrawal processed successfully"
```

#### **Reject Withdrawal**
```typescript
Action: POST /api/admin/withdrawals/[id]/reject

What happens:
1. Calls reject_withdrawal() RPC function
2. Refunds balance: profiles.balance_usd += amount
3. Updates status: 'pending' → 'rejected'
4. Stores rejection reason
5. Notifies user with reason
6. Logs action in audit_logs
```

### **3. Platform Bank Accounts**

**Route**: `/admin/finance/bank-accounts`

**Purpose**: Manage bank accounts where users send deposits

**Actions**:
- ✅ Add new bank account
- ✅ Enable/disable account
- ✅ Set as primary (shown first to users)
- ✅ Delete inactive accounts

**Usage**:
When users deposit, they see these bank accounts and transfer money to them.

---

## 📈 TRADE MANAGEMENT

### **Route**: `/admin/trades`

### **1. Active Trades Tab**

**Displays**: All OPEN binary options trades from trader portal

**Trade Card Shows**:
```
Trade Information:
├── User (name + email)
├── Asset (BTC-USD, ETH-USD, etc.)
├── Direction (UP ⬆️ or DOWN ⬇️)
├── Investment Amount ($50, $100, etc.)
├── Strike Price (entry price)
├── Payout Rate (80%, 85%, 90%)
├── Expiry Time (countdown timer)
├── Created At
└── Actions [Settle as WIN] [Settle as LOSS]
```

### **2. Trade Settlement Workflow**

**Binary Options Settlement**:

```
Trade Lifecycle:
1. User places binary trade on trader portal
   ↓
2. execute_binary_trade() RPC:
   - Deducts amount from wallet
   - Creates order with status = 'OPEN'
   - Records strike_price and expiry_at
   ↓
3. Trade expires after duration (e.g., 5 minutes)
   ↓
4. Admin reviews trade in admin portal
   ↓
5. Admin checks market price at expiry
   ↓
6. Admin settles trade:

   [SETTLE AS WIN]:
   - Calculates payout: amount + (amount * payout_rate / 100)
   - Example: $100 + ($100 * 85% / 100) = $185
   - Credits $185 to user wallet
   - Updates order: status = 'WIN', profit_loss = +$85

   [SETTLE AS LOSS]:
   - No payout (user loses investment)
   - Updates order: status = 'LOSS', profit_loss = -$100
   ↓
7. settle_binary_order() RPC:
   - Updates order status
   - Credits balance if WIN
   - Creates audit log entry:
     * Admin ID
     * Outcome (WIN/LOSS)
     * Final price
     * Rationale (optional)
     * Supporting document URL (optional)
   ↓
8. User receives notification
   ↓
9. Balance updated in real-time
```

#### **Settlement Button Actions**
```typescript
Admin clicks "Settle as WIN":
1. Prompts for:
   - Final market price (optional)
   - Rationale (optional - e.g., "BTC reached $45,500 at expiry")
   - Supporting document URL (optional - screenshot of price chart)
2. Calls settle_binary_order() RPC
3. Shows success message: "Trade settled as WIN. Payout: $185"
4. Removes trade from Active Trades tab
5. Appears in Trade History tab
```

### **3. Trade History Tab**

**Displays**: All settled trades (WIN/LOSS)

**Features**:
- Filter by outcome, user, asset, date
- View settlement audit logs
- See admin who settled each trade
- View rationale and supporting documents
- Export to CSV

**Audit Log Details**:
```sql
SELECT
  o.id, o.user_id, o.asset_symbol, o.direction,
  o.amount, o.payout_rate, o.status,
  a.admin_id, a.outcome, a.final_price,
  a.rationale, a.payout_amount, a.created_at
FROM orders o
JOIN trade_settlement_audit_logs a ON a.order_id = o.id
WHERE o.type = 'binary' AND o.status IN ('WIN', 'LOSS')
ORDER BY a.created_at DESC;
```

---

## 💬 SUPPORT SYSTEM

### **Route**: `/admin/support`

### **WhatsApp-Style Chat Interface**

**Features**:
- Real-time messaging
- User inbox with unread count
- Message threads per user
- Support ticket history
- Attachment support

### **Support Workflow**

```
User Flow:
1. User sends message from trader portal
   ↓
2. Message inserted into support_messages table
   ↓
3. Admin receives notification (red badge on support icon)
   ↓
4. Admin opens support page
   ↓
5. Sees list of users with messages
   ↓
6. Clicks user to open chat thread
   ↓
7. Reads user's message
   ↓
8. Types response
   ↓
9. Sends message (stored with is_admin = true)
   ↓
10. User receives message in real-time
    ↓
11. Chat thread continues until resolved
```

**Message Table Structure**:
```sql
support_messages:
├── id (UUID)
├── user_id (who the thread is with)
├── sender_id (who sent this message)
├── message (text content)
├── is_admin (true if sent by admin)
├── read (false until user reads it)
├── created_at (timestamp)
└── attachments (optional)
```

### **Support Best Practices**

1. **Response Time**: Aim for < 5 minutes during business hours
2. **Templates**: Use common responses for FAQs
3. **Escalation**: Mark complex issues for senior admin
4. **Resolution**: Close ticket when issue resolved
5. **Follow-up**: Check back after 24 hours

---

## 🔔 NOTIFICATION SYSTEM

### **Route**: `/admin/notifications`

### **Notification Types**

**Admin Notifications** (`admin_notifications` table):

| Type | Trigger | Action Required |
|------|---------|----------------|
| `new_user` | User registration | Welcome, verify KYC |
| `deposit_request` | Deposit submitted | Review and approve |
| `withdrawal_request` | Withdrawal submitted | Review and process |
| `trade` | Binary trade placed | Monitor expiry |
| `kyc_submission` | KYC documents uploaded | Verify identity |
| `support_message` | User sent message | Respond to query |
| `system_alert` | System error/warning | Investigate issue |

### **Notification Flow**

```
Event Occurs (e.g., new deposit)
   ↓
Database trigger OR Application code
   ↓
INSERT INTO admin_notifications (
  type = 'deposit_request',
  title = 'New Deposit Request',
  message = 'User John Doe requested $500 deposit',
  related_id = transaction_id,
  read = false
)
   ↓
Real-time broadcast via Supabase Realtime
   ↓
Admin notification bell shows red badge
   ↓
Admin clicks bell → sees notification list
   ↓
Admin clicks notification → redirects to relevant page
   ↓
Notification marked as read
```

### **Notification Bell Component**

**Location**: Top right header (all admin pages)

**Features**:
- 🔴 Red badge with unread count
- 🔔 Dropdown list on click
- 📱 Real-time updates (no refresh needed)
- 🗑️ Mark as read / delete
- 🔗 Click to navigate to related item

---

## ⚙️ SETTINGS & CONFIGURATION

### **Route**: `/admin/settings`

### **Available Settings**

#### **1. Platform Bank Accounts**
- Add/edit/delete bank accounts for deposits
- Set primary account
- Enable/disable accounts

#### **2. Asset Management**
**Route**: `/admin/assets`

- Add new trading assets (BTC, ETH, AAPL, etc.)
- Set asset type (crypto, forex, stock, commodity)
- Enable/disable trading for specific assets
- Configure trading pairs (BTC-USD, ETH-USD)
- Set fee percentages (buy: 0.6%, sell: 1.1%)

#### **3. Exchange Rates**
- Update currency conversion rates
- Set custom rates for specific pairs
- Auto-fetch from external API (Alpha Vantage)

#### **4. System Settings**
- Platform maintenance mode
- Trading hours configuration
- Minimum deposit/withdrawal amounts
- Fee structures
- Payout rates for binary options

#### **5. Admin User Management**
```sql
-- Create new admin user
UPDATE profiles
SET role = 'admin'
WHERE email = 'newadmin@example.com';
```

---

## 📅 DAILY ADMIN TASKS

### **Morning Routine (9 AM)**

1. **Check Dashboard**
   - Review pending deposits (respond within 1 hour)
   - Review pending withdrawals (process by EOD)
   - Check total user count (growth metrics)

2. **Process Deposits**
   - Open Finance → Deposits tab
   - Verify receipts for all pending deposits
   - Approve legitimate deposits
   - Reject suspicious ones with reason

3. **Review Active Trades**
   - Open Trades → Active Trades tab
   - Monitor trades nearing expiry
   - Prepare to settle expired trades

### **Afternoon Tasks (2 PM)**

4. **Settle Expired Trades**
   - Check market prices
   - Settle all expired binary trades
   - Provide rationale for each settlement

5. **Process Withdrawals**
   - Review withdrawal requests
   - Check user credit scores
   - Transfer funds to user bank accounts
   - Mark as completed in system

6. **Respond to Support Messages**
   - Open Support page
   - Reply to all unread messages
   - Resolve issues or escalate

### **Evening Review (6 PM)**

7. **Check Notifications**
   - Clear all unread notifications
   - Address urgent issues

8. **Review Analytics**
   - Total deposits processed
   - Total withdrawals completed
   - Total trades settled
   - User growth

9. **Prepare for Next Day**
   - Note any pending issues
   - Schedule follow-ups

### **Weekly Tasks**

- **Monday**: Review user growth and engagement metrics
- **Wednesday**: Audit trail review (check all admin actions)
- **Friday**: Generate weekly report (deposits, withdrawals, trades, new users)

### **Monthly Tasks**

- **Update tier calculations**: Recalculate user tiers based on trade volume
- **Review credit scores**: Adjust based on user behavior
- **Platform maintenance**: Update assets, exchange rates, fees
- **Security audit**: Review admin access logs

---

## ✅ BEST PRACTICES

### **1. Financial Operations**

**DO**:
- ✅ Verify deposit receipts carefully (check amount, date, bank name)
- ✅ Check user credit score before approving large withdrawals
- ✅ Provide clear rejection reasons
- ✅ Process withdrawals within 24 hours
- ✅ Keep audit logs for all financial transactions

**DON'T**:
- ❌ Approve deposits without verifying receipt
- ❌ Reject without providing reason
- ❌ Delay withdrawal processing (hurts reputation)
- ❌ Manually edit balances without recording in audit log

### **2. Trade Settlement**

**DO**:
- ✅ Settle trades within 5 minutes of expiry
- ✅ Provide rationale for settlements
- ✅ Check market price from reliable sources
- ✅ Attach price chart screenshot if disputed
- ✅ Be consistent with settlement decisions

**DON'T**:
- ❌ Delay settlements (frustrates users)
- ❌ Settle unfairly (damages trust)
- ❌ Settle without checking actual market price
- ❌ Favor or discriminate against users

### **3. User Management**

**DO**:
- ✅ Monitor user behavior for suspicious activity
- ✅ Reward loyal users with tier upgrades
- ✅ Respond to support messages promptly
- ✅ Update credit scores based on behavior
- ✅ Verify KYC documents thoroughly

**DON'T**:
- ❌ Share user information with unauthorized parties
- ❌ Modify balances arbitrarily
- ❌ Ignore user complaints
- ❌ Discriminate based on tier or balance

### **4. Security**

**DO**:
- ✅ Use strong admin password
- ✅ Enable 2FA when available
- ✅ Log out when leaving workstation
- ✅ Review audit logs regularly
- ✅ Report suspicious activity immediately

**DON'T**:
- ❌ Share admin credentials
- ❌ Access admin panel from public WiFi
- ❌ Leave admin session open on shared computer
- ❌ Ignore security alerts

---

## 🔧 TROUBLESHOOTING

### **Common Issues**

#### **1. Cannot See User Trades**
**Symptom**: Active Trades tab is empty but users report placing trades

**Solution**: Apply the sync fix migrations
```bash
# Run APPLY_ALL_SYNC_FIXES.sql in Supabase Dashboard
# This fixes RLS policies and adds missing columns
```

#### **2. Deposit Approval Fails**
**Symptom**: Error when clicking "Approve"

**Check**:
```sql
-- Verify transaction exists
SELECT * FROM transactions WHERE id = '[transaction-id]';

-- Check if user exists
SELECT * FROM profiles WHERE id = '[user-id]';

-- Check if approve_deposit RPC function exists
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'approve_deposit';
```

#### **3. Withdrawal Rejection Not Refunding Balance**
**Symptom**: User balance not credited after rejection

**Fix**: Check `reject_withdrawal()` RPC function and ensure it refunds balance

#### **4. Trade Settlement Error**
**Symptom**: "Order not found" or "Already settled"

**Check**:
```sql
-- Verify order status
SELECT id, status, type FROM orders WHERE id = '[order-id]';

-- Must be status = 'OPEN' and type = 'binary'
```

---

## 📊 PERFORMANCE METRICS

### **Key KPIs to Monitor**

1. **Response Time**:
   - Deposit approval: < 1 hour
   - Withdrawal processing: < 24 hours
   - Support response: < 5 minutes
   - Trade settlement: < 5 minutes after expiry

2. **Accuracy**:
   - Trade settlement accuracy: 100%
   - Deposit verification: 100%
   - Fraud detection rate: track suspicious activity

3. **User Satisfaction**:
   - Support ticket resolution rate
   - Average response time
   - Withdrawal processing time
   - Trade settlement timeliness

---

## 🚀 QUICK REFERENCE

### **Frequently Used URLs**

| Page | URL | Purpose |
|------|-----|---------|
| Dashboard | `/admin/dashboard` | Overview metrics |
| Users | `/admin/users` | User management |
| Finance | `/admin/finance` | Deposits/withdrawals |
| Trades | `/admin/trades` | Binary options |
| Support | `/admin/support` | User messages |
| Notifications | `/admin/notifications` | Alerts |

### **Frequently Used SQL Queries**

```sql
-- Check pending deposits
SELECT * FROM transactions
WHERE type = 'deposit' AND status = 'pending'
ORDER BY created_at DESC;

-- Check pending withdrawals
SELECT * FROM transactions
WHERE type IN ('withdraw', 'withdrawal') AND status = 'pending'
ORDER BY created_at DESC;

-- Check active trades
SELECT * FROM orders
WHERE type = 'binary' AND status = 'OPEN'
ORDER BY expiry_at ASC;

-- Check user balance
SELECT id, email, balance_usd, bonus_balance, tier
FROM profiles
WHERE email = 'user@example.com';

-- View admin action audit log
SELECT * FROM audit_logs
WHERE admin_id = '[your-admin-id]'
ORDER BY created_at DESC
LIMIT 50;
```

---

## 🎓 TRAINING CHECKLIST

**For New Admins**:

- [ ] Complete login and understand authentication flow
- [ ] Navigate all sections of admin portal
- [ ] Practice approving a test deposit
- [ ] Practice settling a test trade
- [ ] Respond to a test support message
- [ ] Review audit logs to understand tracking
- [ ] Understand tier system and benefits
- [ ] Learn credit score system
- [ ] Practice user balance adjustments
- [ ] Read security best practices
- [ ] Set up notification preferences

---

## 📞 SUPPORT & ESCALATION

**For Admin Support**:
- Technical issues: contact dev team
- Database queries: check CLAUDE.md documentation
- Security concerns: report to senior admin immediately
- Platform bugs: document and report with screenshots

---

**END OF ADMIN WORKFLOW GUIDE**

> Keep this guide updated as new features are added to the admin portal.
> Last review: 2026-01-12
