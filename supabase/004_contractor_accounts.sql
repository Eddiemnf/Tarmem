-- =======================================================================================
-- Tarmem — 004: contractor accounts
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run.
-- Safe to run more than once. Needs 001 to have been run first.
--
-- A contractor now creates an account when applying. The application is tied to that account,
-- so once an admin marks it verified the same person can sign in as a verified contractor:
--   * an applicant can read their own application (to see "pending" or "verified"), nobody else's;
--   * an application made while signed in is always stamped with that account, never another;
--   * a VERIFIED contractor can read projects that are open for bids — the project only:
--     the homeowner's name, mobile and email live in another table that contractors cannot read;
--   * being verified is decided by an admin changing the application's status, and by nothing
--     the contractor can write themselves.
-- =======================================================================================

alter table public.contractor_applications
  add column if not exists user_id uuid default auth.uid() references auth.users (id) on delete set null;

-- one application per account
create unique index if not exists contractor_applications_user_idx
  on public.contractor_applications (user_id) where user_id is not null;

drop policy if exists "anyone may apply" on public.contractor_applications;
create policy "anyone may apply" on public.contractor_applications
  for insert to anon, authenticated
  with check (status = 'new' and user_id is not distinct from auth.uid());

drop policy if exists "applicants read their own application" on public.contractor_applications;
create policy "applicants read their own application" on public.contractor_applications
  for select to authenticated using (user_id = auth.uid());

create or replace function public.is_verified_contractor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.contractor_applications a
    join public.profiles p on p.id = a.user_id
    where a.user_id = auth.uid() and a.status = 'verified' and p.role = 'contractor'
  );
$$;
revoke all on function public.is_verified_contractor() from public, anon;
grant execute on function public.is_verified_contractor() to authenticated;

drop policy if exists "verified contractors read open projects" on public.projects;
create policy "verified contractors read open projects" on public.projects
  for select to authenticated using (status = 'open' and public.is_verified_contractor());
