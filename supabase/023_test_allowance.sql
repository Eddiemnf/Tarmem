-- =======================================================================================
-- Tarmem — 023: the WhatsApp test allowance counts only messages Meta accepted; admins get ten a day
--
-- HOW TO RUN: Supabase → SQL Editor → paste → Run. Safe to run again.
--
-- The settings page's "send test message" allowed three a day per number, counting every attempt.
-- An attempt Meta refused (its answer, copied by 018, is a 4xx) cost nothing and no longer counts;
-- an admin testing the channel may send ten a day. The refusal reads the same for everyone.
-- =======================================================================================
create or replace function public.whatsapp_test() returns text
language plpgsql security definer set search_path = public as $$
declare me public.profiles; num text; today int; allowance int;
begin
  if auth.uid() is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if not coalesce((select enabled from public.platform_flags where key = 'whatsapp_live'), false) then
    raise exception 'WhatsApp updates are not switched on yet' using errcode = '42501';
  end if;
  select * into me from public.profiles where id = auth.uid();
  num := public.wa_number(me.mobile);
  if num is null then raise exception 'not a Saudi mobile number' using errcode = '22023'; end if;
  if public.is_admin() then perform public.wa_reconcile(); end if; -- the cron and the inbox do it for everyone else
  select count(*) into today from public.email_log
   where recipient = num and channel = 'whatsapp' and template = 'wa_test' and status = 'sent'
     and coalesce(answer_code, 200) < 400 and at > now() - interval '1 day';
  allowance := case when public.is_admin() then 10 else 3 end;
  if today >= allowance then raise exception 'test messages a day: % reached', allowance using errcode = '42501'; end if;
  perform public.send_whatsapp(me.mobile, case when me.lang = 'en' then 'en' else 'ar' end, 'wa_test', '{}', 'settings');
  return num;
end;
$$;
revoke all on function public.whatsapp_test() from public, anon;
grant execute on function public.whatsapp_test() to authenticated;
select 'test allowance: refused attempts no longer count; admins ten a day' as result;
