# CLAUDE.md - AI Assistant Guide for Binapex Admin Portal

> **Last Updated**: 2026-01-14
> **Codebase Version**: 0.1.0
> **For**: AI assistants working with the Binapex Admin Portal codebase

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Codebase Structure](#codebase-structure)
4. [Architecture & Patterns](#architecture--patterns)
5. [Database Schema](#database-schema)
6. [Authentication & Authorization](#authentication--authorization)
7. [Development Workflows](#development-workflows)
8. [Code Conventions](#code-conventions)
9. [Common Tasks](#common-tasks)
10. [Security Considerations](#security-considerations)
11. [Testing Strategy](#testing-strategy)
12. [Deployment](#deployment)
13. [Troubleshooting](#troubleshooting)

---

## Project Overview

**Binapex** is a comprehensive binary options and crypto trading platform with an admin portal for managing users, trades, finances, and support. The platform features:

- **BullVest**: High-frequency binary options trading
- **BearVest**: Strategic long-term trading
- **Admin Portal**: Complete management system (this repository)

### Key Features
- Real-time trading dashboard
- User management with tier-based benefits
- Financial transaction processing (deposits/withdrawals)
- Binary options settlement system
- WhatsApp-style support chat
- Comprehensive audit logging
- Multi-asset wallet management

### Project Type
- **Nature**: Monolithic Next.js admin application
- **Deployment**: Vercel (primary) + Docker support
- **Database**: Supabase (PostgreSQL with real-time capabilities)
- **Status**: Active development (no test coverage yet)
- **Recent Updates**: Day 1 security lockdown with secure RPC implementations (Jan 2026)

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.1.7 | App Router framework |
| React | 19.0.0 | UI library |
| TypeScript | 5.x | Type safety (strict mode) |
| Tailwind CSS | 4.1.9 | Styling (CSS-first config, black-gold theme) |
| Shadcn/ui | Latest | UI component library (New York style) |
| Radix UI | Various | Accessible primitives |
| React Hook Form | 7.60.0 | Form management |
| Zod | 3.25.76 | Runtime validation |
| Recharts | 2.15.4 | Dashboard charts |
| Lucide React | 0.454.0 | Icon library |
| Sonner | 1.7.4 | Toast notifications |

### Backend & Infrastructure
| Technology | Version | Purpose |
|------------|---------|---------|
| Supabase | 2.50.0 | Backend-as-a-Service |
| PostgreSQL | Latest | Database (via Supabase) |
| Supabase Auth | Built-in | Authentication system |
| Supabase Realtime | Built-in | WebSocket subscriptions |
| Supabase Edge Functions | Deno | Serverless functions |
| Vercel Blob | 2.0.0 | File storage |
| Sentry | 8.55.0 | Error tracking |

### Development Tools
- **Package Manager**: npm (requires `--legacy-peer-deps`)
- **Linting**: ESLint 8.57.0 (max warnings: 0)
- **Build**: Next.js standalone output
- **Container**: Docker (Node 20 slim base)

---

## Codebase Structure

```
binapex-admin/
├── app/                          # Next.js App Router
│   ├── actions/                  # Server Actions (mutations)
│   │   ├── admin-banking.ts      # Banking operations
│   │   ├── admin-users.ts        # User management
│   │   ├── assets.ts             # Asset management
│   │   └── exchange-rate.ts      # Currency rates
│   ├── admin/                    # Admin portal pages
│   │   ├── dashboard/            # Main dashboard
│   │   ├── users/                # User management
│   │   │   └── [id]/             # Dynamic user detail page
│   │   ├── assets/               # Asset management
│   │   ├── finance/              # Financial overview
│   │   ├── withdrawals/          # Withdrawal approvals
│   │   ├── trades/               # Trade management
│   │   ├── settlements/          # Trade settlements
│   │   ├── support/              # Support chat
│   │   ├── tickets/              # Support tickets
│   │   ├── notifications/        # Admin notifications
│   │   ├── risk/                 # Risk management
│   │   ├── suggestions/          # User suggestions
│   │   ├── overview/             # System overview
│   │   ├── settings/             # Admin settings
│   │   ├── login/                # Admin login
│   │   └── layout.tsx            # Admin layout wrapper
│   ├── api/                      # REST API endpoints
│   │   └── admin/                # Admin-specific APIs
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── loading.tsx               # Global loading state
│
├── components/                   # React components
│   ├── admin/                    # Admin-specific components
│   │   ├── AdminDashboard.tsx    # Main dashboard
│   │   ├── AdminRoute.tsx        # Auth wrapper component
│   │   ├── UsersTable.tsx        # User management table
│   │   └── ...                   # Other admin components
│   ├── layout/                   # Layout components
│   │   ├── Sidebar.tsx           # Navigation sidebar
│   │   └── Header.tsx            # Top header
│   └── ui/                       # Shadcn UI components
│       ├── button.tsx            # Reusable button
│       ├── dialog.tsx            # Modal dialogs
│       ├── form.tsx              # Form components
│       └── ...                   # 40+ UI components
│
├── lib/                          # Core utilities and logic
│   ├── supabase/                 # Supabase clients
│   │   ├── server.ts             # Server-side client
│   │   ├── client.ts             # Browser client
│   │   └── proxy.ts              # Middleware auth handler
│   ├── schemas/                  # Zod validation schemas
│   │   ├── admin.ts              # Admin operations
│   │   ├── auth.ts               # Authentication
│   │   ├── banking.ts            # Banking operations
│   │   └── trading.ts            # Trading operations
│   ├── services/                 # Business logic services
│   ├── types/                    # TypeScript type definitions
│   │   └── database.ts           # Supabase generated types
│   ├── utils/                    # Helper functions
│   │   └── cn.ts                 # className merger (clsx + tailwind-merge)
│   ├── constants/                # Application constants
│   │   └── tiers.ts              # Membership tier config
│   ├── env.ts                    # Environment validation
│   └── middleware/               # Middleware utilities
│
├── contexts/                     # React Context providers
│   └── AuthContext.tsx           # Global auth state (5-min cache)
│
├── hooks/                        # Custom React hooks
│   ├── useAdminRealtime.ts       # Real-time dashboard stats
│   └── ...                       # Other custom hooks
│
├── supabase/                     # Database management
│   ├── migrations/               # 40+ SQL migration files
│   │   └── *.sql                 # Schema evolution history
│   └── functions/                # Edge Functions (Deno)
│       └── create-admin/         # Admin creation function
│
├── public/                       # Static assets
│   ├── images/                   # Images
│   └── icons/                    # Icons
│
├── styles/                       # Global CSS
│   └── globals.css               # Tailwind + custom styles
│
├── types/                        # Additional TypeScript types
│
├── middleware.ts                 # Edge middleware (auth check)
├── next.config.mjs               # Next.js configuration
├── postcss.config.mjs            # PostCSS configuration
├── tsconfig.json                 # TypeScript configuration
├── components.json               # Shadcn/ui configuration
├── Dockerfile                    # Container configuration
├── docker-compose.yml            # Docker orchestration
├── vercel.json                   # Vercel deployment config
├── package.json                  # Dependencies and scripts
├── SECURITY.md                   # Security checklist
├── DEPLOYMENT.md                 # Deployment guide
└── CLAUDE.md                     # This documentation file
```

### Key Directory Purposes

- **`/app`**: Next.js App Router pages, layouts, and route handlers
- **`/components`**: All React components (admin, layout, UI primitives)
- **`/lib`**: Core business logic, utilities, and database clients
- **`/supabase`**: Database schema migrations and serverless functions
- **`/contexts`**: Global state management (auth, theme)
- **`/hooks`**: Reusable React hooks for data fetching and state

---

## Architecture & Patterns

### Application Architecture

**Type**: Server-first monolithic Next.js application

**Key Architectural Decisions**:
1. **Server Components First**: Heavy use of React Server Components for data fetching
2. **No Traditional ORM**: Direct Supabase client queries instead of Prisma/TypeORM
3. **Server Actions for Mutations**: All data modifications use Next.js Server Actions
4. **Edge Middleware Auth**: Authentication checks happen at the edge before page loads
5. **RLS-First Security**: Database-level security via Row Level Security policies
6. **Supabase-Centric**: All backend logic in PostgreSQL functions or Edge Functions

### Data Fetching Patterns

#### Server Components (Preferred)
```typescript
// app/admin/users/page.tsx
import { createClient } from "@/lib/supabase/server"

export default async function UsersPage() {
  const supabase = await createClient()

  const { data: users, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error

  return <UsersTable users={users} />
}

// Force dynamic rendering (no static generation)
export const dynamic = "force-dynamic"
```

#### Client Components (When Needed)
```typescript
// components/admin/RealtimeStats.tsx
"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

export function RealtimeStats() {
  const [stats, setStats] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    // Initial fetch
    fetchStats()

    // Subscribe to changes
    const channel = supabase
      .channel("admin_stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, fetchStats)
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [])

  // ...
}
```

### Mutation Patterns (Server Actions)

```typescript
// app/actions/admin-users.ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// 1. Always verify admin access first
async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  // Check role via RPC (cached for 1 minute in middleware)
  const { data: role } = await supabase.rpc("get_user_role")
  if (role !== "admin") throw new Error("Admin access required")

  return { supabase, user }
}

// 2. Export server action
export async function updateUserProfile(userId: string, data: any) {
  try {
    const { supabase } = await verifyAdmin()

    // Filter system fields
    const { id, created_at, ...updateData } = data

    // Perform update
    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId)

    if (error) throw error

    // Revalidate cached pages
    revalidatePath("/admin/users")
    revalidatePath(`/admin/users/${userId}`)

    return { success: true }
  } catch (error) {
    console.error("[v0] updateUserProfile error:", error)
    return { success: false, error: error.message }
  }
}
```

### Authentication Flow

```
1. User Login
   ↓
2. Supabase Auth creates JWT session
   ↓
3. Session stored in HTTP-only cookie (sb-*)
   ↓
4. Middleware (Edge) intercepts all requests
   ↓
5. middleware.ts → updateSession() checks auth
   ↓
6. If authenticated, check role via get_user_role() RPC
   ↓
7. Role cached for 1 minute in middleware
   ↓
8. Request continues to page/API
   ↓
9. Page/API may perform additional auth checks
   ↓
10. AdminRoute component (client-side) provides fallback check
```

### State Management

**No Redux/Zustand** - Uses React Context + Server Components:

1. **Auth State**: `AuthContext` (client-side, 5-min cache)
2. **Server State**: Direct from Supabase in Server Components
3. **Form State**: React Hook Form
4. **UI State**: Local `useState` / `useReducer`
5. **Real-time State**: Custom hooks with Supabase subscriptions

### Error Handling Strategy

```typescript
// Pattern used throughout the codebase
try {
  // 1. Verify permissions
  const { supabase } = await verifyAdmin()

  // 2. Validate input with Zod
  const validData = schema.parse(input)

  // 3. Perform operation
  const { data, error } = await supabase.from("table").insert(validData)

  if (error) throw error

  // 4. Log to audit trail
  await logAuditEvent("action_name", { userId, details })

  // 5. Return success
  return { success: true, data }
} catch (error) {
  // 6. Log error with [v0] prefix (legacy from v0.dev)
  console.error("[v0] functionName error:", error)

  // 7. Report to Sentry (automatic via instrumentation)

  // 8. Return user-friendly error
  return { success: false, error: error.message || "Operation failed" }
}
```

### Real-time Patterns

**Supabase Realtime Subscriptions**:

```typescript
// Pattern for real-time updates
const channel = supabase
  .channel("channel_name")
  .on(
    "postgres_changes",
    {
      event: "*",              // INSERT, UPDATE, DELETE, or *
      schema: "public",
      table: "table_name",
      filter: "column=eq.value" // Optional filter
    },
    (payload) => {
      console.log("Change received:", payload)
      // Update local state
      setState(payload.new)
    }
  )
  .subscribe()

// Always cleanup
return () => { channel.unsubscribe() }
```

---

## Database Schema

### Core Tables Overview

**User Management**
```sql
-- auth.users (Supabase managed)
-- Extended profile information
profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  balance DECIMAL(20,8) DEFAULT 0,
  locked_balance DECIMAL(20,8) DEFAULT 0,
  tier TEXT DEFAULT 'silver',
  total_trade_volume DECIMAL(20,8) DEFAULT 0,
  credit_score INTEGER DEFAULT 100,
  role TEXT DEFAULT 'trader',
  visible_password TEXT,  -- Security concern!
  withdrawal_password TEXT,  -- Hashed with bcrypt
  created_at TIMESTAMPTZ
)

-- Credit score audit trail
credit_score_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles,
  old_score INTEGER,
  new_score INTEGER,
  changed_by UUID REFERENCES profiles,
  reason TEXT,
  created_at TIMESTAMPTZ
)
```

**Financial System**
```sql
-- Multi-asset wallets
wallets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles,
  asset_id UUID REFERENCES assets,
  available_balance DECIMAL(28,10) DEFAULT 0,
  locked_balance DECIMAL(28,10) DEFAULT 0,
  last_updated TIMESTAMPTZ
)

-- Transaction history
transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles,
  type TEXT,  -- deposit, withdrawal, bonus, trade_profit, trade_loss
  amount DECIMAL(20,8),
  currency TEXT,
  status TEXT,  -- pending, approved, rejected, cancelled
  payment_method TEXT,
  bank_account_id UUID,
  proof_url TEXT,
  admin_notes TEXT,
  processed_by UUID REFERENCES profiles,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- User bank accounts
bank_accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles,
  bank_name TEXT,
  account_number TEXT,
  account_holder TEXT,
  is_primary BOOLEAN DEFAULT false
)

-- Platform bank accounts (for deposits)
platform_bank_accounts (
  id UUID PRIMARY KEY,
  bank_name TEXT,
  account_number TEXT,
  account_holder TEXT,
  is_active BOOLEAN DEFAULT true
)
```

**Trading System**
```sql
-- Tradable assets
assets (
  id UUID PRIMARY KEY,
  symbol TEXT UNIQUE,
  name TEXT,
  category TEXT,  -- crypto, forex, stock, commodity
  icon_url TEXT,
  is_active BOOLEAN DEFAULT true
)

-- Trading pairs
trading_pairs (
  id UUID PRIMARY KEY,
  base_asset_id UUID REFERENCES assets,
  quote_asset_id UUID REFERENCES assets,
  symbol TEXT UNIQUE,
  fee_percentage DECIMAL(5,4),
  is_active BOOLEAN DEFAULT true
)

-- Binary options orders
orders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles,
  pair_id UUID REFERENCES trading_pairs,
  type TEXT,  -- call, put
  amount DECIMAL(20,8),
  strike_price DECIMAL(20,8),
  expiry_time TIMESTAMPTZ,
  status TEXT,  -- open, closed, expired, cancelled
  payout DECIMAL(20,8),
  created_at TIMESTAMPTZ
)

-- Trade settlements (admin action)
settlements (
  id UUID PRIMARY KEY,
  order_id UUID REFERENCES orders,
  final_price DECIMAL(20,8),
  outcome TEXT,  -- win, loss
  payout_amount DECIMAL(20,8),
  settled_by UUID REFERENCES profiles,
  rationale TEXT,
  supporting_docs TEXT[],
  created_at TIMESTAMPTZ
)
```

**Support System**
```sql
-- WhatsApp-style support messages
support_messages (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles,
  sender_id UUID REFERENCES profiles,
  message TEXT,
  is_admin BOOLEAN DEFAULT false,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ
)

-- Admin notifications
admin_notifications (
  id UUID PRIMARY KEY,
  type TEXT,  -- new_user, deposit_request, withdrawal_request, etc.
  title TEXT,
  message TEXT,
  related_id UUID,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ
)

-- Audit logs (all admin actions)
audit_logs (
  id UUID PRIMARY KEY,
  admin_id UUID REFERENCES profiles,
  action TEXT,
  target_type TEXT,
  target_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ
)
```

### Key Database Patterns

**Row Level Security (RLS)**
- Every table has RLS enabled
- Users can only access their own data
- Admins can access all data (checked via `auth.uid()` role)
- Service role bypasses RLS for admin operations

**PostgreSQL Functions (RPC)**
```sql
-- Key functions used throughout the app
get_user_role() → TEXT  -- Returns 'admin' or 'trader'
execute_binary_trade(...) → JSON  -- Executes a binary options trade
settle_binary_order(...) → JSON  -- Settles a binary order (admin only)
update_user_tier(user_id UUID) → VOID  -- Recalculates tier based on volume
get_settlement_logs(user_id UUID) → SETOF settlements  -- Audit trail
```

**Triggers**
- Auto-update `updated_at` timestamps
- Create notifications on transaction status changes
- Update wallet balances on trade settlements
- Maintain audit trails automatically

**Decimal Precision**
- Financial amounts: `DECIMAL(20,8)` (standard precision)
- Large balances: `DECIMAL(28,10)` (extended precision)
- Percentages: `DECIMAL(5,4)` (0.01% precision)

### Membership Tier System

Defined in `/lib/constants/tiers.ts`:

| Tier | Min Volume | Max Volume | Deposit Bonus | Fee Reduction | Benefits |
|------|-----------|-----------|---------------|---------------|----------|
| Silver | 0 | 50,000 | 1x | 0% | Email support, basic tools |
| Gold | 50,000 | 200,000 | 1.5x | 50% | Priority support, advanced charts |
| Platinum | 200,000 | 500,000 | 2x | 75% | 24/7 support, pro tools, account manager |
| Diamond | 500,000+ | ∞ | 3x | 90% | VIP support, institutional tools, advisor |

**Tier Progression**: Automatic based on `total_trade_volume`

---

## Authentication & Authorization

### Authentication Layers

**1. Edge Middleware** (`/middleware.ts`)
```typescript
// Runs on EVERY request at the edge
export async function middleware(request: NextRequest) {
  return await updateSession(request)
  // - Validates JWT session
  // - Refreshes expired tokens
  // - Caches user role (1-min TTL)
  // - Redirects to login if unauthenticated
}
```

**2. Server-Side Auth Check** (AdminRoute component)
```typescript
// Wraps admin pages
<AdminRoute>
  <AdminDashboard />
</AdminRoute>
// - Verifies admin role server-side
// - Throws 401 if unauthorized
// - Renders loading state during check
```

**3. Server Action Verification**
```typescript
// Every mutation verifies admin access
async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error("Unauthorized")

  const { data: role } = await supabase.rpc("get_user_role")
  if (role !== "admin") throw new Error("Admin access required")

  return { supabase, user }
}
```

**4. Database RLS**
```sql
-- Example policy
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
```

### Role System

**Roles**: `admin` | `trader` (stored in `profiles.role`)

**Default**: New users are `trader`

**Admin Creation**:
```sql
-- Manual SQL update (requires direct DB access)
UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';
```

**Role Caching**:
- Middleware: 1-minute cache
- Client Context: 5-minute cache
- Reduces database queries

### Special Security Features

**Withdrawal Password**
```typescript
// Separate password for withdrawals (hashed with bcrypt)
import bcrypt from "bcrypt"

// Setting withdrawal password
const hashedPassword = await bcrypt.hash(password, 10)
await supabase
  .from("profiles")
  .update({ withdrawal_password: hashedPassword })
  .eq("id", userId)

// Verifying withdrawal password
const { data: profile } = await supabase
  .from("profiles")
  .select("withdrawal_password")
  .eq("id", userId)
  .single()

const valid = await bcrypt.compare(inputPassword, profile.withdrawal_password)
```

**Credit Score System**
- Admin-managed trust score (0-100)
- Affects withdrawal approval priority
- Audit trail in `credit_score_history` table
- Default: 100 for new users

---

## Development Workflows

### Setup (First Time)

```bash
# 1. Clone repository
git clone <repo-url>
cd binapex-admin

# 2. Install dependencies (requires legacy peer deps)
npm install --legacy-peer-deps

# 3. Set up environment variables
cp .env.example .env.local

# Edit .env.local with your Supabase credentials:
# NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# SUPABASE_SERVICE_ROLE_KEY=eyJ...
# POSTGRES_URL=postgresql://...
# BLOB_READ_WRITE_TOKEN=vercel_blob_...
# ALPHAVANTAGE_API_KEY=...

# 4. Run development server
npm run dev

# 5. Open browser
# http://localhost:3000
```

### Daily Development Workflow

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install any new dependencies
npm install --legacy-peer-deps

# 3. Start dev server (with hot reload)
npm run dev

# 4. Make changes to code

# 5. Test locally at http://localhost:3000

# 6. Commit and push
git add .
git commit -m "feat: add feature description"
git push origin feature-branch

# 7. Create PR on GitHub
# 8. Deploy via Vercel (automatic on merge to main)
```

### Adding a New Feature

**Example**: Add a new admin statistics widget

```bash
# 1. Create server action for data fetching
# File: app/actions/admin-stats.ts
"use server"
import { createClient } from "@/lib/supabase/server"

export async function getCustomStats() {
  const supabase = await createClient()
  // Query logic...
  return { success: true, data }
}

# 2. Create React component
# File: components/admin/CustomStatsWidget.tsx
"use client"
import { useEffect, useState } from "react"
import { getCustomStats } from "@/app/actions/admin-stats"

export function CustomStatsWidget() {
  // Component logic...
}

# 3. Add to dashboard page
# File: app/admin/dashboard/page.tsx
import { CustomStatsWidget } from "@/components/admin/CustomStatsWidget"

export default function DashboardPage() {
  return (
    <div>
      <CustomStatsWidget />
      {/* Other widgets */}
    </div>
  )
}

# 4. Test locally
npm run dev

# 5. Commit changes
git add .
git commit -m "feat: add custom stats widget to admin dashboard"
git push origin feature/custom-stats
```

### Database Migrations

```bash
# 1. Create migration file
# File: supabase/migrations/YYYYMMDDHHMMSS_description.sql

-- Example: Add new column to profiles
ALTER TABLE profiles ADD COLUMN new_field TEXT;

-- Update RLS policies if needed
DROP POLICY IF EXISTS "policy_name" ON profiles;
CREATE POLICY "policy_name" ON profiles FOR SELECT USING (...);

-- Create indexes for performance
CREATE INDEX idx_profiles_new_field ON profiles(new_field);

# 2. Test migration locally (if running local Supabase)
supabase migration up

# 3. Apply to production via Supabase dashboard
# or use Supabase CLI:
supabase db push
```

### Environment Variable Updates

```bash
# 1. Update lib/env.ts with new variable
export const envSchema = z.object({
  // ... existing vars
  NEW_API_KEY: z.string().min(1),
})

# 2. Add to .env.local
NEW_API_KEY=your_api_key_here

# 3. Add to Vercel dashboard
# Settings → Environment Variables → Add

# 4. Redeploy
vercel deploy --prod
```

### Common Scripts

```bash
# Development
npm run dev          # Start dev server (port 3000)

# Build
npm run build        # Production build (outputs to .next/)

# Linting
npm run lint         # Run ESLint (max warnings: 0)

# Production
npm run start        # Start production server (after build)

# Custom Scripts
npm run test:money   # Test settlement calculations
```

---

## Code Conventions

### File Naming

- **Components**: `PascalCase.tsx` → `AdminDashboard.tsx`
- **Utilities**: `camelCase.ts` → `formatCurrency.ts`
- **Pages**: `page.tsx` (App Router convention)
- **Actions**: `kebab-case.ts` → `admin-users.ts`
- **Layouts**: `layout.tsx` (App Router convention)

### Component Structure

```typescript
// 1. Imports (grouped)
import { useState } from "react"  // React
import { Button } from "@/components/ui/button"  // Internal
import { formatCurrency } from "@/lib/utils"  // Utils
import type { User } from "@/lib/types/database"  // Types

// 2. Props interface
interface ComponentProps {
  user: User
  onUpdate: (user: User) => void
}

// 3. Component definition
export function ComponentName({ user, onUpdate }: ComponentProps) {
  // 4. Hooks
  const [state, setState] = useState()

  // 5. Event handlers
  const handleClick = () => {
    // Logic
  }

  // 6. Render
  return (
    <div className="container">
      {/* JSX */}
    </div>
  )
}

// 7. Display name (optional)
ComponentName.displayName = "ComponentName"
```

### Server Components vs Client Components

```typescript
// Server Component (default, no "use client")
// File: app/admin/users/page.tsx
import { createClient } from "@/lib/supabase/server"

export default async function UsersPage() {
  const supabase = await createClient()
  const { data } = await supabase.from("profiles").select()

  return <UsersTable users={data} />
}

// Force dynamic rendering (no caching)
export const dynamic = "force-dynamic"

// Client Component (needs interactivity)
// File: components/admin/UsersTable.tsx
"use client"  // Required for useState, useEffect, event handlers

import { useState } from "react"

export function UsersTable({ users }: Props) {
  const [filter, setFilter] = useState("")
  // Interactive logic...
}
```

### Server Actions Pattern

```typescript
// File: app/actions/admin-users.ts
"use server"  // Required at top of file

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { userUpdateSchema } from "@/lib/schemas/admin"

// 1. Helper function (not exported)
async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Unauthorized")

  const { data: role } = await supabase.rpc("get_user_role")
  if (role !== "admin") throw new Error("Admin access required")

  return { supabase, user }
}

// 2. Exported server action
export async function updateUserProfile(userId: string, data: unknown) {
  try {
    // Verify permissions
    const { supabase, user: adminUser } = await verifyAdmin()

    // Validate input
    const validData = userUpdateSchema.parse(data)

    // Perform operation
    const { error } = await supabase
      .from("profiles")
      .update(validData)
      .eq("id", userId)

    if (error) throw error

    // Log audit trail
    await supabase.from("audit_logs").insert({
      admin_id: adminUser.id,
      action: "update_user",
      target_type: "profile",
      target_id: userId,
      details: validData
    })

    // Revalidate affected pages
    revalidatePath("/admin/users")
    revalidatePath(`/admin/users/${userId}`)

    return { success: true }
  } catch (error) {
    console.error("[v0] updateUserProfile error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }
  }
}
```

### Styling Conventions

**Tailwind Classes**:
```typescript
// Use cn() utility for conditional classes
import { cn } from "@/lib/utils"

<div className={cn(
  "base-class",
  condition && "conditional-class",
  "another-class"
)} />

// Common patterns
<Card className="bg-black/50 backdrop-blur-sm border-gold/20">
<Button className="bg-gradient-to-r from-gold to-gold-dark">
<Text className="text-sm text-muted-foreground">
```

**Tailwind CSS v4 Configuration**:
- **No JS config file**: Tailwind v4 uses CSS-first configuration
- **Configuration**: All styling in `styles/globals.css` via CSS imports and custom properties
- **Theme Colors** (defined via CSS custom properties in `globals.css`):
  - Primary: Gold (#EBD062, #d4af37)
  - Background: Black (#0a0a0a, #0f0f0f)
  - Accent: Gold variants
  - Text: White/gray scale
- **Dark mode**: Uses CSS custom properties with `.dark` class

### Type Safety

```typescript
// 1. Use Zod for runtime validation
import { z } from "zod"

const userSchema = z.object({
  email: z.string().email(),
  balance: z.number().positive(),
})

type User = z.infer<typeof userSchema>

// 2. Use TypeScript strict mode
// tsconfig.json: "strict": true

// 3. Avoid 'any' - use 'unknown' for truly unknown types
function processData(data: unknown) {
  if (schema.safeParse(data).success) {
    // Now TypeScript knows the shape
  }
}

// 4. Use database types from Supabase
import type { Database } from "@/lib/types/database"
type Profile = Database["public"]["Tables"]["profiles"]["Row"]
```

### Error Handling Convention

```typescript
// Pattern 1: Server Actions
export async function serverAction() {
  try {
    // Logic
    return { success: true, data }
  } catch (error) {
    console.error("[v0] serverAction error:", error)
    return { success: false, error: error.message }
  }
}

// Pattern 2: API Routes
export async function GET(request: Request) {
  try {
    // Logic
    return Response.json({ success: true, data })
  } catch (error) {
    console.error("[v0] API error:", error)
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// Pattern 3: Client Components
try {
  const result = await serverAction()
  if (!result.success) {
    toast.error(result.error)
    return
  }
  toast.success("Operation successful")
} catch (error) {
  console.error("[v0] Client error:", error)
  toast.error("An unexpected error occurred")
}
```

### Import Aliases

```typescript
// @/* maps to project root
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { formatCurrency } from "@/lib/utils"
import type { Database } from "@/lib/types/database"

// Avoid relative imports like ../../components
```

### Comment Conventions

```typescript
// 1. Function comments (when non-obvious)
/**
 * Settles a binary options order and updates user balance.
 * @param orderId - UUID of the order to settle
 * @param outcome - "win" or "loss"
 * @returns Settlement result with payout amount
 */

// 2. Inline comments (sparingly, only when needed)
// Calculate payout with tier-based bonus multiplier
const payout = baseAmount * tierMultiplier

// 3. TODO comments (with context)
// TODO: Refactor to use bulk update when Supabase supports it

// 4. Security notes
// SECURITY: This uses service role key - never expose to client
```

---

## Common Tasks

### Adding a New Admin Page

```bash
# 1. Create page file
# File: app/admin/new-feature/page.tsx
import { createClient } from "@/lib/supabase/server"

export default async function NewFeaturePage() {
  const supabase = await createClient()

  // Fetch data
  const { data } = await supabase.from("table").select()

  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">New Feature</h1>
      {/* Content */}
    </div>
  )
}

export const dynamic = "force-dynamic"

# 2. Add to sidebar navigation
# File: components/layout/Sidebar.tsx
const navItems = [
  // ... existing items
  {
    title: "New Feature",
    icon: <Icon />,
    href: "/admin/new-feature"
  }
]

# 3. Test at /admin/new-feature
```

### Creating a New Server Action

```typescript
// File: app/actions/new-action.ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// Define schema
const inputSchema = z.object({
  field: z.string().min(1),
})

// Verify admin helper
async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error("Unauthorized")

  const { data: role } = await supabase.rpc("get_user_role")
  if (role !== "admin") throw new Error("Admin access required")

  return { supabase, user }
}

// Export action
export async function performAction(input: unknown) {
  try {
    const { supabase, user: adminUser } = await verifyAdmin()
    const validInput = inputSchema.parse(input)

    // Perform operation
    const { data, error } = await supabase
      .from("table")
      .insert(validInput)
      .select()
      .single()

    if (error) throw error

    // Audit log
    await supabase.from("audit_logs").insert({
      admin_id: adminUser.id,
      action: "perform_action",
      target_type: "table",
      target_id: data.id,
      details: validInput
    })

    // Revalidate
    revalidatePath("/admin/page")

    return { success: true, data }
  } catch (error) {
    console.error("[v0] performAction error:", error)
    return { success: false, error: error.message }
  }
}

// Use in component
"use client"
import { performAction } from "@/app/actions/new-action"
import { toast } from "sonner"

async function handleSubmit(data) {
  const result = await performAction(data)
  if (!result.success) {
    toast.error(result.error)
    return
  }
  toast.success("Success!")
}
```

### Adding Real-time Updates

```typescript
// File: hooks/useRealtimeData.ts
"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

export function useRealtimeData() {
  const [data, setData] = useState([])
  const supabase = createClient()

  useEffect(() => {
    // Initial fetch
    async function fetchData() {
      const { data } = await supabase.from("table").select()
      setData(data || [])
    }
    fetchData()

    // Subscribe to changes
    const channel = supabase
      .channel("realtime_data")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "table" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setData((prev) => [...prev, payload.new])
          } else if (payload.eventType === "UPDATE") {
            setData((prev) =>
              prev.map((item) =>
                item.id === payload.new.id ? payload.new : item
              )
            )
          } else if (payload.eventType === "DELETE") {
            setData((prev) =>
              prev.filter((item) => item.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    // Cleanup
    return () => {
      channel.unsubscribe()
    }
  }, [])

  return data
}

// Use in component
export function RealtimeComponent() {
  const data = useRealtimeData()

  return (
    <div>
      {data.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  )
}
```

### Adding a New Zod Schema

```typescript
// File: lib/schemas/new-schema.ts
import { z } from "zod"

// Define schema
export const newSchema = z.object({
  email: z.string().email("Invalid email address"),
  amount: z.number().positive("Amount must be positive"),
  type: z.enum(["deposit", "withdrawal"]),
  optional: z.string().optional(),
})

// Infer TypeScript type
export type NewSchemaType = z.infer<typeof newSchema>

// Use in server action
import { newSchema } from "@/lib/schemas/new-schema"

export async function processData(input: unknown) {
  try {
    const validData = newSchema.parse(input)
    // Now validData is type-safe
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.flatten() }
    }
    throw error
  }
}

// Use in React Hook Form
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

const form = useForm({
  resolver: zodResolver(newSchema),
  defaultValues: {
    email: "",
    amount: 0,
    type: "deposit",
  },
})
```

### Querying the Database

```typescript
// Simple select
const { data, error } = await supabase
  .from("profiles")
  .select("*")

// Select specific columns
const { data } = await supabase
  .from("profiles")
  .select("id, email, balance")

// With filters
const { data } = await supabase
  .from("profiles")
  .select("*")
  .eq("role", "trader")
  .gte("balance", 1000)
  .order("created_at", { ascending: false })
  .limit(10)

// With joins
const { data } = await supabase
  .from("transactions")
  .select(`
    *,
    profiles:user_id (
      full_name,
      email
    )
  `)

// Using RPC
const { data } = await supabase
  .rpc("get_user_role")

// With parameters
const { data } = await supabase
  .rpc("execute_binary_trade", {
    user_id: userId,
    amount: 100,
    type: "call"
  })

// Insert
const { data, error } = await supabase
  .from("profiles")
  .insert({ email: "user@example.com" })
  .select()
  .single()

// Update
const { error } = await supabase
  .from("profiles")
  .update({ balance: 1000 })
  .eq("id", userId)

// Delete
const { error } = await supabase
  .from("profiles")
  .delete()
  .eq("id", userId)
```

---

## Security Considerations

### Critical Security Issues

**🚨 PRIORITY FIXES NEEDED**:

1. **Plain Text Password Storage**
   - **Issue**: `visible_password` stores passwords in plain text
   - **Risk**: Database breach exposes all user passwords
   - **Fix**: Remove field and rely on Supabase Auth only

2. **TypeScript Build Errors Ignored**
   - **Issue**: `ignoreBuildErrors: true` in next.config.js
   - **Risk**: Type safety bugs slip into production
   - **Fix**: Fix all TypeScript errors and set to `false`

3. **No Rate Limiting**
   - **Issue**: Middleware structure exists but not implemented
   - **Risk**: API abuse, brute force attacks
   - **Fix**: Implement rate limiting with Upstash Redis

### Security Best Practices

**Environment Variables**
```bash
# NEVER commit these files
.env
.env.local
.env.production

# ALWAYS use environment variables for secrets
SUPABASE_SERVICE_ROLE_KEY=...  # Never in client code
BLOB_READ_WRITE_TOKEN=...       # Never in client code
```

**Row Level Security**
```sql
-- Always enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Create policies for all operations
CREATE POLICY "Users can view own data" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all data" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

**Input Validation**
```typescript
// ALWAYS validate user input with Zod
import { z } from "zod"

const schema = z.object({
  email: z.string().email(),
  amount: z.number().positive().max(1000000),
})

// Validate before database operations
const validData = schema.parse(userInput)
```

**SQL Injection Prevention**
```typescript
// ✅ SAFE: Parameterized queries (Supabase does this)
await supabase
  .from("profiles")
  .select()
  .eq("email", userInput)

// ❌ UNSAFE: String concatenation (don't do this)
await supabase.rpc("raw_query", {
  query: `SELECT * FROM profiles WHERE email = '${userInput}'`
})
```

**XSS Prevention**
```typescript
// React automatically escapes JSX
<div>{userInput}</div>  // ✅ Safe

// Be careful with dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userInput }} />  // ❌ Dangerous

// Sanitize if needed
import DOMPurify from "dompurify"
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />  // ✅ Safe
```

**CSRF Protection**
- Next.js Server Actions have built-in CSRF protection
- Always use POST/PUT/DELETE for mutations (never GET)
- Validate origin header for API routes

**Authentication Checklist**
- ✅ Use HTTPS in production (Vercel enforces this)
- ✅ HTTP-only cookies for session tokens
- ✅ Multi-layer auth checks (edge, server, database)
- ✅ Security headers configured (CSP, HSTS, X-Frame-Options, etc.)
- ✅ Secure RPC implementations for admin operations
- ❌ Missing: 2FA/MFA implementation
- ❌ Missing: Session timeout configuration
- ❌ Missing: IP-based access controls

**Audit Logging**
```typescript
// ALWAYS log admin actions
await supabase.from("audit_logs").insert({
  admin_id: adminUser.id,
  action: "update_user_balance",
  target_type: "profile",
  target_id: userId,
  details: { old_balance, new_balance },
  ip_address: request.ip
})
```

---

## Testing Strategy

### Current Status

**Test Coverage**: 0% (no tests implemented)

**Test Frameworks**: None configured

### Recommended Testing Setup

**1. Install Testing Libraries**
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install --save-dev @playwright/test  # For E2E tests
```

**2. Configure Vitest**
```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
})
```

**3. Unit Testing Pattern**
```typescript
// __tests__/lib/utils.test.ts
import { describe, it, expect } from "vitest"
import { formatCurrency } from "@/lib/utils"

describe("formatCurrency", () => {
  it("formats USD correctly", () => {
    expect(formatCurrency(1000, "USD")).toBe("$1,000.00")
  })

  it("handles negative amounts", () => {
    expect(formatCurrency(-500, "USD")).toBe("-$500.00")
  })
})
```

**4. Component Testing Pattern**
```typescript
// __tests__/components/UserCard.test.tsx
import { render, screen } from "@testing-library/react"
import { UserCard } from "@/components/admin/UserCard"

describe("UserCard", () => {
  it("renders user information", () => {
    const user = {
      id: "123",
      email: "test@example.com",
      balance: 1000,
    }

    render(<UserCard user={user} />)

    expect(screen.getByText("test@example.com")).toBeInTheDocument()
    expect(screen.getByText("$1,000.00")).toBeInTheDocument()
  })
})
```

**5. API Testing Pattern**
```typescript
// __tests__/app/api/admin/users.test.ts
import { describe, it, expect, vi } from "vitest"
import { GET } from "@/app/api/admin/users/route"

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({ data: [], error: null }),
    }),
  }),
}))

describe("/api/admin/users", () => {
  it("returns users list", async () => {
    const response = await GET(new Request("http://localhost/api/admin/users"))
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })
})
```

**6. E2E Testing Pattern**
```typescript
// e2e/admin-login.spec.ts
import { test, expect } from "@playwright/test"

test("admin can login and view dashboard", async ({ page }) => {
  await page.goto("http://localhost:3000/admin")

  // Should redirect to login
  await expect(page).toHaveURL(/login/)

  // Fill login form
  await page.fill('input[name="email"]', "admin@example.com")
  await page.fill('input[name="password"]', "password123")
  await page.click('button[type="submit"]')

  // Should see dashboard
  await expect(page).toHaveURL(/admin\/dashboard/)
  await expect(page.locator("h1")).toContainText("Dashboard")
})
```

**7. Test Scripts in package.json**
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### Testing Priorities

1. **Critical Path Tests** (Implement First)
   - User authentication flow
   - Transaction processing
   - Binary trade settlement
   - Admin authorization checks

2. **Unit Tests**
   - Utility functions (formatCurrency, cn, etc.)
   - Validation schemas (Zod schemas)
   - Tier calculation logic

3. **Integration Tests**
   - Server Actions with database
   - API routes
   - Real-time subscriptions

4. **E2E Tests**
   - Admin login → dashboard flow
   - User management flow
   - Transaction approval flow
   - Trade settlement flow

---

## Deployment

### Vercel Deployment (Recommended)

**Prerequisites**:
- Vercel account
- GitHub repository connected
- Environment variables configured

**Automatic Deployment** (on push to main):
```bash
# 1. Push to main branch
git push origin main

# 2. Vercel automatically:
#    - Detects push
#    - Runs 'npm install --legacy-peer-deps'
#    - Runs 'npm run build'
#    - Deploys to production

# 3. Check deployment status
# https://vercel.com/dashboard
```

**Manual Deployment**:
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

**Environment Variables in Vercel**:
1. Go to Project Settings → Environment Variables
2. Add all variables from `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   POSTGRES_URL
   POSTGRES_URL_NON_POOLING
   BLOB_READ_WRITE_TOKEN
   ALPHAVANTAGE_API_KEY
   NEXT_PUBLIC_TAWK_PROPERTY_ID (optional)
   NEXT_PUBLIC_TAWK_WIDGET_ID (optional)
   ```
3. Set environment: Production, Preview, Development
4. Save and redeploy

### Docker Deployment

**Build Image**:
```bash
# Build production image
docker build -t binapex-admin .

# Or use docker-compose
docker-compose build
```

**Run Container**:
```bash
# Run with docker
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... \
  -e SUPABASE_SERVICE_ROLE_KEY=eyJ... \
  binapex-admin

# Or use docker-compose
docker-compose up -d
```

**Docker Compose** (production):
```yaml
# docker-compose.yml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - POSTGRES_URL=${POSTGRES_URL}
      - BLOB_READ_WRITE_TOKEN=${BLOB_READ_WRITE_TOKEN}
      - ALPHAVANTAGE_API_KEY=${ALPHAVANTAGE_API_KEY}
      - NODE_ENV=production
    restart: unless-stopped
```

### Database Migrations

**Apply Migrations to Production**:
```bash
# Using Supabase CLI
supabase login
supabase link --project-ref your-project-ref
supabase db push

# Or manually via Supabase Dashboard
# 1. Go to SQL Editor
# 2. Paste migration SQL
# 3. Run query
```

### Post-Deployment Checklist

- [ ] Verify environment variables are set correctly
- [ ] Test authentication flow
- [ ] Check Sentry error tracking is working
- [ ] Verify database connections
- [ ] Test real-time subscriptions
- [ ] Check file upload (Vercel Blob)
- [ ] Verify API rate limits (if implemented)
- [ ] Test admin access controls
- [ ] Check production logs for errors
- [ ] Verify SSL certificate (HTTPS)

### Monitoring

**Vercel Dashboard**:
- Real-time logs
- Function execution logs
- Error tracking
- Performance metrics

**Sentry**:
- Error tracking
- Performance monitoring
- Release tracking

**Supabase Dashboard**:
- Database performance
- API usage
- Auth metrics
- Storage usage

---

## Troubleshooting

### Common Issues

**1. "Unauthorized" Error in Admin Panel**

**Symptoms**: Redirected to login or see "Unauthorized" message

**Causes**:
- User role is not "admin" in database
- Session expired
- Role cache outdated

**Solutions**:
```sql
-- Check user role
SELECT id, email, role FROM profiles WHERE email = 'your-email@example.com';

-- Update to admin (if needed)
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';

-- Clear cookies and re-login
```

**2. Build Errors During Deployment**

**Symptoms**: Build fails on Vercel

**Causes**:
- TypeScript errors (build errors ignored locally)
- Missing environment variables
- Dependency issues

**Solutions**:
```bash
# Test build locally
npm run build

# Fix TypeScript errors
npm run lint

# Check environment variables
# Ensure all vars in lib/env.ts are set in Vercel
```

**3. Real-time Updates Not Working**

**Symptoms**: Dashboard stats don't update automatically

**Causes**:
- Supabase Realtime not enabled for table
- Subscription not properly cleaned up
- Browser tab throttled

**Solutions**:
```sql
-- Enable Realtime for table (in Supabase Dashboard)
ALTER TABLE table_name REPLICA IDENTITY FULL;

-- Or via SQL Editor
-- Database → Replication → Enable for table
```

```typescript
// Ensure cleanup in useEffect
useEffect(() => {
  const channel = supabase.channel("name").subscribe()

  // IMPORTANT: Return cleanup function
  return () => {
    channel.unsubscribe()
  }
}, [])
```

**4. "Legacy Peer Deps" Warning**

**Symptoms**: npm install fails or shows peer dependency errors

**Cause**: React 19 not fully supported by all libraries

**Solution**:
```bash
# Always use legacy peer deps flag
npm install --legacy-peer-deps

# Or add to .npmrc
echo "legacy-peer-deps=true" > .npmrc
```

**5. Database Connection Errors**

**Symptoms**: "Failed to connect to database" errors

**Causes**:
- Wrong connection string
- IP restrictions on Supabase
- Connection pool exhausted

**Solutions**:
```bash
# Test connection string
psql "postgresql://..."

# Check Supabase Dashboard → Settings → Database
# Ensure connection pooling is enabled

# Use POSTGRES_URL_NON_POOLING for migrations
# Use POSTGRES_URL for application queries
```

**6. Middleware Not Running**

**Symptoms**: Unauthenticated users can access admin pages

**Cause**: Middleware matcher pattern excludes route

**Solution**:
```typescript
// Check middleware.ts config
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

// Ensure your route is not excluded
```

**7. Server Actions Failing**

**Symptoms**: "Server Action failed" errors

**Causes**:
- Missing `"use server"` directive
- Return value not serializable
- Error not caught

**Solutions**:
```typescript
// Ensure "use server" at top
"use server"

// Wrap in try-catch
try {
  // Logic
  return { success: true, data }
} catch (error) {
  console.error("[v0] Action error:", error)
  return { success: false, error: error.message }
}

// Don't return non-serializable values (functions, symbols, etc.)
```

### Debugging Tips

**Enable Verbose Logging**:
```typescript
// Add to lib/supabase/server.ts
const supabase = createServerClient(url, key, {
  global: {
    headers: { "x-supabase-debug": "true" }
  }
})
```

**Check Browser Console**:
```bash
# Look for:
# - Network errors (401, 403, 500)
# - JavaScript errors
# - Failed requests
# - WebSocket connection issues
```

**Check Vercel Logs**:
```bash
# View real-time logs
vercel logs --follow

# View logs for specific deployment
vercel logs <deployment-url>
```

**Check Sentry**:
```bash
# Look for:
# - Unhandled errors
# - Performance issues
# - User-reported issues
```

**Database Query Debugging**:
```typescript
// Log Supabase queries
const { data, error } = await supabase
  .from("profiles")
  .select()

console.log("Query result:", { data, error })

// Check query performance in Supabase Dashboard
// Database → Query Performance
```

---

## Additional Resources

### Documentation Links

- **Next.js**: https://nextjs.org/docs
- **React**: https://react.dev
- **Supabase**: https://supabase.com/docs
- **Shadcn/ui**: https://ui.shadcn.com
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Zod**: https://zod.dev
- **React Hook Form**: https://react-hook-form.com

### Project-Specific Docs

- `SECURITY.md` - Comprehensive security checklist
- `DEPLOYMENT.md` - Step-by-step deployment guide
- `README.md` - Project overview and quick start

### Support

- **GitHub Issues**: Report bugs and feature requests
- **Internal Team**: Contact admin for database access

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-14 | 1.1.0 | Updated package versions, config files (.mjs), Tailwind v4 notes, admin pages list, security enhancements |
| 2026-01-12 | 1.0.0 | Initial comprehensive documentation |

---

**END OF CLAUDE.MD**

> This document is maintained for AI assistants working with the Binapex Admin Portal codebase. Keep it updated as the architecture and conventions evolve.
