-- =======================================================================================
-- Tarmem — 003: photos and files on a project
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run.
-- Safe to run more than once. Needs 001 to have been run first.
--
-- A private storage bucket. A file lives at  <owner's account id>/<project id>/<file>.
--   * a homeowner may add files only under their own id, and only to a project that is theirs;
--   * only that homeowner and Tarmem's admins can see or open them;
--   * nobody can replace or delete a file from the website (no update / delete rule);
--   * JPG, PNG, WEBP, HEIC and PDF only, 10 MB each — enforced by the storage service itself.
-- =======================================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-files', 'project-files', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "homeowners add files to their own projects" on storage.objects;
create policy "homeowners add files to their own projects" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-files'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.projects p
      where p.id::text = (storage.foldername(name))[2] and p.owner_id = auth.uid()
    )
  );

drop policy if exists "owners and admins read project files" on storage.objects;
create policy "owners and admins read project files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'project-files'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
