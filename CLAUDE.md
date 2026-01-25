# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Binapex Admin Portal** - A Next.js admin application for managing a binary options trading platform.

**Tech Stack:**
- **Frontend**: Next.js 16.1.7, React 19.2.0, TypeScript 5.x, Tailwind CSS 4.1.9, Shadcn/ui (New York style)
- **Backend**: Supabase (PostgreSQL, Auth, Realtime), Vercel Blob, Sentry
- **Deployment**: Vercel (primary) + Docker support

**Architecture**: Server-first monolithic Next.js application with:
- React Server Components for data fetching
- Server Actions for mutations
- Supabase Realtime for live updates
- Edge Middleware for authentication

## Essential Commands

### Development
```bash
npm install --legacy-peer-deps    # Install dependencies (required)
npm run dev                       # Start dev server (http://localhost:3000)
```

### Build & Deploy
```bash
npm run build                     # Production build
npm run start                     # Start production server
npm run lint                      # ESLint (max warnings: 0)
```

### Custom Scripts
```bash
npm run test:money                # Test settlement calculations
```

### Docker
```bash
docker-compose build              # Build container
docker-compose up -d              # Run container
```

## Codebase Structure

```
app/                          # Next.js App Router
├── actions/                  # Server Actions (mutations)
│   ├── admin-banking.ts      # Banking operations
│   ├── admin-users.ts        # User management
│   └── assets.ts             # Asset management
├── admin/                    # Admin portal pages
│   ├── dashboard/            # Main dashboard
│   ├── users/                # User management
│   ├── withdrawals/          # Withdrawal approvals
│   ├── trades/               # Trade management
│   ├── settlements/          # Trade settlements
│   ├── support/              # Support chat
│   └── layout.tsx            # Admin layout wrapper
├── api/                      # REST API endpoints
│   └── admin/                # Admin-specific APIs

components/                   # React components
├── admin/                    # Admin-specific components
├── layout/                   # Layout components (Sidebar, Header)
└── ui/                       # Shadcn UI components

lib/                         # Core utilities
├── supabase/                 # Supabase clients (server.ts, client.ts)
├── schemas/                  # Zod validation schemas
├── utils/                    # Helper functions (cn, formatCurrency)
├── constants/                # App constants (tiers.ts)
└── env.ts                    # Environment validation

supabase/                     # Database management
├── migrations/               # SQL migration files
└── functions/                # Edge Functions

middleware.ts                 # Edge middleware (auth check)
```

## Key Patterns & Conventions

### Server Components (Default)
```typescript
// app/admin/users/page.tsx
import { createClient } from "@/lib/supabase/server"

export default async function UsersPage() {
  const supabase = await createClient()
  const { data } = await supabase.from("profiles").select("*")
  return <UsersTable users={data} />
}

export const dynamic = "force-dynamic"  // No static caching
```

### Client Components (When Needed)
```typescript
// components/admin/SomeComponent.tsx
"use client"

import { useState, useEffect } from "react"
```

### Server Actions Pattern
```typescript
// app/actions/admin-users.ts
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// Always verify admin access first
async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: role } = await supabase.rpc("get_user_role")
  if (role !== "admin") throw new Error("Admin access required")

  return { supabase, user }
}

export async function updateUserProfile(userId: string, data: unknown) {
  try {
    const { supabase, user: adminUser } = await verifyAdmin()

    // Validate input with Zod
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
    return { success: false, error: error.message }
  }
}
```

### Authentication Flow
```
1. User Login → Supabase Auth creates JWT session
2. Session stored in HTTP-only cookie (sb-*)
3. Edge Middleware intercepts all requests
4. middleware.ts → updateSession() checks auth
5. Role cached for 1 minute in middleware
6. Additional checks in Server Actions/API routes
```

### Real-time Updates
```typescript
// hooks/useAdminRealtime.ts
"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

export function useAdminRealtime() {
  const [stats, setStats] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    // Initial fetch
    const fetchStats = async () => {
      const { data } = await supabase.rpc("get_admin_stats")
      setStats(data)
    }
    fetchStats()

    // Subscribe to changes
    const channel = supabase
      .channel("admin_stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        fetchStats
      )
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [])

  return stats
}
```

## Database Schema (Key Tables)

### profiles
```sql
id UUID PRIMARY KEY (references auth.users)
email TEXT
full_name TEXT
balance DECIMAL(20,8)
locked_balance DECIMAL(20,8)
tier TEXT (silver, gold, platinum, diamond)
total_trade_volume DECIMAL(20,8)
credit_score INTEGER (0-100)
role TEXT (admin, trader)
withdrawal_password TEXT (bcrypt hashed)
created_at TIMESTAMPTZ
```

### transactions
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES profiles
type TEXT (deposit, withdrawal, bonus, trade_profit, trade_loss)
amount DECIMAL(20,8)
status TEXT (pending, approved, rejected, cancelled)
payment_method TEXT
proof_url TEXT
admin_notes TEXT
processed_by UUID REFERENCES profiles
created_at TIMESTAMPTZ
```

### orders (Binary Options)
```sql
id UUID PRIMARY KEY
user_id UUID REFERENCES profiles
type TEXT (call, put)
amount DECIMAL(20,8)
strike_price DECIMAL(20,8)
expiry_time TIMESTAMPTZ
status TEXT (open, closed, expired, cancelled)
payout DECIMAL(20,8)
created_at TIMESTAMPTZ
```

### settlements
```sql
id UUID PRIMARY KEY
order_id UUID REFERENCES orders
final_price DECIMAL(20,8)
outcome TEXT (win, loss)
payout_amount DECIMAL(20,8)
settled_by UUID REFERENCES profiles
rationale TEXT
supporting_docs TEXT[]
created_at TIMESTAMPTZ
```

## Authentication & Authorization

### Role System
- **Roles**: `admin` | `trader` (stored in `profiles.role`)
- **Default**: New users are `trader`
- **Admin Creation**: Manual SQL update required
  ```sql
  UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';
  ```

### Multi-Layer Security
1. **Edge Middleware**: Validates JWT, caches role (1-min TTL)
2. **Server Actions**: `verifyAdmin()` checks role via RPC
3. **Database RLS**: Row-level security policies
4. **AdminRoute Component**: Client-side fallback check

### Special Features
- **Withdrawal Password**: Separate bcrypt-hashed password for withdrawals
- **Credit Score**: Admin-managed trust score (0-100) affects withdrawal priority
- **Audit Logs**: All admin actions logged to `audit_logs` table

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Never expose to client
POSTGRES_URL=postgresql://...
BLOB_READ_WRITE_TOKEN=vercel_blob_...
ALPHAVANTAGE_API_KEY=...
```

## Common Tasks

### Add a New Admin Page
1. Create page: `app/admin/new-feature/page.tsx`
2. Add to sidebar: `components/layout/Sidebar.tsx`
3. Test at `/admin/new-feature`

### Add a Server Action
1. Create file in `app/actions/`
2. Use `"use server"` directive
3. Always call `verifyAdmin()` first
4. Validate input with Zod
5. Log to audit trail
6. Revalidate affected paths

### Add Real-time Updates
1. Create hook in `hooks/`
2. Use `supabase.channel()` with `postgres_changes`
3. Always cleanup subscription in `useEffect` return
4. Use in client component

### Database Migrations
```bash
# Create migration file
# File: supabase/migrations/YYYYMMDDHHMMSS_description.sql

# Apply locally (if using local Supabase)
supabase migration up

# Push to production
supabase db push
```

## Troubleshooting

### "Unauthorized" Error
```sql
-- Check user role
SELECT id, email, role FROM profiles WHERE email = 'your-email@example.com';

-- Update to admin
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

### Build Errors
```bash
# Test build locally
npm run build

# Fix TypeScript errors
npm run lint
```

### Real-time Not Working
- Enable Realtime in Supabase Dashboard (Database → Replication)
- Ensure cleanup in useEffect return

### Legacy Peer Deps Warning
```bash
# Always use this flag
npm install --legacy-peer-deps
```

## Important Notes

- **TypeScript**: Strict mode enabled, but `ignoreBuildErrors: true` in next.config.mjs
- **Tailwind CSS v4**: Uses CSS-first config (no tailwind.config.js)
- **Shadcn/ui**: New York style, RSC enabled
- **Import Aliases**: `@/` maps to project root
- **Error Logging**: Use `[v0]` prefix for console.error (legacy convention)
- **Decimal Precision**: Financial amounts use DECIMAL(20,8) or DECIMAL(28,10)

## Security Considerations

**⚠️ Critical Issues:**
- `visible_password` field stores plain text passwords - remove this field
- `ignoreBuildErrors: true` allows TypeScript errors into production - fix errors and set to `false`
- No rate limiting implemented - consider adding Upstash Redis

**Best Practices:**
- Never commit `.env` files
- Use `verifyAdmin()` in all server actions
- Always validate input with Zod
- Log all admin actions to audit_logs
- Use parameterized queries (Supabase does this automatically)
- HTTPS enforced in production (Vercel)

## Testing

**Current Status**: No test coverage (0%)

**Recommended Setup** (not yet implemented):
```bash
npm install --save-dev vitest @testing-library/react @playwright/test
```

**Priority Tests**:
1. User authentication flow
2. Transaction processing
3. Binary trade settlement
4. Admin authorization checks

## Deployment

### Vercel (Recommended)
- Automatic on push to main branch
- Environment variables configured in Vercel dashboard
- Check deployment status at vercel.com/dashboard

### Docker
```bash
docker-compose build
docker-compose up -d
```

## Additional Resources

- **SECURITY.md** - Security checklist
- **DEPLOYMENT.md** - Deployment guide
- **README.md** - Project overview
- **Supabase Dashboard** - Database management
- **Vercel Dashboard** - Deployment monitoring
- **Sentry** - Error tracking

---

**Last Updated**: 2026-01-23
**Codebase Version**: 0.1.0
**Next.js**: 16.1.7 | **React**: 19.2.0 | **Tailwind**: 4.1.9
