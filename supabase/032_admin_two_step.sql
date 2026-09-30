-- =======================================================================================
-- Tarmem — 032: two-step sign-in for the team
--
-- An admin's powers now need a session that has passed two steps: the password, then a six-digit code from an
-- authenticator app on the admin's phone (Supabase Auth's TOTP factor; the session's token then says aal2). A session
-- with the password alone is an ordinary account: every row rule and function that asks is_admin() gets false, so the
-- console's lists, the team's actions, the private files and the analytics all wait for the code.
-- The site asks for the code before the console or the inbox opens, and sets the app up at an admin's first sign-in
-- (web/src/platform/AdminTwoStep.tsx). The code and the app's key never leave the admin's own screen and phone.
--
-- A lost phone: Supabase → Authentication → Users → the admin's account → "Remove MFA factors" (or, in the SQL Editor,
--   delete from auth.mfa_factors where user_id = (select id from auth.users where email = '<the admin''s email>');
-- then sign in on the site again and set the app up afresh.
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run. Safe to run again. Needs 001–031, and the site with
-- the second step live (it asks for the code; without it, an admin could not reach the console).
-- =======================================================================================

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
     and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;
-- (create or replace keeps who may call it: row rules run it for visitors too, and it answers false for them)

select 'two-step sign-in for the team (032): ready' as result,
  (select count(*) from public.profiles where role = 'admin' and deleted_at is null) as admins,
  (select count(distinct f.user_id) from auth.mfa_factors f join public.profiles p on p.id = f.user_id
    where p.role = 'admin' and f.status::text = 'verified') as admins_with_the_app;
