-- =======================================================================================
-- Tarmem — 015: a pasted token keeps its line's line break; strip it, refuse it in future, resubmit
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run. Safe to run more than once.
--
-- WHAT HAPPENED: the switch-on block put the token on its own line and trimmed spaces around it — but
-- trim() does not remove line breaks, so the stored token began (or ended) with one. The web library the
-- database sends with refuses a header containing a line break: every request to Meta died before leaving,
-- logged as "A libcurl function was given a bad argument" with no status code. Meta saw nothing.
-- =======================================================================================

update public.app_secrets set value = regexp_replace(value, '\s', '', 'g') where key in ('wa_token', 'wa_phone_id', 'resend_key');

create or replace function public.set_whatsapp(p_token text, p_phone_id text default null, p_template text default null) returns text
language plpgsql security definer set search_path = public as $$
declare token text := regexp_replace(coalesce(p_token, ''), '\s', '', 'g'); phone text := regexp_replace(coalesce(p_phone_id, ''), '\s', '', 'g');
begin
  if p_token is null then
    delete from public.app_secrets where key in ('wa_token', 'wa_phone_id', 'wa_template');
    insert into public.platform_flags (key, enabled) values ('whatsapp_live', false) on conflict (key) do update set enabled = false;
    return 'whatsapp is off';
  end if;
  if phone !~ '^[0-9]{8,20}$' then raise exception 'The phone number ID is the long number Meta shows under the phone number, digits only.'; end if;
  if token !~ '^[A-Za-z0-9]{40,}$' then raise exception 'That does not look like a permanent access token (letters and digits only, % characters after removing spaces).', length(token); end if;
  insert into public.app_secrets (key, value) values ('wa_token', token), ('wa_phone_id', phone), ('wa_template', coalesce(p_template, 'tarmem_update'))
    on conflict (key) do update set value = excluded.value;
  insert into public.platform_flags (key, enabled) values ('whatsapp_live', true) on conflict (key) do update set enabled = true;
  return 'whatsapp is on';
end;
$$;
revoke all on function public.set_whatsapp(text, text, text) from public, anon, authenticated;

-- what is stored now: only its length and shape, never the value itself
select key, length(value) as chars, value ~ '^[A-Za-z0-9]+$' as clean from public.app_secrets where key in ('wa_token', 'wa_phone_id');

-- and the templates go to Meta again
select public.wa_submit_templates();
