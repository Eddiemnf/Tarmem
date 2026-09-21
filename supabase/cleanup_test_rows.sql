-- =======================================================================================
-- Tarmem — remove what the security tests left behind
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run. It ends with a small table
-- of what it removed. Safe to run again (it then removes nothing).
--
-- It touches only rows the tests themselves made: projects titled "RLS TEST…", messages and
-- applications named exactly "RLS TEST", visits whose id starts with "rlstest", and accounts
-- whose email is rls-test-…@tarmem.sa. Nothing a customer wrote can match those.
-- The two tiny test images stay in storage (files are removed from Storage → project-files in
-- the dashboard, not from SQL); they are private and a few bytes each.
-- =======================================================================================

create temp table if not exists cleanup_report (what text, removed bigint);
truncate cleanup_report;

with d as (delete from public.projects where title like 'RLS TEST%' returning 1)
  insert into cleanup_report select 'test projects', count(*) from d;
with d as (delete from public.contact_messages where name = 'RLS TEST' returning 1)
  insert into cleanup_report select 'test messages', count(*) from d;
with d as (delete from public.contractor_applications where company = 'RLS TEST' returning 1)
  insert into cleanup_report select 'test applications', count(*) from d;
with d as (delete from public.visits where session_id like 'rlstest%' returning 1)
  insert into cleanup_report select 'test visits', count(*) from d;
-- accounts last: a profile cannot go while it still owns a project
with d as (delete from auth.users where email like 'rls-test-%@tarmem.sa' returning 1)
  insert into cleanup_report select 'test accounts', count(*) from d;

select * from cleanup_report;
