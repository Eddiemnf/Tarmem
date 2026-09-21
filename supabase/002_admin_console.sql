-- =======================================================================================
-- Tarmem — 002: what the admin console needs
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run.
-- Safe to run more than once. Needs 001 to have been run first.
--
--   1. visits          the website's own record of page views: the console's analytics and
--                      live view. A random id that lives as long as the browser tab, the page,
--                      the language, the kind of device, the referring site and, only for someone
--                      signed in, their city. No cookie, no IP address, no name.
--                      Anyone may ADD a row; only an admin can read them.
--   2. admin_analytics the figures the console shows, worked out inside the database so a busy
--                      month is one small answer, not a hundred thousand rows. Admins only.
--   3. admin_state     the console's own lists that have no table of their own yet (promo codes,
--                      affiliates). Admins only.
-- =======================================================================================

-- 1. visits ------------------------------------------------------------------------------
create table if not exists public.visits (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  session_id  text not null check (session_id ~ '^[a-z0-9]{8,40}$'),
  event       text not null default 'view' check (event in ('view', 'signup', 'signin', 'project', 'application', 'contact')),
  route       text not null check (char_length(route) between 1 and 40),
  path        text not null check (char_length(path) between 1 and 200),
  lang        text not null default 'ar' check (lang in ('ar', 'en')),
  device      text not null check (device in ('mobile', 'tablet', 'desktop')),
  referrer    text check (referrer is null or char_length(referrer) <= 120),
  city        text check (city is null or char_length(city) <= 40),
  user_id     uuid default auth.uid() references auth.users (id) on delete set null
);

create index if not exists visits_created_idx on public.visits (created_at desc);

alter table public.visits enable row level security;

drop policy if exists "anyone may record a visit" on public.visits;
create policy "anyone may record a visit" on public.visits
  for insert to anon, authenticated with check (user_id is not distinct from auth.uid());

drop policy if exists "admins read visits" on public.visits;
create policy "admins read visits" on public.visits
  for select to authenticated using (public.is_admin());

-- Visitors may set only the columns below; the time, the id and who they are come from the database.
revoke all on public.visits from anon, authenticated;
grant insert (session_id, event, route, path, lang, device, referrer, city) on public.visits to anon, authenticated;
grant select on public.visits to authenticated;

-- 2. admin_analytics ---------------------------------------------------------------------
-- One day's (or any period's) headline figures. Reads through the visitor's own permissions,
-- so for anyone but an admin every figure is zero.
create or replace function public.visits_period_stats(p_from timestamptz, p_to timestamptz) returns jsonb
language sql stable set search_path = public as $$
  select jsonb_build_object(
    'visitors', count(*),
    'views',    coalesce(sum(views), 0),
    'signups',  coalesce(sum(signups), 0),
    'posts',    coalesce(sum(posts), 0),
    'avg_seconds', coalesce(round(avg(extract(epoch from (last_seen - first_seen)))), 0),
    'bounce_pct',  coalesce(round(100.0 * count(*) filter (where views <= 1) / nullif(count(*), 0)), 0)
  )
  from (
    select session_id, min(created_at) as first_seen, max(created_at) as last_seen,
           count(*) filter (where event = 'view') as views,
           count(*) filter (where event = 'signup') as signups,
           count(*) filter (where event = 'project') as posts
    from public.visits where created_at >= p_from and created_at < p_to group by session_id
  ) sessions;
$$;

create or replace function public.admin_analytics(p_range text default 'week') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  tz          constant text := 'Asia/Riyadh';
  today       date := (now() at time zone tz)::date;
  today_start timestamptz := (today::timestamp) at time zone tz;
  n_days      integer := case when p_range = 'month' then 30 else 7 end;
  span_start  timestamptz;
  prev_start  timestamptz;
  series      jsonb;
  prev_total  bigint;
begin
  if not public.is_admin() then
    raise exception 'admins only' using errcode = '42501';
  end if;

  if p_range = 'year' then
    span_start := (date_trunc('month', today::timestamp) - interval '11 months') at time zone tz;
    prev_start := (date_trunc('month', today::timestamp) - interval '23 months') at time zone tz;
    select jsonb_agg(jsonb_build_object('k', to_char(m, 'YYYY-MM'), 'n', coalesce(c.n, 0)) order by m) into series
    from generate_series(date_trunc('month', today::timestamp) - interval '11 months', date_trunc('month', today::timestamp), interval '1 month') as m
    left join (
      select date_trunc('month', created_at at time zone tz) as mm, count(distinct session_id) as n
      from public.visits where created_at >= span_start group by 1
    ) c on c.mm = m;
    select count(*) into prev_total from (
      select distinct session_id, date_trunc('month', created_at at time zone tz)
      from public.visits where created_at >= prev_start and created_at < span_start
    ) x;
  else
    span_start := ((today - (n_days - 1))::timestamp) at time zone tz;
    prev_start := ((today - (2 * n_days - 1))::timestamp) at time zone tz;
    select jsonb_agg(jsonb_build_object('k', to_char(d, 'YYYY-MM-DD'), 'n', coalesce(c.n, 0)) order by d) into series
    from generate_series((today - (n_days - 1))::timestamp, today::timestamp, interval '1 day') as d
    left join (
      select (created_at at time zone tz)::date as dd, count(distinct session_id) as n
      from public.visits where created_at >= span_start group by 1
    ) c on c.dd = d::date;
    select count(*) into prev_total from (
      select distinct session_id, (created_at at time zone tz)::date
      from public.visits where created_at >= prev_start and created_at < span_start
    ) x;
  end if;

  return jsonb_build_object(
    'range', case when p_range in ('month', 'year') then p_range else 'week' end,
    'series', coalesce(series, '[]'::jsonb),
    'prev_total', coalesce(prev_total, 0),
    'today', public.visits_period_stats(today_start, now() + interval '1 minute'),
    'yesterday', public.visits_period_stats(today_start - interval '1 day', today_start),
    'top_pages', coalesce((select jsonb_agg(jsonb_build_object('k', route, 'n', n) order by n desc) from (
        select route, count(*) as n from public.visits where event = 'view' and created_at >= span_start group by 1 order by 2 desc limit 7) p), '[]'::jsonb),
    'sources', coalesce((select jsonb_agg(jsonb_build_object('k', src, 'n', n) order by n desc) from (
        select coalesce(referrer, 'direct') as src, count(distinct session_id) as n from public.visits where created_at >= span_start group by 1 order by 2 desc limit 12) s), '[]'::jsonb),
    'cities', coalesce((select jsonb_agg(jsonb_build_object('k', city, 'n', n) order by n desc) from (
        select coalesce(city, 'unknown') as city, count(distinct session_id) as n from public.visits where created_at >= span_start group by 1 order by 2 desc limit 6) s), '[]'::jsonb),
    'live', jsonb_build_object(
      'now', (select count(distinct session_id) from public.visits where created_at >= now() - interval '5 minutes'),
      'devices', coalesce((select jsonb_agg(jsonb_build_object('k', device, 'n', n)) from (
          select device, count(distinct session_id) as n from public.visits where created_at >= now() - interval '5 minutes' group by 1) d), '[]'::jsonb),
      'pages', coalesce((select jsonb_agg(jsonb_build_object('k', route, 'n', n) order by n desc) from (
          select route, count(distinct session_id) as n from public.visits where created_at >= now() - interval '5 minutes' group by 1 order by 2 desc limit 5) p), '[]'::jsonb),
      'feed', coalesce((select jsonb_agg(jsonb_build_object('city', city, 'event', event, 'route', route, 'age', age) order by age) from (
          select city, event, route, floor(extract(epoch from (now() - created_at)))::int as age
          from public.visits where created_at >= now() - interval '30 minutes' order by created_at desc limit 8) f), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.admin_analytics(text) from public, anon;
grant execute on function public.admin_analytics(text) to authenticated;
revoke all on function public.visits_period_stats(timestamptz, timestamptz) from public, anon;
grant execute on function public.visits_period_stats(timestamptz, timestamptz) to authenticated;

-- 3. admin_state -------------------------------------------------------------------------
create table if not exists public.admin_state (
  key         text primary key check (key in ('promos', 'affiliates')),
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

alter table public.admin_state enable row level security;

drop policy if exists "admins read the console's lists" on public.admin_state;
create policy "admins read the console's lists" on public.admin_state
  for select to authenticated using (public.is_admin());
drop policy if exists "admins add to the console's lists" on public.admin_state;
create policy "admins add to the console's lists" on public.admin_state
  for insert to authenticated with check (public.is_admin());
drop policy if exists "admins change the console's lists" on public.admin_state;
create policy "admins change the console's lists" on public.admin_state
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.admin_state from anon, authenticated;
grant select, insert (key, value, updated_at), update (key, value, updated_at) on public.admin_state to authenticated;
