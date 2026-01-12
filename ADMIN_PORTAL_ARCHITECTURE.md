# 🏗️ Binapex Admin Portal - Complete Architecture & Trader Portal Integration

**Version**: 1.0
**Last Updated**: 2026-01-12
**Purpose**: Complete mapping of admin portal sections, functions, and trader portal connections

---

## 📑 TABLE OF CONTENTS

1. [System Architecture Overview](#system-architecture-overview)
2. [Admin Portal Sections (Detailed)](#admin-portal-sections-detailed)
3. [Trader Portal Integration Points](#trader-portal-integration-points)
4. [Data Flow Diagrams](#data-flow-diagrams)
5. [Database Schema Connections](#database-schema-connections)
6. [Real-time Synchronization](#real-time-synchronization)

---

## 🔄 SYSTEM ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                    BINAPEX ECOSYSTEM                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────┐         ┌────────────────────┐    │
│  │   TRADER PORTAL    │◄───────►│   ADMIN PORTAL     │    │
│  │  (User-facing)     │         │  (Management)      │    │
│  └────────┬───────────┘         └────────┬───────────┘    │
│           │                              │                 │
│           │        ┌─────────────────┐   │                │
│           └───────►│   SUPABASE DB   │◄──┘                │
│                    │  (PostgreSQL)   │                     │
│                    └────────┬────────┘                     │
│                             │                              │
│                    ┌────────▼────────┐                     │
│                    │  Row Level      │                     │
│                    │  Security (RLS) │                     │
│                    └─────────────────┘                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### **Key Components**

| Component | Purpose | Technology |
|-----------|---------|------------|
| **Trader Portal** | User-facing platform for trading | Next.js (separate repo) |
| **Admin Portal** | Management interface | Next.js (this repo) |
| **Supabase** | Backend & Database | PostgreSQL + Auth + Realtime |
| **RLS Policies** | Data access control | PostgreSQL policies |
| **Real-time Sync** | Live updates | Supabase Realtime (WebSocket) |

---

## 📍 ADMIN PORTAL SECTIONS (DETAILED)

### **1. 📊 DASHBOARD** (`/admin` or `/admin/dashboard`)

**File**: `app/admin/page.tsx` & `app/admin/dashboard/page.tsx`

#### **Purpose**
Central command center showing real-time platform overview

#### **Key Metrics Displayed**
```typescript
{
  totalUsers: number,           // All registered users
  pendingDeposits: number,      // Deposits awaiting approval
  pendingWithdrawals: number,   // Withdrawals awaiting processing
  recentActivity: Transaction[] // Last 10 transactions
}
```

#### **Data Sources**
```sql
-- Total Users
SELECT COUNT(*) FROM profiles;

-- Pending Deposits
SELECT COUNT(*) FROM transactions
WHERE type = 'deposit' AND status = 'pending';

-- Pending Withdrawals
SELECT COUNT(*) FROM transactions
WHERE type IN ('withdraw', 'withdrawal') AND status = 'pending';

-- Recent Activity
SELECT * FROM transactions
ORDER BY created_at DESC LIMIT 10;
```

#### **Connection to Trader Portal**
- **Trader Action**: User registers → deposits → trades → withdraws
- **Admin View**: Dashboard shows these actions in real-time
- **Sync Method**: Supabase Realtime subscriptions update counts automatically

#### **Components**
- `AdminDashboard.tsx` - Main dashboard layout
- `admin-queries.ts` - Data fetching functions
- Real-time hooks for live updates

---

### **2. 👥 USER MANAGEMENT** (`/admin/users`)

**File**: `app/admin/users/page.tsx`

#### **Purpose**
Complete user account management and oversight

#### **Features**

**A. User List View**
```typescript
interface UserDisplay {
  id: string
  email: string
  full_name: string
  balance_usd: number
  bonus_balance: number
  tier: 'silver' | 'gold' | 'platinum' | 'diamond'
  credit_score: number       // Trust score (0-100)
  kyc_verified: boolean
  total_trade_volume: number
  created_at: timestamp
}
```

**B. User Detail View** (`/admin/users/[id]`)

**Tabs**:
1. **Overview** - Profile info, balances, tier
2. **Transactions** - Deposit/withdrawal history
3. **Trades** - Trading activity and P&L
4. **Settings** - Admin actions

**C. Admin Actions on Users**

| Action | Function | Database Impact |
|--------|----------|----------------|
| **Credit Bonus** | `creditUserBonus()` | `bonus_balance += amount` |
| **Adjust Balance** | `adjustBalance()` | `balance_usd += amount` |
| **Update Credit Score** | `updateCreditScore()` | `credit_score = new_value` + audit log |
| **Change Tier** | `updateTier()` | `tier = 'gold'` (manual override) |
| **Reset Withdrawal Password** | `resetWithdrawalPassword()` | `withdrawal_password = hashed_new` |
| **Suspend Account** | `suspendUser()` | `status = 'suspended'` |
| **View Audit Trail** | `getUserAuditLogs()` | Read from `credit_score_history` |

#### **Connection to Trader Portal**

**Data Flow**:
```
Trader Portal                  Database                Admin Portal
─────────────                 ────────                ─────────────
User registers    ──────►    INSERT profiles  ──────►  Shows in user list
User completes KYC ──────►   UPDATE kyc_status ─────►  Admin verifies
User deposits     ──────►    INSERT transaction ────►  Pending deposit alert
User trades       ──────►    UPDATE trade_volume ───►  Tier auto-recalculated
```

**Sync Points**:
- New user registration → Admin sees in user list immediately
- KYC submission → Admin receives notification to verify
- Trade volume increase → Tier updates automatically or admin can override
- Balance changes → Reflected in real-time on both portals

#### **Components**
- `UserManagementTable.tsx` - User list with search/filter
- `UserDetailPage.tsx` - Individual user view
- `CreditScoreService.ts` - Credit score management
- `admin-users.ts` - Server actions for user operations

---

### **3. 💰 FINANCE OPERATIONS** (`/admin/finance`)

**File**: `app/admin/finance/page.tsx`

#### **Purpose**
Central hub for all financial transactions requiring admin approval

#### **Sub-sections**

**A. Pending Deposits**

**Display**:
```typescript
interface Deposit {
  id: string
  user: {
    full_name: string
    email: string
    current_balance: number
  }
  amount: number
  currency: 'USD' | 'EUR' | 'NGN'
  payment_method: 'bank_transfer' | 'crypto' | 'card'
  receipt_url: string         // Uploaded proof
  metadata: {
    bank_name?: string
    account_number?: string
    transaction_ref?: string
  }
  status: 'pending'
  created_at: timestamp
}
```

**Admin Actions**:
1. **View Receipt** - Opens uploaded proof (image/PDF)
2. **Approve** - Credits user balance
3. **Reject** - Marks as rejected with reason

**Approval Workflow**:
```
Admin clicks "Approve"
        ↓
POST /api/admin/deposits/[id]/approve
        ↓
Calls approve_deposit() RPC:
  BEGIN TRANSACTION
    UPDATE transactions SET status = 'completed'
    UPDATE profiles SET balance_usd = balance_usd + amount
    INSERT INTO audit_logs (admin_id, action, details)
    INSERT INTO admin_notifications (user_id, type='deposit_approved')
  COMMIT
        ↓
Real-time notification to user
        ↓
User sees balance increase on trader portal
```

**B. Exchange Rate Manager**

**Purpose**: Set currency conversion rates for multi-currency deposits

```typescript
interface ExchangeRate {
  from_currency: 'NGN' | 'EUR' | 'GBP'
  to_currency: 'USD'
  rate: number          // e.g., 1 USD = 1500 NGN
  last_updated: timestamp
}
```

**Actions**:
- Update rate manually
- Fetch from Alpha Vantage API
- Set custom rates for specific currencies

#### **Connection to Trader Portal**

**Deposit Flow**:
```
TRADER PORTAL                          ADMIN PORTAL
─────────────                          ────────────

1. User clicks "Deposit"
   ↓
2. Selects amount ($500)
   ↓
3. Sees platform bank accounts
   ↓
4. Transfers $500 to bank
   ↓
5. Uploads receipt proof
   ↓
6. Clicks "Submit Deposit"
        ↓
   INSERT INTO transactions           7. Admin receives notification
   (type='deposit',                      ↓
    status='pending',                 8. Admin views receipt
    receipt_url)                         ↓
                                      9. Verifies authenticity
                                         ↓
                                      10. Clicks "Approve"
        ↓                                ↓
11. Balance updated in DB ◄───────────  RPC approve_deposit()
        ↓
12. User sees $500 in trader portal
    (real-time update via Supabase)
```

#### **Components**
- `DepositApprovalList.tsx` - Pending deposits list
- `ExchangeRateManager.tsx` - Rate configuration
- `admin-banking.ts` - Server actions for financial ops
- `admin-queries.ts` - Database queries

---

### **4. 💸 WITHDRAWALS** (`/admin/withdrawals`)

**File**: `app/admin/withdrawals/page.tsx`

#### **Purpose**
Process user withdrawal requests and transfer funds

#### **Display**
```typescript
interface Withdrawal {
  id: string
  user: {
    full_name: string
    email: string
    credit_score: number      // Important for fraud detection
    withdrawal_history: number // How many successful withdrawals
  }
  amount: number
  bank_account: {
    bank_name: string
    account_number: string
    account_holder: string
  }
  status: 'pending'
  requested_at: timestamp
  metadata: {
    ip_address: string        // Fraud detection
    device_info: string
  }
}
```

#### **Withdrawal Workflow**

**User Side (Trader Portal)**:
```
1. User has $1000 balance
   ↓
2. Clicks "Withdraw"
   ↓
3. Enters amount ($500)
   ↓
4. Enters withdrawal password (separate from login)
   ↓
5. Selects bank account
   ↓
6. Clicks "Submit"
   ↓
request_withdrawal_atomic() RPC:
  - Validates withdrawal password (bcrypt check)
  - Checks balance >= amount
  - Deducts balance immediately: balance_usd -= 500
  - Creates transaction (type='withdrawal', status='pending')
   ↓
7. Balance now shows $500 (locked pending approval)
```

**Admin Side (Admin Portal)**:
```
8. Admin receives notification
   ↓
9. Reviews withdrawal request:
   - User credit score (higher = more trustworthy)
   - Withdrawal history
   - Bank account details
   - Recent activity
   ↓
10. Admin decision:

    [APPROVE]:                      [REJECT]:
    - Admin transfers $500          - Admin provides reason
      to user's bank (external)     - System refunds balance
    - Marks transaction             - balance_usd += 500
      as 'completed'                - Notifies user with reason
    - Logs in audit_logs           - Logs in audit_logs

   ↓                                ↓
11. User notified via email     11. User notified + refunded
```

#### **Admin Actions**

| Action | API Endpoint | RPC Function | Effect |
|--------|-------------|--------------|---------|
| **Approve** | `POST /api/admin/withdrawals/[id]/approve` | `approve_withdrawal()` | Marks completed, admin transfers externally |
| **Reject** | `POST /api/admin/withdrawals/[id]/reject` | `reject_withdrawal()` | Refunds balance, stores reason |

#### **Fraud Detection Indicators**

Admin checks:
- ✅ Credit score (0-100, default 100)
- ✅ Withdrawal frequency (too many = suspicious)
- ✅ Account age (new accounts = higher risk)
- ✅ Trade activity (no trades but withdrawal = red flag)
- ✅ KYC status (unverified = don't approve large amounts)

#### **Connection to Trader Portal**

```
TRADER PORTAL                      DATABASE                    ADMIN PORTAL
─────────────                     ────────                    ────────────

User requests withdrawal  ────►   INSERT transaction   ────►  Pending notification
balance_usd -= amount             status='pending'
                                          │
                                          ▼
Admin approves            ◄────   UPDATE status='completed'  Admin clicks approve
                                  (no balance change -
                                   already deducted)
                                          │
                                          ▼
User receives email       ◄────   INSERT notification  ◄────  Audit log created
"Withdrawal processed"            type='withdrawal_approved'
```

#### **Components**
- `WithdrawalApprovalList.tsx` - Pending withdrawals list
- `approve_withdrawal()` RPC - Database function
- `reject_withdrawal()` RPC - Database function with refund

---

### **5. 📈 TRADES** (`/admin/trades`)

**File**: `app/admin/trades/page.tsx`

#### **Purpose**
Monitor and settle binary options trades from trader portal

#### **Tabs**

**A. Active Trades**

Shows all OPEN binary trades waiting for settlement:

```typescript
interface BinaryTrade {
  id: string
  user: {
    id: string
    full_name: string
    email: string
  }
  asset_symbol: 'BTC-USD' | 'ETH-USD' | 'EUR-USD' // Trading pair
  direction: 'UP' | 'DOWN'         // Prediction
  amount: number                   // Investment ($50, $100, etc.)
  strike_price: number             // Entry price at time of trade
  payout_rate: number              // Payout % (80%, 85%, 90%)
  expiry_at: timestamp             // When trade expires
  end_time: timestamp              // Same as expiry_at
  status: 'OPEN'                   // Awaiting settlement
  created_at: timestamp            // When trade was placed

  // Calculated fields
  time_remaining: string           // "2 minutes 34 seconds"
  potential_payout: number         // amount + (amount * payout_rate / 100)
}
```

**Display Example**:
```
┌─────────────────────────────────────────────────────────┐
│ User: John Doe (john@example.com)                      │
│ Asset: BTC-USD                                          │
│ Direction: UP ⬆️                                         │
│ Investment: $100.00                                     │
│ Strike Price: $45,250.00                               │
│ Payout Rate: 85%                                        │
│ Potential Payout: $185.00                              │
│ Expires: 2 minutes 15 seconds                          │
│                                                         │
│ [Settle as WIN] [Settle as LOSS] [View Audit History] │
└─────────────────────────────────────────────────────────┘
```

**B. Trade History**

Shows all settled trades (WIN/LOSS) with audit logs

#### **Binary Options Settlement Process**

**Step-by-Step**:

```
1. TRADER PORTAL - User Places Trade
   ────────────────────────────────────
   User selects:
   - Asset: BTC-USD
   - Direction: UP (predicts price will go up)
   - Amount: $100
   - Duration: 5 minutes

   System shows:
   - Current price: $45,250
   - Payout rate: 85%
   - Potential profit: $85
   - Potential payout: $185 (if WIN)

   User clicks "Place Trade"
        ↓
   execute_binary_trade() RPC:
     BEGIN TRANSACTION
       -- Check balance
       SELECT balance FROM wallets WHERE user_id=? AND asset='USD'
       -- Must be >= $100

       -- Deduct investment
       UPDATE wallets SET balance = balance - 100
       WHERE user_id=? AND asset='USD'

       -- Create order
       INSERT INTO orders (
         user_id, asset_symbol, direction, amount,
         strike_price, payout_rate, type, status,
         expiry_at, end_time
       ) VALUES (
         user_id, 'BTC-USD', 'UP', 100,
         45250, 85, 'binary', 'OPEN',
         NOW() + INTERVAL '5 minutes',
         NOW() + INTERVAL '5 minutes'
       )

       -- Notify admin
       INSERT INTO admin_notifications (
         type='trade', message='New Binary Trade: BTC-USD UP $100'
       )
     COMMIT
        ↓
   User sees: "Trade placed successfully. Expires in 5:00"
   Balance updated: $1000 → $900

2. WAITING PERIOD (5 minutes)
   ────────────────────────────
   Trade is OPEN in database
   Countdown timer shows time remaining
   User cannot cancel (investment is locked)

   BTC price fluctuates:
   - 1 min: $45,300 (up)
   - 2 min: $45,150 (down)
   - 3 min: $45,400 (up)
   - 4 min: $45,500 (up)
   - 5 min: $45,600 (expiry)

3. ADMIN PORTAL - Settlement
   ──────────────────────────
   After 5 minutes, trade appears in "Active Trades"

   Admin checks:
   - Strike price: $45,250
   - Final price: $45,600 (from trading view or data feed)
   - Direction: UP
   - Result: FINAL > STRIKE = WIN! ✅

   Admin clicks "Settle as WIN"
        ↓
   Settlement form:
   - Final price: $45,600 (required)
   - Rationale: "BTC reached $45,600 at 14:35 UTC" (optional)
   - Supporting doc: [Screenshot upload] (optional)

   Admin clicks "Confirm"
        ↓
   settle_binary_order() RPC:
     BEGIN TRANSACTION
       -- Get order details
       SELECT * FROM orders WHERE id = order_id FOR UPDATE

       -- Calculate payout
       v_profit = 100 * (85 / 100) = $85
       v_payout = 100 + 85 = $185

       -- Update order
       UPDATE orders SET
         status = 'WIN',
         exit_price = 45600,
         profit_loss = 85,
         closed_at = NOW()
       WHERE id = order_id

       -- Credit user wallet
       UPDATE wallets SET balance = balance + 185
       WHERE user_id = user_id AND asset = 'USD'

       -- Create audit log
       INSERT INTO trade_settlement_audit_logs (
         order_id, user_id, admin_id,
         outcome, final_price, rationale,
         payout_amount, profit_loss
       ) VALUES (
         order_id, user_id, admin_id,
         'WIN', 45600, 'BTC reached $45,600 at expiry',
         185, 85
       )
     COMMIT
        ↓
   Admin sees: "Trade settled successfully"
   Trade removed from Active Trades
   Appears in Trade History

4. TRADER PORTAL - User Notification
   ───────────────────────────────────
   User receives real-time notification:
   "🎉 Your BTC-USD UP trade WON! +$85 profit"

   Balance updated: $900 → $1085
   (Original $900 + $185 payout)

   Trade history shows:
   - Entry: $45,250
   - Exit: $45,600
   - Result: WIN
   - Profit: +$85
```

**Settlement as LOSS**:
```
If BTC went DOWN to $45,100:
- Strike: $45,250
- Final: $45,100
- Direction: UP
- Result: FINAL < STRIKE = LOSS ❌

Admin settles as LOSS:
  v_profit = -100 (lost investment)
  v_payout = 0 (nothing returned)

  UPDATE orders SET status='LOSS', profit_loss=-100
  -- NO balance credit (user already lost the $100)

  INSERT INTO audit_logs...

User notification:
  "😔 Your BTC-USD UP trade lost. -$100"
  Balance remains: $900 (no refund)
```

#### **Audit Trail**

Every settlement creates an audit log:
```sql
SELECT
  o.asset_symbol,
  o.direction,
  o.amount,
  o.strike_price,
  o.payout_rate,
  a.outcome,
  a.final_price,
  a.rationale,
  a.supporting_document_url,
  a.payout_amount,
  a.profit_loss,
  a.created_at,
  p.email as admin_email
FROM orders o
JOIN trade_settlement_audit_logs a ON a.order_id = o.id
JOIN profiles p ON p.id = a.admin_id
WHERE o.user_id = '[user-id]'
ORDER BY a.created_at DESC;
```

#### **Connection to Trader Portal**

```
TRADER PORTAL                    DATABASE                    ADMIN PORTAL
─────────────                   ────────                    ────────────

Place binary trade  ────────►   INSERT orders         ────►  Notification received
balance -= amount               status='OPEN'
                                expiry_at=NOW()+5min
                                        │
                                Wait 5 minutes
                                        │
                                        ▼
                                expiry_at reached    ────►  Trade in Active Trades
                                                      ▲
                                                      │
                                                  Admin checks price
                                                      │
                                                      ▼
Balance updated     ◄────────   UPDATE orders    ◄────  Admin clicks settle
if WIN: += payout               status='WIN'/'LOSS'
Notification sent  ◄────────   INSERT audit_log  ◄────  Rationale recorded
                                INSERT notification
```

#### **Components**
- `TradeSettlementTable.tsx` - Active trades list
- `TradeSettlementHistoryTable.tsx` - Historical trades
- `settle_binary_order()` RPC - Settlement function
- `execute_binary_trade()` RPC - Trade creation (called by trader portal)

---

### **6. 💬 SUPPORT** (`/admin/support`)

**File**: `app/admin/support/page.tsx`

#### **Purpose**
WhatsApp-style real-time messaging between admin and users

#### **Layout**
```
┌─────────────────────────────────────────────────────────┐
│                    SUPPORT CHAT                         │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  INBOX LIST  │         CHAT WINDOW                      │
│              │                                          │
│ ● User A (2) │  ┌────────────────────────────────────┐ │
│   User B     │  │ User A (user@example.com)          │ │
│   User C (1) │  └────────────────────────────────────┘ │
│   User D     │                                          │
│              │  ┌──────────────────────────────┐       │
│  [All Users] │  │ User: Hello, I deposited     │       │
│  [Unread]    │  │ but balance not updated      │       │
│  [Archived]  │  └──────────────────────────────┘       │
│              │                                          │
│              │       ┌──────────────────────────────┐  │
│              │       │ Admin: Let me check your     │  │
│              │       │ transaction...                 │  │
│              │       └──────────────────────────────┘  │
│              │                                          │
│              │  ┌──────────────────────────────┐       │
│              │  │ User: Thank you!              │       │
│              │  └──────────────────────────────┘       │
│              │                                          │
│              │  [Type message...] [Send] [📎 Attach]  │
└──────────────┴──────────────────────────────────────────┘
```

#### **Database Structure**

```sql
CREATE TABLE support_messages (
  id UUID PRIMARY KEY,
  user_id UUID,                    -- Who the conversation is with
  sender_id UUID,                  -- Who sent this specific message
  message TEXT,                    -- Message content
  is_admin BOOLEAN,                -- true if sent by admin
  read BOOLEAN DEFAULT false,      -- Message read status
  attachment_url TEXT,             -- Optional file attachment
  created_at TIMESTAMPTZ
);
```

#### **Message Flow**

**User Sends Message (Trader Portal)**:
```
User types: "My deposit is not showing"
Click "Send"
        ↓
INSERT INTO support_messages (
  user_id = user_id,
  sender_id = user_id,
  message = "My deposit is not showing",
  is_admin = false,
  read = false
)
        ↓
Real-time broadcast to admin
        ↓
Admin notification bell shows (1) new message
```

**Admin Responds (Admin Portal)**:
```
Admin opens Support page
Sees User A with unread badge (1)
Clicks User A
        ↓
Loads all messages WHERE user_id = User A
        ↓
Admin types: "Let me check your transaction..."
Clicks "Send"
        ↓
INSERT INTO support_messages (
  user_id = user_id,
  sender_id = admin_id,
  message = "Let me check your transaction...",
  is_admin = true,
  read = false
)
        ↓
Real-time broadcast to user
        ↓
User sees message instantly on trader portal
```

#### **Features**

| Feature | Description |
|---------|-------------|
| **Real-time** | Messages appear instantly without refresh (Supabase Realtime) |
| **Unread Count** | Shows number of unread messages per user |
| **Attachments** | Upload screenshots, receipts, documents |
| **Search** | Find conversations by user name/email |
| **Archive** | Mark conversations as resolved |
| **Typing Indicator** | Shows when user is typing (optional) |
| **Read Receipts** | Mark messages as read when viewed |

#### **Connection to Trader Portal**

```
TRADER PORTAL                    DATABASE                    ADMIN PORTAL
─────────────                   ────────                    ────────────

User opens support   ────────►  SELECT support_messages  ──► Shows in inbox
                                WHERE user_id=user_id
                                        │
User types message   ────────►  INSERT message           ──► Real-time notification
                                is_admin=false                Red badge appears
                                        │
                                        ▼
Admin reads message  ◄────────  UPDATE read=true        ◄──  Admin clicks user
                                        │
                                        ▼
Admin replies        ────────►  INSERT message          ──► Real-time to user
                                is_admin=true
                                        │
                                        ▼
User sees reply     ◄─────────  SELECT WHERE            ◄──  Notification sent
                                user_id=user_id
                                is_admin=true
```

#### **Components**
- `InboxList.tsx` - User conversation list
- `AdminChatWindow.tsx` - Chat interface
- Real-time subscriptions for instant messaging

---

### **7. 🔔 NOTIFICATIONS** (`/admin/notifications`)

**File**: `app/admin/notifications/page.tsx`

#### **Purpose**
Centralized alert system for all admin-relevant events

#### **Notification Types**

```typescript
type NotificationType =
  | 'new_user'              // User registered
  | 'deposit_request'       // Deposit submitted
  | 'withdrawal_request'    // Withdrawal submitted
  | 'trade'                 // Binary trade placed
  | 'kyc_submission'        // KYC documents uploaded
  | 'support_message'       // User sent message
  | 'system_alert'          // System error/warning
  | 'suspicious_activity'   // Fraud detection triggered
```

#### **Notification Structure**

```sql
CREATE TABLE admin_notifications (
  id UUID PRIMARY KEY,
  user_id UUID,                    -- Related user (if applicable)
  type TEXT,                       -- Notification type
  title TEXT,                      -- "New Deposit Request"
  message TEXT,                    -- "John Doe requested $500 deposit"
  related_id UUID,                 -- Transaction/order/user ID
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,

  -- Additional metadata
  priority TEXT,                   -- 'low', 'normal', 'high', 'urgent'
  action_url TEXT                  -- Where to go when clicked
);
```

#### **Notification Triggers**

**Automatic Triggers (Database)**:
```sql
-- Example: Trigger on new deposit
CREATE OR REPLACE FUNCTION notify_admin_new_deposit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'deposit' AND NEW.status = 'pending' THEN
    INSERT INTO admin_notifications (
      user_id, type, title, message, related_id, priority
    ) VALUES (
      NEW.user_id,
      'deposit_request',
      'New Deposit Request',
      concat(
        (SELECT full_name FROM profiles WHERE id = NEW.user_id),
        ' requested $', NEW.amount, ' deposit'
      ),
      NEW.id,
      'high'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deposit_notification
AFTER INSERT ON transactions
FOR EACH ROW EXECUTE FUNCTION notify_admin_new_deposit();
```

**Application Triggers (Code)**:
```typescript
// When trade is placed
await supabase.from('admin_notifications').insert({
  user_id: userId,
  type: 'trade',
  title: 'New Binary Trade',
  message: `${userName} placed ${assetSymbol} ${direction} $${amount} trade`,
  related_id: orderId,
  priority: 'normal'
});
```

#### **Notification Bell Component**

**Location**: Top-right header (all admin pages)

```typescript
// Example component logic
function AdminNotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Fetch initial notifications
    fetchNotifications()

    // Subscribe to real-time updates
    const channel = supabase
      .channel('admin_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'admin_notifications'
      }, (payload) => {
        // Add new notification
        setNotifications(prev => [payload.new, ...prev])
        setUnreadCount(prev => prev + 1)

        // Show toast
        toast.info(payload.new.title)
      })
      .subscribe()

    return () => channel.unsubscribe()
  }, [])

  return (
    <div className="relative">
      <Bell className="icon" />
      {unreadCount > 0 && (
        <Badge className="absolute -top-1 -right-1 bg-red-500">
          {unreadCount}
        </Badge>
      )}
    </div>
  )
}
```

#### **Connection to Trader Portal**

```
TRADER PORTAL                    DATABASE                    ADMIN PORTAL
─────────────                   ────────                    ────────────

User action occurs   ────────►  INSERT/UPDATE triggers  ──► Notification created
(deposit, trade,                admin notification           │
withdrawal, etc.)                                            ▼
                                                    Real-time broadcast
                                                            │
                                                            ▼
                                                    Bell shows red badge
                                                            │
                                                            ▼
Admin clicks bell    ────────►  SELECT notifications  ◄──  Dropdown opens
                                WHERE read=false             │
                                                            ▼
Admin clicks item    ────────►  UPDATE read=true      ◄──  Marks as read
                                                            │
                                                            ▼
Navigates to page    ────────►  Redirect to           ◄──  action_url
(e.g., /admin/                  related resource
finance for deposit)
```

#### **Components**
- `AdminNotificationBell.tsx` - Bell icon with badge
- Real-time subscription to `admin_notifications` table
- Toast notifications for important alerts

---

### **8. 🎯 ASSETS MANAGEMENT** (`/admin/assets`)

**File**: `app/admin/assets/page.tsx`

#### **Purpose**
Configure tradable assets and trading pairs

#### **Features**

**A. Asset Management**

```typescript
interface Asset {
  id: string
  symbol: 'BTC' | 'ETH' | 'AAPL' | 'EUR' | 'GOLD'
  name: 'Bitcoin' | 'Ethereum' | 'Apple Inc.' | 'Euro' | 'Gold'
  type: 'crypto' | 'forex' | 'stock' | 'commodity'
  is_active: boolean           // Can users trade this?
  icon_url: string            // Asset logo
  created_at: timestamp
}
```

**B. Trading Pairs**

```typescript
interface TradingPair {
  id: string
  symbol: 'BTC-USD' | 'ETH-USD' | 'EUR-USD'
  base_asset: 'BTC' | 'ETH' | 'EUR'
  quote_asset: 'USD'
  buy_fee_percentage: 0.006    // 0.6%
  sell_fee_percentage: 0.011   // 1.1%
  payout_rate: 85              // Binary options payout %
  min_order_amount: 10         // Minimum $10 trade
  is_active: boolean
}
```

**Admin Actions**:
- Add new asset (e.g., add "AAPL" stock)
- Create trading pair (e.g., "AAPL-USD")
- Set fee percentages
- Enable/disable trading for specific pairs
- Configure payout rates for binary options

#### **Connection to Trader Portal**

```
ADMIN PORTAL                     DATABASE                    TRADER PORTAL
────────────                    ────────                    ─────────────

Admin adds BTC asset  ────►    INSERT INTO assets      ──►  BTC appears in
symbol='BTC',                  (symbol, name, type)         asset selection
name='Bitcoin',
type='crypto'
        │
        ▼
Admin creates pair    ────►    INSERT INTO trading_pairs ─► BTC-USD available
symbol='BTC-USD',              (symbol, base, quote,        for trading
payout_rate=85%                 payout_rate)
        │
        ▼
Admin sets active     ────►    UPDATE is_active=true   ──► Users can trade
        │
        ▼
User places trade     ────►    Uses trading_pair       ──► Creates order with
on BTC-USD                     configuration:               correct payout rate
                               payout_rate=85%
```

#### **Components**
- Asset list table
- Trading pair configuration
- Fee management interface

---

### **9. ⚙️ SETTINGS** (`/admin/settings`)

**File**: `app/admin/settings/page.tsx`

#### **Purpose**
Platform-wide configuration and system settings

#### **Settings Categories**

**A. Platform Bank Accounts**
```typescript
interface PlatformBankAccount {
  id: string
  bank_name: string
  account_number: string
  account_holder: string
  is_active: boolean           // Show to users?
  is_primary: boolean          // Show first in list?
}
```

Users see these when depositing money

**B. System Configuration**
```typescript
interface SystemSettings {
  min_deposit_amount: number   // e.g., $50
  max_deposit_amount: number   // e.g., $10,000
  min_withdrawal_amount: number // e.g., $20
  max_withdrawal_amount: number // e.g., $5,000
  withdrawal_fee_percentage: number // e.g., 2%
  maintenance_mode: boolean    // Disable trading?
  trading_hours: {
    start: '00:00',
    end: '23:59'
  }
}
```

**C. Admin User Management**
- View all admin users
- Grant admin role to users
- Revoke admin access

#### **Connection to Trader Portal**

```
ADMIN PORTAL                     DATABASE                    TRADER PORTAL
────────────                    ────────                    ─────────────

Admin sets               ────►  UPDATE system_settings  ──► User sees on
min_deposit=$50                 min_deposit=50              deposit form:
                                                            "Minimum: $50"
        │
        ▼
Admin adds bank account  ────►  INSERT platform_bank    ──► User sees bank
bank_name='Chase'               (bank_name, account)        details when
account='1234567890'                                        depositing
        │
        ▼
Admin enables            ────►  UPDATE maintenance_mode ──► User sees:
maintenance mode                = true                      "Platform under
                                                            maintenance"
```

---

### **10. 📝 SUGGESTIONS** (`/admin/suggestions`)

**File**: `app/admin/suggestions/page.tsx`

#### **Purpose**
User feedback and feature requests management

#### **Features**
- View user-submitted suggestions
- Upvote/downvote suggestions
- Mark as implemented/rejected
- Priority ranking

---

### **11. 🎫 TICKETS** (`/admin/tickets`)

**File**: `app/admin/tickets/page.tsx`

#### **Purpose**
Traditional ticket-based support system (legacy - now using WhatsApp-style chat)

---

### **12. 🏦 SETTLEMENTS** (`/admin/settlements`)

**File**: `app/admin/settlements/page.tsx`

#### **Purpose**
Historical view of all settled binary trades with audit logs

---

## 🔄 TRADER PORTAL INTEGRATION POINTS

### **Complete Data Flow Map**

```
┌─────────────────────────────────────────────────────────────────┐
│                      TRADER PORTAL ACTIONS                      │
└────────────────────┬────────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┬────────────┬────────────┐
        │            │            │            │            │
        ▼            ▼            ▼            ▼            ▼
   REGISTER      DEPOSIT      PLACE TRADE  WITHDRAW    SUPPORT
        │            │            │            │            │
        │            │            │            │            │
┌───────▼────────────▼────────────▼────────────▼────────────▼─────┐
│                        SUPABASE DATABASE                         │
│  ┌────────────┐  ┌──────────────┐  ┌─────────┐  ┌──────────┐  │
│  │  profiles  │  │ transactions │  │ orders  │  │ messages │  │
│  └────────────┘  └──────────────┘  └─────────┘  └──────────┘  │
│         │                │                │             │        │
│         └────────────────┴────────────────┴─────────────┘        │
│                          │                                       │
│                   RLS POLICIES                                   │
│                   (Access Control)                               │
│                          │                                       │
│                   REAL-TIME SYNC                                 │
│                   (WebSocket)                                    │
└──────────────────────────┬───────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┬──────────────┐
        │                  │                  │              │
        ▼                  ▼                  ▼              ▼
   DASHBOARD          FINANCE             TRADES         SUPPORT
        │                  │                  │              │
┌───────▼──────────────────▼──────────────────▼──────────────▼─────┐
│                      ADMIN PORTAL                                 │
│                   (Management Interface)                          │
└───────────────────────────────────────────────────────────────────┘
```

### **Real-time Synchronization Table**

| User Action (Trader Portal) | Database Change | Admin Portal Update | Sync Method |
|-----------------------------|-----------------|---------------------|-------------|
| User registers | INSERT profiles | Shows in user list | Real-time subscription |
| User deposits | INSERT transaction | Notification bell + pending deposits | Real-time subscription |
| User trades | INSERT order | Active trades list + notification | Real-time subscription |
| User withdraws | UPDATE balance + INSERT transaction | Pending withdrawals + notification | Real-time subscription |
| User sends message | INSERT support_messages | Support inbox unread count | Real-time subscription |
| Admin approves deposit | UPDATE transaction + balance | User sees balance increase | Real-time subscription |
| Admin settles trade | UPDATE order + balance | User sees trade result | Real-time subscription |
| Admin replies to support | INSERT support_messages | User sees message | Real-time subscription |

---

## 🎓 SUMMARY

### **Key Integration Points**

1. **Shared Database**: Both portals read/write to same Supabase database
2. **RLS Security**: Row Level Security ensures users only see their data
3. **Real-time Sync**: Supabase Realtime keeps both portals in sync
4. **Notification System**: Admin receives alerts for all user actions
5. **Audit Logging**: Every admin action is tracked in audit_logs table

### **Critical Workflows**

| #  | Workflow | Starts At | Ends At |
|----|----------|-----------|---------|
| 1  | Deposit Approval | Trader Portal (user submits) | Admin Portal (admin approves) |
| 2  | Withdrawal Processing | Trader Portal (user requests) | Admin Portal (admin processes) |
| 3  | Trade Settlement | Trader Portal (user trades) | Admin Portal (admin settles) |
| 4  | Support Chat | Either portal | Real-time on both |
| 5  | User Management | Trader Portal (user registers) | Admin Portal (admin manages) |

---

**END OF ADMIN PORTAL ARCHITECTURE**

> This document provides complete mapping of all admin portal sections and their connections to the trader portal. Keep updated as features evolve.
