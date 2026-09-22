-- =======================================================================================
-- Tarmem — 011: a contractor's portfolio (photos of their own work on their public profile)
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run ("Run without RLS" if asked).
-- Safe to run more than once. Needs 001 and 004 to have been run first.
--
-- A second storage bucket, PUBLIC on purpose: portfolio photos exist to be seen by homeowners
-- comparing bids, and the design shows them on the profile. Rules:
--   * a verified contractor adds photos only under their own id, at most 12, images only, 8 MB each;
--   * they can remove their own; nobody can touch anyone else's;
--   * the profile view lists each verified contractor's photos with a caption they wrote.
-- =======================================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio', 'portfolio', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anyone sees portfolio photos" on storage.objects;
create policy "anyone sees portfolio photos" on storage.objects
  for select to anon, authenticated using (bucket_id = 'portfolio');

drop policy if exists "verified contractors add their own portfolio photos" on storage.objects;
create policy "verified contractors add their own portfolio photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text and public.is_verified_contractor()
    and (select count(*) from storage.objects o where o.bucket_id = 'portfolio' and (storage.foldername(o.name))[1] = auth.uid()::text) < 12
  );

drop policy if exists "contractors remove their own portfolio photos" on storage.objects;
create policy "contractors remove their own portfolio photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'portfolio' and (storage.foldername(name))[1] = auth.uid()::text);

-- the caption under each photo, kept beside the file
create table if not exists public.portfolio (
  path        text primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  caption     text check (caption is null or char_length(caption) <= 120),
  created_at  timestamptz not null default now()
);
alter table public.portfolio enable row level security;
drop policy if exists "anyone reads captions" on public.portfolio;
create policy "anyone reads captions" on public.portfolio for select to anon, authenticated using (true);
drop policy if exists "contractors keep their own captions" on public.portfolio;
create policy "contractors keep their own captions" on public.portfolio
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_verified_contractor() and split_part(path, '/', 1) = auth.uid()::text);
revoke all on public.portfolio from anon, authenticated;
grant select on public.portfolio to anon, authenticated;
grant insert (path, caption), update (caption), delete on public.portfolio to authenticated;
