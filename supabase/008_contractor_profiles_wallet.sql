-- =======================================================================================
-- Tarmem — 008: contractor profiles, and the wallet (the wallet stays OFF until payments are live)
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run. ("Run without RLS" if asked.)
-- Safe to run more than once. Needs 001–007 to have been run first.
--
--   1. A contractor maintains their own public profile: the introduction, the city, the trades.
--      The company NAME stays the one Tarmem verified; changing it goes through the team.
--      Signed-in people see a contractor's profile and reviews; a review shows the reviewer's
--      first name only. Nobody's mobile, email or licence number is ever part of it.
--   2. The wallet: a contractor's bank account for payouts, and a record of every deposit and
--      payout. A request is only ever a REQUEST: money is confirmed by an admin (until a payment
--      provider reports it by itself). Nothing can be requested while payments_live is off.
-- =======================================================================================

-- 1. contractor profiles ------------------------------------------------------------------
alter table public.profiles add column if not exists trades text[] check (trades is null or cardinality(trades) between 1 and 12);
grant update (trades) on public.profiles to authenticated;

create or replace view public.verified_contractors as
  select a.user_id, a.company, coalesce(p.city, a.city) as city, coalesce(p.trades, a.trades) as trades, a.created_at as since,
         (select round(avg(r.stars)::numeric, 1) from public.reviews r where r.contractor_id = a.user_id) as rating,
         (select count(*) from public.reviews r where r.contractor_id = a.user_id) as reviews,
         (select count(*) from public.projects pr where pr.contractor_id = a.user_id and pr.status = 'completed') as done,
         p.about as bio
  from public.contractor_applications a
  join public.profiles p on p.id = a.user_id
  where a.status = 'verified';
revoke all on public.verified_contractors from anon, authenticated;
grant select on public.verified_contractors to authenticated;

create or replace view public.contractor_reviews as
  select r.contractor_id, r.stars, r.body, r.created_at, split_part(btrim(p.full_name), ' ', 1) as reviewer
  from public.reviews r join public.profiles p on p.id = r.homeowner_id;
revoke all on public.contractor_reviews from anon, authenticated;
grant select on public.contractor_reviews to authenticated;

-- 2. the wallet (off until payments are live) ------------------------------------------------
create table if not exists public.payout_accounts (
  user_id     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  holder      text not null check (char_length(btrim(holder)) between 3 and 120),
  bank        text not null check (char_length(btrim(bank)) between 2 and 80),
  iban        text not null check (iban ~ '^SA[0-9]{22}$'),
  updated_at  timestamptz not null default now()
);
alter table public.payout_accounts enable row level security;
drop policy if exists "a contractor keeps their own payout account" on public.payout_accounts;
create policy "a contractor keeps their own payout account" on public.payout_accounts
  for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() and public.my_role() = 'contractor'
              and coalesce((select enabled from public.platform_flags where key = 'payments_live'), false));
revoke all on public.payout_accounts from anon, authenticated;
grant select on public.payout_accounts to authenticated;
grant insert (holder, bank, iban), update (holder, bank, iban, updated_at) on public.payout_accounts to authenticated;

create table if not exists public.wallet_txns (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete restrict,
  project_id  uuid references public.projects (id) on delete set null,
  type        text not null check (type in ('deposit', 'payout')),
  method      text not null check (method in ('mada', 'card', 'applepay', 'transfer', 'bank')),
  amount      integer not null check (amount between 1 and 1000000),
  status      text not null default 'pending' check (status in ('pending', 'confirmed', 'paid', 'rejected', 'cancelled')),
  created_at  timestamptz not null default now(),
  decided_at  timestamptz
);
create index if not exists wallet_txns_user_idx on public.wallet_txns (user_id, created_at desc);
alter table public.wallet_txns enable row level security;
drop policy if exists "people read their own wallet, admins read all" on public.wallet_txns;
create policy "people read their own wallet, admins read all" on public.wallet_txns
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
revoke all on public.wallet_txns from anon, authenticated;
grant select on public.wallet_txns to authenticated;

create or replace function public.wallet_request(p_type text, p_amount integer, p_method text, p_project uuid default null) returns public.wallet_txns
language plpgsql security definer set search_path = public as $$
declare made public.wallet_txns; who text := public.my_role();
begin
  if not coalesce((select enabled from public.platform_flags where key = 'payments_live'), false) then raise exception 'payment on the site is not live' using errcode = '42501'; end if;
  if p_type = 'deposit' and who <> 'homeowner' then raise exception 'only a homeowner deposits' using errcode = '42501'; end if;
  if p_type = 'payout' then
    if who <> 'contractor' or not exists (select 1 from public.payout_accounts where user_id = auth.uid()) then raise exception 'a payout needs a contractor''s saved bank account' using errcode = '42501'; end if;
    p_method := 'bank';
  end if;
  if p_project is not null and not exists (select 1 from public.projects where id = p_project and (owner_id = auth.uid() or contractor_id = auth.uid())) then raise exception 'not your project' using errcode = '42501'; end if;
  if (select count(*) from public.wallet_txns where user_id = auth.uid() and status = 'pending') >= 5 then raise exception 'too many requests are still waiting' using errcode = '42501'; end if;
  insert into public.wallet_txns (user_id, project_id, type, method, amount) values (auth.uid(), p_project, p_type, p_method, p_amount) returning * into made;
  insert into public.events (actor_id, entity, entity_id, action, detail) values (auth.uid(), 'wallet', made.id::text, 'requested', jsonb_build_object('type', p_type, 'amount', p_amount));
  return made;
end;
$$;

create or replace function public.wallet_decide(p_id bigint, p_status text) returns public.wallet_txns
language plpgsql security definer set search_path = public as $$
declare t public.wallet_txns;
begin
  select * into t from public.wallet_txns where id = p_id;
  if not found or t.status <> 'pending' then raise exception 'this request is not waiting' using errcode = '42501'; end if;
  if p_status = 'cancelled' then
    if t.user_id is distinct from auth.uid() then raise exception 'only its owner cancels a request' using errcode = '42501'; end if;
  elsif not public.is_admin() or p_status not in ('confirmed', 'paid', 'rejected') then
    raise exception 'only an admin confirms money' using errcode = '42501';
  end if;
  update public.wallet_txns set status = p_status, decided_at = now() where id = p_id returning * into t;
  insert into public.events (actor_id, entity, entity_id, action, detail) values (auth.uid(), 'wallet', p_id::text, p_status, '{}'::jsonb);
  return t;
end;
$$;
revoke all on function public.wallet_request(text, integer, text, uuid), public.wallet_decide(bigint, text) from public, anon;
grant execute on function public.wallet_request(text, integer, text, uuid), public.wallet_decide(bigint, text) to authenticated;
