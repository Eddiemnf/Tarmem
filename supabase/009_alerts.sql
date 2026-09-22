-- =======================================================================================
-- Tarmem — 009: an email to the team the moment something arrives
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run ("Run without RLS" if asked).
-- Safe to run more than once. Needs 001–005 to have been run first.
--
-- The database itself sends the email, so there is no function to deploy and no webhooks to set up.
-- When a project is posted, a bid arrives, a contractor applies or someone writes through the
-- contact form, it calls Resend (resend.com) and an email lands in the team's mailbox.
--
-- AFTER running this, switch it on with your own details — one line, in this same editor:
--
--   select public.set_alerts('re_YOUR_RESEND_KEY', 'Tarmem <alerts@tarmem.sa>', 'support@tarmem.sa');
--
-- To stop the emails:        select public.set_alerts(null, null, null);
-- To see whether it works:   select * from public.alert_log order by at desc limit 20;
--
-- The key is kept in a table that NOTHING on the website can read: not a visitor, not a customer,
-- not even an admin account. Only this SQL editor can. Sending never blocks or breaks the website:
-- if the email fails, the failure is written to alert_log and the visitor's action still succeeds.
-- =======================================================================================

create extension if not exists pg_net;   -- Supabase's own "database webhooks" use this too

-- the settings, readable only from here -----------------------------------------------------
create table if not exists public.app_secrets (
  key    text primary key,
  value  text
);
alter table public.app_secrets enable row level security;   -- and no policy at all: nobody may read it
revoke all on public.app_secrets from anon, authenticated;

create table if not exists public.alert_log (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  what    text not null,
  status  text not null,
  detail  text
);
alter table public.alert_log enable row level security;
drop policy if exists "admins read the alert log" on public.alert_log;
create policy "admins read the alert log" on public.alert_log for select to authenticated using (public.is_admin());
revoke all on public.alert_log from anon, authenticated;
grant select on public.alert_log to authenticated;

create or replace function public.set_alerts(p_key text, p_from text default null, p_to text default null) returns text
language plpgsql security definer set search_path = public as $$
begin
  if p_key is null then
    delete from public.app_secrets where key in ('resend_key', 'alert_from', 'alert_to');
    return 'alerts are off';
  end if;
  insert into public.app_secrets (key, value) values ('resend_key', p_key), ('alert_from', coalesce(p_from, 'Tarmem <alerts@tarmem.sa>')), ('alert_to', coalesce(p_to, 'support@tarmem.sa'))
    on conflict (key) do update set value = excluded.value;
  return 'alerts are on, going to ' || coalesce(p_to, 'support@tarmem.sa');
end;
$$;
revoke all on function public.set_alerts(text, text, text) from public, anon, authenticated;

-- the email --------------------------------------------------------------------------------
create or replace function public.send_alert(p_subject text, p_lines text[]) returns void
language plpgsql security definer set search_path = public as $$
declare
  api_key text; sender text; recipients text; body text; net_schema text;
begin
  select value into api_key from public.app_secrets where key = 'resend_key';
  if api_key is null or api_key = '' then return; end if;          -- alerts are not switched on
  select value into sender from public.app_secrets where key = 'alert_from';
  select value into recipients from public.app_secrets where key = 'alert_to';

  body := '<div dir="rtl" style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.9;color:#14113F">'
       || '<p style="font-size:17px;font-weight:600;color:#1B1464">' || replace(p_subject, '<', '&lt;') || '</p>'
       || coalesce((select string_agg('<p>' || replace(l, '<', '&lt;') || '</p>', '') from unnest(p_lines) l), '')
       || '<p style="margin-top:18px"><a href="https://www.tarmem.sa/admin" style="background:#FF5A3C;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none">افتح لوحة الإدارة</a></p></div>';

  -- pg_net lives in its own schema, whose name differs between Supabase versions: find it rather than assume it
  select n.nspname into net_schema from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.proname = 'http_post' limit 1;
  if net_schema is null then
    insert into public.alert_log (what, status, detail) values (p_subject, 'failed', 'pg_net is not installed');
    return;
  end if;

  execute format('select %I.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 5000)', net_schema)
    using 'https://api.resend.com/emails',
          jsonb_build_object('Authorization', 'Bearer ' || api_key, 'Content-Type', 'application/json'),
          jsonb_build_object('from', sender, 'to', string_to_array(recipients, ','), 'subject', p_subject, 'html', body);

  insert into public.alert_log (what, status) values (p_subject, 'sent');
exception when others then
  insert into public.alert_log (what, status, detail) values (p_subject, 'failed', left(sqlerrm, 300));
end;
$$;
revoke all on function public.send_alert(text, text[]) from public, anon, authenticated;

create or replace function public.alert_on_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare subject text; lines text[]; money text;
begin
  if tg_table_name = 'projects' then
    if coalesce(new.title, '') like 'RLS TEST%' then return new; end if;
    money := to_char(new.budget_min, 'FM999,999,999') || ' – ' || to_char(new.budget_max, 'FM999,999,999') || ' ريال';
    subject := 'مشروع جديد ' || new.code || ': ' || new.title;
    lines := array['المدينة: ' || new.city, 'التخصص: ' || new.trade, 'الميزانية: ' || money, 'الوصف: ' || left(new.description, 300)];
  elsif tg_table_name = 'bids' then
    subject := 'عرض جديد بقيمة ' || to_char(new.price, 'FM999,999,999') || ' ريال';
    lines := array['المدة: ' || new.days || ' يوم', coalesce('ملاحظات المقاول: ' || left(new.note, 300), '')];
  elsif tg_table_name = 'contractor_applications' then
    if coalesce(new.company, '') = 'RLS TEST' then return new; end if;
    subject := 'طلب انضمام مقاول: ' || new.company;
    lines := array['المسؤول: ' || new.person, 'الجوال: ' || new.mobile, 'المدينة: ' || new.city];
  elsif tg_table_name = 'contact_messages' then
    if coalesce(new.name, '') = 'RLS TEST' then return new; end if;
    subject := 'رسالة جديدة من ' || new.name;
    lines := array[coalesce('الموضوع: ' || new.topic, ''), coalesce('الجوال: ' || new.mobile, ''), coalesce('البريد: ' || new.email, ''), left(new.message, 400)];
  else
    return new;
  end if;
  perform public.send_alert(subject, array_remove(lines, ''));
  return new;
end;
$$;

drop trigger if exists alert_new_project on public.projects;
create trigger alert_new_project after insert on public.projects for each row execute function public.alert_on_insert();
drop trigger if exists alert_new_bid on public.bids;
create trigger alert_new_bid after insert on public.bids for each row execute function public.alert_on_insert();
drop trigger if exists alert_new_application on public.contractor_applications;
create trigger alert_new_application after insert on public.contractor_applications for each row execute function public.alert_on_insert();
drop trigger if exists alert_new_message on public.contact_messages;
create trigger alert_new_message after insert on public.contact_messages for each row execute function public.alert_on_insert();
