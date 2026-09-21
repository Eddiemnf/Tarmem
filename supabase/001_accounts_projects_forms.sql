-- Tarmem · database setup, part 1: accounts, projects, and the two public forms
--
-- Run once in the Supabase SQL editor. Safe to run again: it only creates what is missing.
--
-- The rule behind every line: a permission that matters is enforced HERE, in the database,
-- never only in the website's code. The site uses the public ("publishable") key, which
-- anyone can read out of the page — so the database has to assume every request may come
-- from someone poking at it by hand.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------------------
-- People. One row per account, created by the person themselves right after they sign up.
-- ---------------------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null check (role in ('homeowner', 'contractor', 'admin')),
  full_name   text not null check (char_length(btrim(full_name)) between 2 and 120),
  mobile      text not null check (mobile ~ '^\+?[0-9][0-9 ]{7,17}$'),
  email       text,                                   -- copied from the login record, never typed
  city        text not null default 'riyadh',
  company     text check (company is null or char_length(company) <= 160),
  lang        text not null default 'ar' check (lang in ('ar', 'en')),
  created_at  timestamptz not null default now()
);

-- Is the person making this request a Tarmem admin? Used by the rules below.
-- "security definer" lets it read profiles without tripping over the rules it serves.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- The email always comes from the login record, so nobody can claim someone else's.
create or replace function public.profiles_fill_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.email := (select email from auth.users where id = new.id);
  new.full_name := btrim(new.full_name);
  return new;
end $$;

drop trigger if exists profiles_fill_email on public.profiles;
create trigger profiles_fill_email before insert on public.profiles
  for each row execute function public.profiles_fill_email();

alter table public.profiles enable row level security;

drop policy if exists "read own profile, admins read all" on public.profiles;
create policy "read own profile, admins read all" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

-- You create your own profile, as a homeowner or a contractor. Never as an admin:
-- admins are made by the owner, by hand, in this SQL editor (see the end of this file).
drop policy if exists "create own profile, never as admin" on public.profiles;
create policy "create own profile, never as admin" on public.profiles
  for insert to authenticated with check (id = auth.uid() and role in ('homeowner', 'contractor'));

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Nobody can change their own role, id or email through the website: only these columns.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, role, full_name, mobile, city, company, lang) on public.profiles to authenticated;
grant update (full_name, mobile, city, company, lang) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------------------
-- Projects a homeowner posts.
-- ---------------------------------------------------------------------------------------
create sequence if not exists public.project_code_seq start 2001;

create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,                -- P-2001, P-2002 … assigned by the trigger below
  owner_id     uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  title        text not null check (char_length(btrim(title)) between 3 and 140),
  trade        text not null check (char_length(trade) between 2 and 40),
  description  text not null check (char_length(btrim(description)) between 3 and 4000),
  city         text not null check (char_length(city) between 2 and 40),
  district     text check (district is null or char_length(district) <= 120),
  budget_min   integer not null check (budget_min >= 0),
  budget_max   integer not null check (budget_max >= budget_min and budget_max <= 1000000),
  timing       text not null check (timing in ('asap', 'month', 'flexible')),
  status       text not null default 'open' check (status in ('open', 'active', 'completed', 'withdrawn')),
  created_at   timestamptz not null default now()
);

create index if not exists projects_owner_idx on public.projects (owner_id, created_at desc);
create index if not exists projects_status_idx on public.projects (status, created_at desc);

-- Only homeowners post, only as themselves, only as "open", and not more than ten open at once.
create or replace function public.projects_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.my_role() is distinct from 'homeowner' then
    raise exception 'Only a homeowner account can post a project.' using errcode = '42501';
  end if;
  new.owner_id := auth.uid();
  new.status := 'open';
  new.code := 'P-' || nextval('public.project_code_seq');
  new.created_at := now();
  if (select count(*) from public.projects where owner_id = auth.uid() and status = 'open') >= 10 then
    raise exception 'You already have ten open projects. Close one before posting another.' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists projects_before_insert on public.projects;
create trigger projects_before_insert before insert on public.projects
  for each row execute function public.projects_before_insert();

alter table public.projects enable row level security;

drop policy if exists "owners and admins read projects" on public.projects;
create policy "owners and admins read projects" on public.projects
  for select to authenticated using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "homeowners post their own projects" on public.projects;
create policy "homeowners post their own projects" on public.projects
  for insert to authenticated with check (owner_id = auth.uid());

-- An owner may edit or withdraw a project only while it is still open.
drop policy if exists "owners edit open projects" on public.projects;
create policy "owners edit open projects" on public.projects
  for update to authenticated
  using (owner_id = auth.uid() and status = 'open')
  with check (owner_id = auth.uid() and status in ('open', 'withdrawn'));

drop policy if exists "admins update projects" on public.projects;
create policy "admins update projects" on public.projects
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.projects from anon, authenticated;
grant select on public.projects to authenticated;
grant insert (title, trade, description, city, district, budget_min, budget_max, timing) on public.projects to authenticated;
grant update (title, trade, description, city, district, budget_min, budget_max, timing, status)
  on public.projects to authenticated;

-- ---------------------------------------------------------------------------------------
-- A record of who did what, which nobody can edit. In a dispute, this is the product.
-- ---------------------------------------------------------------------------------------
create table if not exists public.events (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor_id   uuid,
  entity     text not null,
  entity_id  text not null,
  action     text not null,
  detail     jsonb not null default '{}'::jsonb
);

create or replace function public.log_project_event() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.events (actor_id, entity, entity_id, action, detail)
  values (auth.uid(), 'project', new.code,
          case when tg_op = 'INSERT' then 'posted' else 'updated' end,
          jsonb_build_object('status', new.status, 'title', new.title));
  return new;
end $$;

drop trigger if exists projects_log on public.projects;
create trigger projects_log after insert or update on public.projects
  for each row execute function public.log_project_event();

alter table public.events enable row level security;
drop policy if exists "admins read the record" on public.events;
create policy "admins read the record" on public.events
  for select to authenticated using (public.is_admin());
revoke all on public.events from anon, authenticated;
grant select on public.events to authenticated;

-- ---------------------------------------------------------------------------------------
-- The two public forms that need no account: "contact us" and "join as a contractor".
-- Anyone may send one; only Tarmem admins can read them. Nothing here can be listed,
-- changed or deleted from the website.
-- ---------------------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(btrim(name)) between 2 and 120),
  email       text check (email is null or (char_length(email) <= 160 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  mobile      text check (mobile is null or mobile ~ '^\+?[0-9][0-9 ]{7,17}$'),
  topic       text check (topic is null or char_length(topic) <= 120),
  message     text not null check (char_length(btrim(message)) between 3 and 4000),
  lang        text not null default 'ar' check (lang in ('ar', 'en')),
  handled     boolean not null default false,
  check (email is not null or mobile is not null)
);

create table if not exists public.contractor_applications (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  company     text not null check (char_length(btrim(company)) between 2 and 160),
  person      text not null check (char_length(btrim(person)) between 2 and 120),
  mobile      text not null check (mobile ~ '^\+?[0-9][0-9 ]{7,17}$'),
  email       text check (email is null or (char_length(email) <= 160 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  city        text not null check (char_length(city) between 2 and 40),
  trades      text[] not null check (cardinality(trades) between 1 and 12),
  cr_number   text check (cr_number is null or cr_number ~ '^[0-9]{5,15}$'),
  note        text check (note is null or char_length(note) <= 2000),
  lang        text not null default 'ar' check (lang in ('ar', 'en')),
  status      text not null default 'new' check (status in ('new', 'contacted', 'verified', 'declined'))
);

alter table public.contact_messages enable row level security;
alter table public.contractor_applications enable row level security;

drop policy if exists "anyone may send a message" on public.contact_messages;
create policy "anyone may send a message" on public.contact_messages
  for insert to anon, authenticated with check (handled = false);
drop policy if exists "admins read messages" on public.contact_messages;
create policy "admins read messages" on public.contact_messages
  for select to authenticated using (public.is_admin());
drop policy if exists "admins mark messages handled" on public.contact_messages;
create policy "admins mark messages handled" on public.contact_messages
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "anyone may apply" on public.contractor_applications;
create policy "anyone may apply" on public.contractor_applications
  for insert to anon, authenticated with check (status = 'new');
drop policy if exists "admins read applications" on public.contractor_applications;
create policy "admins read applications" on public.contractor_applications
  for select to authenticated using (public.is_admin());
drop policy if exists "admins update applications" on public.contractor_applications;
create policy "admins update applications" on public.contractor_applications
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.contact_messages, public.contractor_applications from anon, authenticated;
grant insert (name, email, mobile, topic, message, lang) on public.contact_messages to anon, authenticated;
grant insert (company, person, mobile, email, city, trades, cr_number, note, lang)
  on public.contractor_applications to anon, authenticated;
grant select on public.contact_messages, public.contractor_applications to authenticated;
grant update (handled) on public.contact_messages to authenticated;
grant update (status) on public.contractor_applications to authenticated;

-- ---------------------------------------------------------------------------------------
-- Making yourself the admin (do this once, after you have signed up on the website):
--
--   update public.profiles set role = 'admin' where email = 'YOUR-EMAIL-HERE';
--
-- It works only here, in the SQL editor. The website can never do it.
-- ---------------------------------------------------------------------------------------
