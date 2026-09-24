-- =======================================================================================
-- Tarmem — 028: erasing an account leaves nothing of it open to others
--
-- Found on the second pass before launch: erase_account (022) kept an erased homeowner's OPEN projects open, so
-- contractors could still see them and bid; kept an erased contractor's waiting bids; and kept the contractor's
-- application (company, mobile, email, CR), so they still appeared as a verified contractor. Now erasing also:
--   · withdraws the person's open projects and their waiting bids (records of signed work stay, as before);
--   · deletes their contractor application, matched by account or by the account's email.
--
-- HOW TO RUN: Supabase → SQL Editor → paste → Run. Safe to run again.
-- =======================================================================================

create or replace function public.erase_account(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  digits text; tomb text; old_email text;
begin
  if p_user is null or not exists (select 1 from public.profiles where id = p_user) then raise exception 'no such account'; end if;
  if exists (select 1 from public.projects where status = 'active' and (owner_id = p_user or contractor_id = p_user)) then
    raise exception 'active_project: a project in progress must be finished first' using errcode = 'P0001';
  end if;
  select email into old_email from auth.users where id = p_user;
  digits := regexp_replace(md5(p_user::text), '[^0-9]', '', 'g') || '00000000000';
  update public.profiles
     set full_name = case when lang = 'en' then 'Deleted account' else 'حساب محذوف' end,
         mobile = '0' || rpad(left(digits, 11), 11, '0'), email = null, company = null, about = null,
         prefs = '{}'::jsonb, trades = null, mobile_verified_at = null, deleted_at = now()
   where id = p_user;
  -- (028) nothing of theirs stays open to others: open projects are withdrawn, waiting bids too, and a contractor's
  -- application (company, mobile, email) goes, so they no longer appear as a verified contractor
  update public.projects set status = 'withdrawn' where owner_id = p_user and status = 'open';
  update public.bids set status = 'withdrawn' where contractor_id = p_user and status = 'submitted' and public.project_is_open(project_id);
  delete from public.contractor_applications where user_id = p_user or (old_email is not null and lower(email) = lower(old_email));
  delete from public.portfolio where user_id = p_user;
  delete from public.payout_accounts where user_id = p_user;
  delete from public.project_messages where from_id = p_user;
  delete from public.mobile_codes where user_id = p_user;
  if old_email is not null then delete from public.contact_messages where email is not null and lower(email) = lower(old_email); end if;
  update public.visits set user_id = null where user_id = p_user;
  update public.events set actor_id = null where actor_id = p_user;
  begin
    delete from storage.objects where bucket_id in ('project-files', 'portfolio') and name like p_user::text || '/%';
  exception when others then null; end;
  tomb := 'deleted-' || replace(p_user::text, '-', '') || '@deleted.tarmem.sa';
  begin delete from auth.identities where user_id = p_user; exception when undefined_table then null; end;
  begin delete from auth.sessions where user_id = p_user; exception when undefined_table then null; end;
  begin delete from auth.mfa_factors where user_id = p_user; exception when undefined_table then null; end;
  update auth.users set email = tomb, encrypted_password = null, raw_user_meta_data = '{}'::jsonb, phone = null, banned_until = 'infinity' where id = p_user;
end $$;

revoke all on function public.erase_account(uuid) from public, anon, authenticated;

select 'erasure leaves nothing open: ready' as result;
