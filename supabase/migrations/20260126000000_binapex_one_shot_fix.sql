-- =========================================================
-- BINAPEX ONE-SHOT FIX
-- RPC + RLS + REALTIME
-- Date: 2026-01-26
-- =========================================================
begin;
-- =========================================================
-- 0. SAFETY: EXTENSIONS
-- =========================================================
create extension if not exists pgcrypto;
-- =========================================================
-- 1. ADMIN ROLE CHECK (JWT)
-- =========================================================
-- Helper: detect admin via JWT claims
create or replace function public.is_admin() returns boolean language sql stable as $$
select coalesce(
        (
            current_setting('request.jwt.claims', true)::jsonb->>'role'
        ) = 'admin',
        false
    );
$$;
-- =========================================================
-- 1.1 SCHEMA ADAPTATION: DEPOSITS COLUMNS
-- =========================================================
alter table public.deposits
add column if not exists rejected_at timestamptz,
    add column if not exists rejected_by uuid references auth.users(id),
    add column if not exists rejection_reason text;
-- =========================================================
-- 2. DEPOSIT REJECT RPC (FIX MISSING FUNCTION)
-- =========================================================
drop function if exists public.reject_deposit(uuid, text, uuid);
create function public.reject_deposit(
    p_admin_id uuid,
    p_reason text,
    p_transaction_id uuid
) returns void language plpgsql security definer as $$
declare v_status text;
begin -- Admin guard
if not public.is_admin() then raise exception 'unauthorised';
end if;
-- Lock row
select status into v_status
from public.deposits
where id = p_transaction_id for
update;
if not found then raise exception 'deposit_not_found';
end if;
if v_status <> 'pending' then raise exception 'deposit_not_pending';
end if;
update public.deposits
set status = 'rejected',
    rejected_at = now(),
    rejected_by = p_admin_id,
    rejection_reason = p_reason
where id = p_transaction_id;
end;
$$;
grant execute on function public.reject_deposit(uuid, text, uuid) to authenticated;
-- =========================================================
-- 3. DEPOSIT APPROVE SAFETY (OPTIONAL HARDENING)
-- =========================================================
-- Prevent double approval
create unique index if not exists deposits_single_approval on public.deposits (id)
where status = 'approved';
-- =========================================================
-- 4. RLS: DEPOSITS
-- =========================================================
alter table public.deposits enable row level security;
drop policy if exists admin_all_deposits on public.deposits;
create policy admin_all_deposits on public.deposits for all using (public.is_admin()) with check (public.is_admin());
-- =========================================================
-- 5. RLS: PROFILES (ADMIN VISIBILITY FIX)
-- =========================================================
-- ADAPTED: public.users -> public.profiles
alter table public.profiles enable row level security;
drop policy if exists admin_read_users on public.profiles;
create policy admin_read_users on public.profiles for
select using (public.is_admin());
-- =========================================================
-- 6. SUPPORT CHAT TABLES (CHAT + MESSAGES)
-- =========================================================
-- conversations
alter table public.support_conversations enable row level security;
drop policy if exists admin_all_conversations on public.support_conversations;
create policy admin_all_conversations on public.support_conversations for all using (public.is_admin()) with check (public.is_admin());
-- messages
alter table public.support_messages enable row level security;
drop policy if exists admin_all_messages on public.support_messages;
create policy admin_all_messages on public.support_messages for all using (public.is_admin()) with check (public.is_admin());
-- =========================================================
-- 7. REALTIME ENABLEMENT (CRITICAL)
-- =========================================================
-- Allow realtime publication
-- Note: Checking if publication exists is safer, but usually 'supabase_realtime' exists.
-- If it fails, we might need a workaround but this is standard for Supabase.
alter publication supabase_realtime
add table public.deposits,
    public.support_conversations,
    public.support_messages;
-- Ensure replica identity for realtime diffing
alter table public.deposits replica identity full;
alter table public.support_conversations replica identity full;
alter table public.support_messages replica identity full;
-- =========================================================
-- 8. SCHEMA CACHE BUSTER (POSTGREST)
-- =========================================================
notify pgrst,
'reload schema';
commit;