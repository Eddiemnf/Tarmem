-- =======================================================================================
-- Tarmem — 005: bids
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run.
-- Safe to run more than once. Needs 001 and 004 to have been run first.
--
--   * a VERIFIED contractor may bid once on a project that is open, and edit or withdraw that
--     bid while the project is still open;
--   * a contractor sees only their own bids — never another contractor's;
--   * a homeowner sees the bids on their own projects, and may mark one as chosen — they cannot
--     touch a bid's price or wording;
--   * to show who is bidding, homeowners see a contractor's company, city and trades — never the
--     mobile, email or licence number from the application;
--   * a contractor keeps seeing a project they have bid on, even once it is no longer open.
-- =======================================================================================

create table if not exists public.bids (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects (id) on delete cascade,
  contractor_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  price          integer not null check (price between 100 and 1000000),
  days           integer not null check (days between 1 and 1000),
  note           text check (note is null or char_length(note) <= 2000),
  details        jsonb not null default '{}'::jsonb check (pg_column_size(details) <= 16000),
  status         text not null default 'submitted' check (status in ('submitted', 'withdrawn', 'chosen')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (project_id, contractor_id)
);
create index if not exists bids_project_idx on public.bids (project_id);

-- Checks that look into another table run with the database's own rights, so the rules below
-- cannot chase each other in circles (bids → projects → bids).
create or replace function public.owns_project(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.projects where id = p and owner_id = auth.uid());
$$;
create or replace function public.project_is_open(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.projects where id = p and status = 'open');
$$;
create or replace function public.has_bid_on(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bids where project_id = p and contractor_id = auth.uid());
$$;
revoke all on function public.owns_project(uuid), public.project_is_open(uuid), public.has_bid_on(uuid) from public, anon;
grant execute on function public.owns_project(uuid), public.project_is_open(uuid), public.has_bid_on(uuid) to authenticated;

alter table public.bids enable row level security;

drop policy if exists "verified contractors bid on open projects" on public.bids;
create policy "verified contractors bid on open projects" on public.bids
  for insert to authenticated
  with check (contractor_id = auth.uid() and status = 'submitted' and public.is_verified_contractor() and public.project_is_open(project_id));

drop policy if exists "a bid is seen by its contractor, the project's owner, and admins" on public.bids;
create policy "a bid is seen by its contractor, the project's owner, and admins" on public.bids
  for select to authenticated
  using (contractor_id = auth.uid() or public.owns_project(project_id) or public.is_admin());

drop policy if exists "contractors change their own bid, owners choose one" on public.bids;
create policy "contractors change their own bid, owners choose one" on public.bids
  for update to authenticated
  using (contractor_id = auth.uid() or public.owns_project(project_id))
  with check (contractor_id = auth.uid() or public.owns_project(project_id));

-- Who may change what, row by row.
create or replace function public.bids_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.id <> old.id or new.project_id <> old.project_id or new.contractor_id <> old.contractor_id or new.created_at <> old.created_at then
    raise exception 'a bid cannot be moved' using errcode = '42501';
  end if;
  new.updated_at := now();
  if public.is_admin() then return new; end if;
  if old.contractor_id = auth.uid() then
    if old.status = 'chosen' then raise exception 'a chosen bid cannot be changed' using errcode = '42501'; end if;
    if new.status not in ('submitted', 'withdrawn') then raise exception 'only the homeowner chooses a bid' using errcode = '42501'; end if;
    if not public.project_is_open(old.project_id) then raise exception 'the project is no longer open' using errcode = '42501'; end if;
    return new;
  end if;
  -- the project's owner: the choice, and nothing else
  if new.price <> old.price or new.days <> old.days or new.note is distinct from old.note or new.details <> old.details then
    raise exception 'only the contractor changes a bid' using errcode = '42501';
  end if;
  if old.status = 'withdrawn' or new.status not in ('submitted', 'chosen') then
    raise exception 'this bid cannot be chosen' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists bids_before_update on public.bids;
create trigger bids_before_update before update on public.bids
  for each row execute function public.bids_before_update();

revoke all on public.bids from anon, authenticated;
grant select on public.bids to authenticated;
grant insert (project_id, price, days, note, details) on public.bids to authenticated;
grant update (project_id, price, days, note, details, status) on public.bids to authenticated;

-- A contractor keeps the projects they have bid on.
drop policy if exists "contractors read projects they have bid on" on public.projects;
create policy "contractors read projects they have bid on" on public.projects
  for select to authenticated using (public.has_bid_on(id));

-- What a homeowner may know about a bidder: the company, never the contact details.
create or replace view public.verified_contractors as
  select a.user_id, a.company, a.city, a.trades, a.created_at as since
  from public.contractor_applications a
  where a.status = 'verified' and a.user_id is not null;
revoke all on public.verified_contractors from anon, authenticated;
grant select on public.verified_contractors to authenticated;
