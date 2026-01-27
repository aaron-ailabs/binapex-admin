-- =========================================================
-- BINAPEX — ONE-SHOT SYSTEM HARDENING
-- Realtime fallback · Admin audit · Trade settlement
-- Date: 2026-01-26
-- =========================================================
begin;
-- =========================================================
-- 0. CORE HELPERS
-- =========================================================
create extension if not exists pgcrypto;
create or replace function public.is_admin() returns boolean language sql stable as $$
select coalesce(
        (
            current_setting('request.jwt.claims', true)::jsonb->>'role'
        ) = 'admin',
        false
    );
$$;
-- =========================================================
-- 1. ADMIN ACTION AUDIT LOG (IMMUTABLE)
-- =========================================================
create table if not exists public.admin_audit_log (
    id uuid primary key default gen_random_uuid(),
    admin_id uuid not null,
    action text not null,
    target_type text not null,
    target_id uuid,
    metadata jsonb default '{}',
    created_at timestamptz default now()
);
alter table public.admin_audit_log enable row level security;
drop policy if exists admin_read_audit on public.admin_audit_log;
create policy admin_read_audit on public.admin_audit_log for
select using (public.is_admin());
-- =========================================================
-- 2. REALTIME FALLBACK POLLING SUPPORT
-- =========================================================
-- Add updated_at if missing (polling anchor)
alter table public.support_messages
add column if not exists updated_at timestamptz default now();
alter table public.deposits
add column if not exists updated_at timestamptz default now();
-- ADAPTED: orders already has updated_at, but ensuring just in case or using it as anchor
-- alter table public.orders add column if not exists updated_at timestamptz default now();
-- Polling RPC (generic)
create or replace function public.poll_updates(p_table text, p_since timestamptz) returns setof jsonb language plpgsql security definer as $$ begin if not public.is_admin() then raise exception 'unauthorised';
end if;
return query execute format(
    'select to_jsonb(t) from %I t where updated_at > $1 order by updated_at asc',
    p_table
) using p_since;
end;
$$;
grant execute on function public.poll_updates(text, timestamptz) to authenticated;
-- =========================================================
-- 3. TRADE SETTLEMENT RPC (CRITICAL)
-- =========================================================
-- ADAPTED: Targeting public.orders and public.profiles(balance_usd)
create or replace function public.settle_trade(
        p_admin_id uuid,
        p_trade_id uuid,
        p_result text -- 'win' | 'loss'
    ) returns void language plpgsql security definer as $$
declare v_trade record;
v_payout numeric;
begin if not public.is_admin() then raise exception 'unauthorised';
end if;
-- ADAPTED: Using 'orders' table
select * into v_trade
from public.orders
where id = p_trade_id for
update;
if not found then raise exception 'trade_not_found';
end if;
-- ADAPTED: Checking if status is 'OPEN' (uppercase in orders usually)
-- Based on previous migration 20260121155926_fix_is_admin_and_settle_rpc.sql, it uses 'OPEN'
if upper(v_trade.status) <> 'OPEN' then raise exception 'trade_not_open';
end if;
if p_result = 'win' then -- v_trade.payout_rate is usually an integer representing percentage
v_payout := v_trade.amount * (v_trade.payout_rate::numeric / 100.0);
-- ADAPTED: Updating profiles.balance_usd
update public.profiles
set balance_usd = balance_usd + (v_trade.amount + v_payout) -- Returning stake + profit
where id = v_trade.user_id;
end if;
-- ADAPTED: Update order status to uppercase to match existing patterns
update public.orders
set status = upper(p_result),
    updated_at = now() -- Note: orders doesn't have settled_at/settled_by in its base schema usually, 
    -- but we can add them to the audit log instead if columns don't exist.
where id = p_trade_id;
insert into public.admin_audit_log (
        admin_id,
        action,
        target_type,
        target_id,
        metadata
    )
values (
        p_admin_id,
        'TRADE_SETTLED',
        'trade',
        p_trade_id,
        jsonb_build_object(
            'result',
            p_result,
            'amount',
            v_trade.amount,
            'payout_rate',
            v_trade.payout_rate
        )
    );
end;
$$;
grant execute on function public.settle_trade(uuid, uuid, text) to authenticated;
-- =========================================================
-- 4. REALTIME PUBLICATION (NON-BLOCKING)
-- =========================================================
-- Safe additions
do $$ begin if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'support_messages'
) then alter publication supabase_realtime
add table public.support_messages;
end if;
if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'deposits'
) then alter publication supabase_realtime
add table public.deposits;
end if;
if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'orders'
) then alter publication supabase_realtime
add table public.orders;
end if;
end $$;
alter table public.support_messages replica identity full;
alter table public.deposits replica identity full;
alter table public.orders replica identity full;
-- =========================================================
-- 5. SCHEMA CACHE REFRESH
-- =========================================================
notify pgrst,
'reload schema';
commit;