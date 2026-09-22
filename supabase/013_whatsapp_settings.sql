-- =======================================================================================
-- Tarmem — 013: the designed WhatsApp card on the settings page, made real
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run ("Run without RLS" if asked).
-- Safe to run more than once. Needs 001–012 to have been run first.
--
-- 012 sends every update to the person's WhatsApp. This adds what the design's settings card promises:
--   • platform_flags 'whatsapp_live' — kept in step by set_whatsapp, so the website knows whether to show the card.
--   • The person's own choices, in profiles.prefs (saved by the settings page):
--       channel = 'email'  → no WhatsApp for them; the emails continue.
--       quiet   = false    → no quiet hours. Otherwise, between 11pm and 8am Riyadh time, ordinary updates wait in a
--                            queue until 8am. Payment and dispute alerts, and test messages, go at once.
--   • whatsapp_test() — the card's "Send test message": one real message to the person's own number, three a day.
--   • wa_flush() — sends what the quiet hours held: every 10 minutes through pg_cron, and whenever any other
--     WhatsApp goes out (so the queue drains even where pg_cron is unavailable).
-- Nothing changes for the emails, and a failure never blocks the action that caused it.
-- =======================================================================================

-- 1. the switch the website can read ----------------------------------------------------------
insert into public.platform_flags (key, enabled) values ('whatsapp_live', false) on conflict (key) do nothing;

create or replace function public.set_whatsapp(p_token text, p_phone_id text default null, p_template text default null) returns text
language plpgsql security definer set search_path = public as $$
begin
  if p_token is null then
    delete from public.app_secrets where key in ('wa_token', 'wa_phone_id', 'wa_template');
    insert into public.platform_flags (key, enabled) values ('whatsapp_live', false) on conflict (key) do update set enabled = false;
    return 'whatsapp is off';
  end if;
  if p_phone_id !~ '^[0-9]{8,20}$' then raise exception 'The phone number ID is the long number Meta shows under the phone number, digits only.'; end if;
  if length(p_token) < 40 then raise exception 'That does not look like a permanent access token (% characters).', length(p_token); end if;
  insert into public.app_secrets (key, value) values ('wa_token', p_token), ('wa_phone_id', p_phone_id), ('wa_template', coalesce(p_template, 'tarmem_update'))
    on conflict (key) do update set value = excluded.value;
  insert into public.platform_flags (key, enabled) values ('whatsapp_live', true) on conflict (key) do update set enabled = true;
  return 'whatsapp is on, template ' || coalesce(p_template, 'tarmem_update');
end;
$$;
revoke all on function public.set_whatsapp(text, text, text) from public, anon, authenticated;

-- the owner may have switched WhatsApp on before this file existed: the flag follows the token
update public.platform_flags set enabled = exists (select 1 from public.app_secrets where key = 'wa_token' and value <> '') where key = 'whatsapp_live';

-- 2. quiet hours ----------------------------------------------------------------------------------
create table if not exists public.wa_queue (
  id          bigint generated always as identity primary key,
  mobile      text not null,                       -- already in Meta's format (9665…)
  lang        text not null,
  line1       text not null,
  line2       text not null,
  path        text,
  template    text not null,
  due_at      timestamptz not null,
  created_at  timestamptz not null default now()
);
alter table public.wa_queue enable row level security;      -- no policies: only the functions below touch it
revoke all on public.wa_queue from public, anon, authenticated;

-- the clock, unless a test sets one:  set tarmem.now = '2026-09-22 23:30+03'
create or replace function public.wa_now() returns timestamptz
language sql stable as $$ select coalesce(nullif(current_setting('tarmem.now', true), '')::timestamptz, now()) $$;

-- Between 11pm and 8am in Riyadh: when the message should go instead. Otherwise null: it can go now.
create or replace function public.wa_quiet_until(p_at timestamptz) returns timestamptz
language plpgsql stable as $$
declare local_time timestamp := p_at at time zone 'Asia/Riyadh';
begin
  if extract(hour from local_time) >= 23 then return (date_trunc('day', local_time) + interval '1 day 8 hours') at time zone 'Asia/Riyadh'; end if;
  if extract(hour from local_time) < 8 then return (date_trunc('day', local_time) + interval '8 hours') at time zone 'Asia/Riyadh'; end if;
  return null;
end;
$$;

-- 3. the send itself, as in 012, now callable for queued messages too --------------------------------
create or replace function public.wa_post(p_num text, p_lang text, p_line1 text, p_line2 text, p_path text, p_template text) returns void
language plpgsql security definer set search_path = public as $$
declare
  token text; phone_id text; tmpl text; net_schema text;
begin
  select value into token from public.app_secrets where key = 'wa_token';
  if token is null or token = '' then return; end if;
  select value into phone_id from public.app_secrets where key = 'wa_phone_id';
  select value into tmpl from public.app_secrets where key = 'wa_template';
  select n.nspname into net_schema from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.proname = 'http_post' limit 1;
  if net_schema is null then
    insert into public.email_log (recipient, template, status, detail, channel) values (p_num, p_template, 'failed', 'pg_net is not installed', 'whatsapp');
    return;
  end if;
  execute format('select %I.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 5000)', net_schema)
    using 'https://graph.facebook.com/v25.0/' || phone_id || '/messages',
          jsonb_build_object('Authorization', 'Bearer ' || token, 'Content-Type', 'application/json'),
          jsonb_build_object('messaging_product', 'whatsapp', 'to', p_num, 'type', 'template',
            'template', jsonb_build_object('name', coalesce(tmpl, 'tarmem_update'), 'language', jsonb_build_object('code', case when p_lang = 'en' then 'en' else 'ar' end),
              'components', jsonb_build_array(
                jsonb_build_object('type', 'body', 'parameters', jsonb_build_array(
                  jsonb_build_object('type', 'text', 'text', left(regexp_replace(p_line1, '\s+', ' ', 'g'), 200)),
                  jsonb_build_object('type', 'text', 'text', left(regexp_replace(p_line2, '\s+', ' ', 'g'), 400)))),
                jsonb_build_object('type', 'button', 'sub_type', 'url', 'index', '0', 'parameters', jsonb_build_array(
                  jsonb_build_object('type', 'text', 'text', ltrim(coalesce(p_path, ''), '/')))))));
  insert into public.email_log (recipient, template, status, channel) values (p_num, p_template, 'sent', 'whatsapp');
exception when others then
  insert into public.email_log (recipient, template, status, detail, channel) values (p_num, p_template, 'failed', left(sqlerrm, 300), 'whatsapp');
end;
$$;
revoke all on function public.wa_post(text, text, text, text, text, text) from public, anon, authenticated;

-- what the quiet hours held and is now due
create or replace function public.wa_flush() returns int
language plpgsql security definer set search_path = public as $$
declare q record; n int := 0;
begin
  for q in select * from public.wa_queue where due_at <= public.wa_now() order by id limit 50 loop
    perform public.wa_post(q.mobile, q.lang, q.line1, q.line2, q.path, q.template);
    delete from public.wa_queue where id = q.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.wa_flush() from public, anon, authenticated;

-- 4. send_whatsapp (same signature as 012; `tell` and the triggers keep calling it) ---------------------
create or replace function public.send_whatsapp(p_mobile text, p_lang text, p_line1 text, p_line2 text, p_path text, p_template text) returns void
language plpgsql security definer set search_path = public as $$
declare
  token text; num text; recent int; choices jsonb; hold timestamptz;
begin
  select value into token from public.app_secrets where key = 'wa_token';
  if token is null or token = '' then return; end if;                    -- not switched on: silently nothing
  num := public.wa_number(p_mobile);
  if num is null then
    insert into public.email_log (recipient, template, status, detail, channel) values (coalesce(p_mobile, '?'), p_template, 'skipped', 'not a Saudi mobile number', 'whatsapp');
    return;
  end if;
  -- the person's own choices on the settings page; a test message goes whatever they are — they just pressed the button
  select p.prefs into choices from public.profiles p where public.wa_number(p.mobile) = num limit 1;
  if p_template <> 'wa_test' and choices ->> 'channel' = 'email' then
    insert into public.email_log (recipient, template, status, detail, channel) values (num, p_template, 'skipped', 'WhatsApp switched off in their settings', 'whatsapp');
    return;
  end if;
  select count(*) into recent from public.email_log where recipient = num and channel = 'whatsapp' and status = 'sent' and at > now() - interval '1 hour';
  if recent >= 20 then
    insert into public.email_log (recipient, template, status, detail, channel) values (num, p_template, 'throttled', '20 in the last hour', 'whatsapp');
    return;
  end if;
  perform public.wa_flush();
  hold := public.wa_quiet_until(public.wa_now());
  if hold is not null and p_template not in ('wa_test', 'stage_released', 'stage_disputed') and coalesce((choices ->> 'quiet')::boolean, true) then
    insert into public.wa_queue (mobile, lang, line1, line2, path, template, due_at) values (num, p_lang, p_line1, p_line2, p_path, p_template, hold);
    insert into public.email_log (recipient, template, status, detail, channel) values (num, p_template, 'queued', 'quiet hours: goes at ' || to_char(hold at time zone 'Asia/Riyadh', 'HH24:MI'), 'whatsapp');
    return;
  end if;
  perform public.wa_post(num, p_lang, p_line1, p_line2, p_path, p_template);
exception when others then
  insert into public.email_log (recipient, template, status, detail, channel) values (coalesce(num, p_mobile, '?'), p_template, 'failed', left(sqlerrm, 300), 'whatsapp');
end;
$$;
revoke all on function public.send_whatsapp(text, text, text, text, text, text) from public, anon, authenticated;

-- 5. the card's "Send test message" ---------------------------------------------------------------------
create or replace function public.whatsapp_test() returns text
language plpgsql security definer set search_path = public as $$
declare me public.profiles; num text; today int;
begin
  if auth.uid() is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if not coalesce((select enabled from public.platform_flags where key = 'whatsapp_live'), false) then
    raise exception 'WhatsApp updates are not switched on yet' using errcode = '42501';
  end if;
  select * into me from public.profiles where id = auth.uid();
  num := public.wa_number(me.mobile);
  if num is null then raise exception 'not a Saudi mobile number' using errcode = '22023'; end if;
  select count(*) into today from public.email_log where recipient = num and channel = 'whatsapp' and template = 'wa_test' and at > now() - interval '1 day';
  if today >= 3 then raise exception 'three test messages a day' using errcode = '42501'; end if;
  if me.lang = 'en' then
    perform public.send_whatsapp(me.mobile, 'en', 'A test message from Tarmem', 'If this reached you, your project updates will arrive here too.', 'settings', 'wa_test');
  else
    perform public.send_whatsapp(me.mobile, 'ar', 'رسالة تجريبية من ترميم', 'إذا وصلتك هذه الرسالة فستصلك تحديثات مشاريعك هنا أيضًا.', 'settings', 'wa_test');
  end if;
  return num;
end;
$$;
revoke all on function public.whatsapp_test() from public, anon;
grant execute on function public.whatsapp_test() to authenticated;

-- 6. the clock that empties the queue ------------------------------------------------------------------
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('tarmem-wa-flush', '*/10 * * * *', 'select public.wa_flush()');
exception when others then
  raise notice 'pg_cron is not available here (%). The quiet-hours queue is still emptied whenever any WhatsApp goes out.', sqlerrm;
end;
$$;
