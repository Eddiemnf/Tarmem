-- =======================================================================================
-- Tarmem — 007: settings and profiles, reviews, and stages (stages stay OFF until payment is live)
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run. ("Run without RLS" if asked.)
-- Safe to run more than once. Needs 001–006 to have been run first.
--
--   1. profiles      a person's notification choices and the "about" line of their profile.
--   2. photos        a verified contractor can see the photos of a project that is open for bids
--                    (or that is theirs) — they need them to price the work. Nobody else's.
--   3. reviews       one review per finished project, written by its homeowner; everybody signed
--                    in can read reviews, and a contractor's rating is their average.
--   4. stages        each awarded project has three stages: the contractor submits one with photos
--                    and a video, the homeowner approves it with an acceptance photo (or disputes
--                    it). Every step is a database function that checks who is calling and that
--                    the evidence is really in storage.
--                    ALL OF IT IS SWITCHED OFF until the owner turns payments on, here in the SQL
--                    editor and nowhere else:
--                        update public.platform_flags set enabled = true where key = 'payments_live';
-- =======================================================================================

-- 1. profiles ----------------------------------------------------------------------------
alter table public.profiles add column if not exists prefs jsonb not null default '{}'::jsonb check (pg_column_size(prefs) <= 4000);
alter table public.profiles add column if not exists about text check (about is null or char_length(about) <= 600);
grant update (prefs, about) on public.profiles to authenticated;

-- 2. photos for contractors ---------------------------------------------------------------
create or replace function public.can_see_project_files(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.projects pr
    where pr.id::text = p
      and ((pr.status = 'open' and public.is_verified_contractor()) or pr.contractor_id = auth.uid()
           or exists (select 1 from public.bids b where b.project_id = pr.id and b.contractor_id = auth.uid()))
  );
$$;
revoke all on function public.can_see_project_files(text) from public, anon;
grant execute on function public.can_see_project_files(text) to authenticated;

drop policy if exists "contractors see the photos of projects they may bid on or hold" on storage.objects;
create policy "contractors see the photos of projects they may bid on or hold" on storage.objects
  for select to authenticated
  using (bucket_id = 'project-files' and public.can_see_project_files((storage.foldername(name))[2]));

-- 3. reviews -----------------------------------------------------------------------------
create table if not exists public.reviews (
  project_id     uuid primary key references public.projects (id) on delete cascade,
  homeowner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  contractor_id  uuid not null references auth.users (id) on delete cascade,
  stars          smallint not null check (stars between 1 and 5),
  body           text not null check (char_length(btrim(body)) between 3 and 1200),
  created_at     timestamptz not null default now()
);
alter table public.reviews enable row level security;
drop policy if exists "signed-in people read reviews" on public.reviews;
create policy "signed-in people read reviews" on public.reviews for select to authenticated using (true);
drop policy if exists "a homeowner reviews their own finished project, once" on public.reviews;
create policy "a homeowner reviews their own finished project, once" on public.reviews
  for insert to authenticated
  with check (homeowner_id = auth.uid() and exists (
    select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid() and p.status = 'completed' and p.contractor_id = reviews.contractor_id));
revoke all on public.reviews from anon, authenticated;
grant select on public.reviews to authenticated;
grant insert (project_id, contractor_id, stars, body) on public.reviews to authenticated;

create or replace view public.verified_contractors as
  select a.user_id, a.company, a.city, a.trades, a.created_at as since,
         (select round(avg(r.stars)::numeric, 1) from public.reviews r where r.contractor_id = a.user_id) as rating,
         (select count(*) from public.reviews r where r.contractor_id = a.user_id) as reviews,
         (select count(*) from public.projects p where p.contractor_id = a.user_id and p.status = 'completed') as done
  from public.contractor_applications a
  where a.status = 'verified' and a.user_id is not null;
revoke all on public.verified_contractors from anon, authenticated;
grant select on public.verified_contractors to authenticated;

-- 4. stages (off until payments are live) ---------------------------------------------------
create table if not exists public.platform_flags (key text primary key, enabled boolean not null default false);
insert into public.platform_flags (key, enabled) values ('payments_live', false) on conflict (key) do nothing;
alter table public.platform_flags enable row level security;
drop policy if exists "everyone signed in reads the switches" on public.platform_flags;
create policy "everyone signed in reads the switches" on public.platform_flags for select to authenticated using (true);
revoke all on public.platform_flags from anon, authenticated;
grant select on public.platform_flags to authenticated;

-- Work on the stages starts once the project's first payment is in. Until a payment provider reports that by itself,
-- an admin records it (after confirming the money with the provider or the bank): mark_funded below.
alter table public.projects add column if not exists funded_at timestamptz;

create table if not exists public.stages (
  project_id    uuid not null references public.projects (id) on delete cascade,
  idx           smallint not null check (idx between 0 and 2),
  status        text not null default 'pending' check (status in ('pending', 'submitted', 'released', 'disputed')),
  submitted_at  timestamptz,
  decided_at    timestamptz,
  reason        text check (reason is null or char_length(reason) <= 1000),
  primary key (project_id, idx)
);
alter table public.stages enable row level security;
drop policy if exists "a project's two parties and admins read its stages" on public.stages;
create policy "a project's two parties and admins read its stages" on public.stages
  for select to authenticated
  using (public.is_admin() or exists (select 1 from public.projects p where p.id = project_id and (p.owner_id = auth.uid() or p.contractor_id = auth.uid())));
revoke all on public.stages from anon, authenticated;
grant select on public.stages to authenticated;

-- every awarded project has its three stages (new awards get them when the contractor signs: see below)
insert into public.stages (project_id, idx)
  select p.id, s.idx from public.projects p cross join (values (0), (1), (2)) as s(idx)
  where p.status in ('active', 'completed') on conflict do nothing;

-- a stage's evidence includes a short video: the bucket also takes mp4 / mov / webm, up to 50 MB a file
update storage.buckets set file_size_limit = 52428800,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf', 'video/mp4', 'video/quicktime', 'video/webm']
where id = 'project-files';

drop policy if exists "the awarded contractor adds stage evidence" on storage.objects;
create policy "the awarded contractor adds stage evidence" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-files' and (storage.foldername(name))[3] like 'stage-_'
    and exists (select 1 from public.projects p where p.id::text = (storage.foldername(name))[2] and p.owner_id::text = (storage.foldername(name))[1] and p.contractor_id = auth.uid())
  );

create or replace function public.stage_evidence(p_project uuid, p_idx int, p_kind text) returns bigint
language sql stable security definer set search_path = public as $$
  select count(*) from storage.objects o join public.projects p on p.id = p_project
  where o.bucket_id = 'project-files' and o.name like p.owner_id::text || '/' || p_project::text || '/stage-' || p_idx || '/' || p_kind || '-%';
$$;
revoke all on function public.stage_evidence(uuid, int, text) from public, anon, authenticated;

create or replace function public.stage_step(p_project uuid, p_idx int, p_action text, p_reason text default null) returns public.stages
language plpgsql security definer set search_path = public as $$
declare
  p public.projects; s public.stages;
begin
  if not coalesce((select enabled from public.platform_flags where key = 'payments_live'), false) then
    raise exception 'stages open when payment on the site is live' using errcode = '42501';
  end if;
  select * into p from public.projects where id = p_project;
  select * into s from public.stages where project_id = p_project and idx = p_idx;
  if p.id is null or s.project_id is null or p.status <> 'active' then raise exception 'there is no such stage to act on' using errcode = '42501'; end if;
  if p.funded_at is null then raise exception 'the project''s payment has not been received yet' using errcode = '42501'; end if;

  if p_action = 'submit' then
    if p.contractor_id is distinct from auth.uid() then raise exception 'only the project''s contractor submits a stage' using errcode = '42501'; end if;
    if s.status not in ('pending', 'disputed') then raise exception 'this stage is not waiting to be submitted' using errcode = '42501'; end if;
    if exists (select 1 from public.stages where project_id = p_project and idx < p_idx and status <> 'released') then raise exception 'the stage before it is not approved yet' using errcode = '42501'; end if;
    if public.stage_evidence(p_project, p_idx, 'photo') < 1 or public.stage_evidence(p_project, p_idx, 'video') < 1 then
      raise exception 'a stage needs at least one photo and one video' using errcode = '42501';
    end if;
    update public.stages set status = 'submitted', submitted_at = now(), decided_at = null, reason = null where project_id = p_project and idx = p_idx returning * into s;
  elsif p_action in ('approve', 'dispute') then
    if p.owner_id is distinct from auth.uid() then raise exception 'only the project''s owner decides on a stage' using errcode = '42501'; end if;
    if s.status <> 'submitted' then raise exception 'this stage has not been submitted' using errcode = '42501'; end if;
    if p_action = 'approve' then
      if public.stage_evidence(p_project, p_idx, 'accept') < 1 then raise exception 'approving needs your own photo of the finished work' using errcode = '42501'; end if;
      update public.stages set status = 'released', decided_at = now() where project_id = p_project and idx = p_idx returning * into s;
      if not exists (select 1 from public.stages where project_id = p_project and status <> 'released') then
        update public.projects set status = 'completed' where id = p_project;
      end if;
    else
      update public.stages set status = 'disputed', decided_at = now(), reason = left(coalesce(p_reason, ''), 1000) where project_id = p_project and idx = p_idx returning * into s;
    end if;
  else
    raise exception 'unknown step' using errcode = '22023';
  end if;
  insert into public.events (actor_id, entity, entity_id, action, detail) values (auth.uid(), 'stage', p_project::text, p_action, jsonb_build_object('idx', p_idx));
  return s;
end;
$$;
revoke all on function public.stage_step(uuid, int, text, text) from public, anon;
grant execute on function public.stage_step(uuid, int, text, text) to authenticated;

create or replace function public.mark_funded(p_project uuid) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare at timestamptz;
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  if not coalesce((select enabled from public.platform_flags where key = 'payments_live'), false) then raise exception 'payment on the site is not live' using errcode = '42501'; end if;
  update public.projects set funded_at = coalesce(funded_at, now()) where id = p_project and status = 'active' returning funded_at into at;
  if at is null then raise exception 'only an awarded project can be funded' using errcode = '42501'; end if;
  insert into public.events (actor_id, entity, entity_id, action, detail) values (auth.uid(), 'project', p_project::text, 'funded', '{}'::jsonb);
  return at;
end;
$$;
revoke all on function public.mark_funded(uuid) from public, anon;
grant execute on function public.mark_funded(uuid) to authenticated;

-- the contractor's signature now also lays out the project's three stages
create or replace function public.sign_agreement_contractor(p_project uuid) returns public.agreements
language plpgsql security definer set search_path = public as $$
declare
  signed public.agreements; firm text;
begin
  select * into signed from public.agreements where project_id = p_project;
  if not found or signed.contractor_id is distinct from auth.uid() then raise exception 'there is no agreement here for you to sign' using errcode = '42501'; end if;
  if signed.contractor_signed_at is not null then return signed; end if;
  if not public.is_verified_contractor() then raise exception 'only a verified contractor signs' using errcode = '42501'; end if;
  if not public.project_is_open(p_project) then raise exception 'the project is no longer open' using errcode = '42501'; end if;
  select company into firm from public.contractor_applications where user_id = auth.uid() and status = 'verified' limit 1;

  update public.agreements set contractor_name = firm, contractor_signed_at = now() where project_id = p_project returning * into signed;
  update public.projects set status = 'active', contractor_id = auth.uid(), amount = signed.amount where id = p_project;
  insert into public.stages (project_id, idx) values (p_project, 0), (p_project, 1), (p_project, 2) on conflict do nothing;
  insert into public.events (actor_id, entity, entity_id, action, detail) values (auth.uid(), 'agreement', p_project::text, 'contractor_signed', jsonb_build_object('amount', signed.amount));
  return signed;
end;
$$;
