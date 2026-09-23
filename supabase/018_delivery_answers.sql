-- =======================================================================================
-- Tarmem — 018: the real answer behind every "sent" — Resend's and Meta's — on the log the admin console shows
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run. Safe to run more than once. Needs 001–017.
--
-- "sent" in email_log has always meant "handed to pg_net", which sends after the transaction and keeps the
-- provider's reply in net._http_response for a few hours. This keeps pg_net's request id on each log row and
-- copies the reply back onto it — `answer` = accepted, or the provider's own refusal in words, or "timed out" —
-- through wa_reconcile(): run by pg_cron every ten minutes where pg_cron exists, and by the admin console
-- whenever the team opens the inbox. The console then shows, for every email and WhatsApp, what actually
-- happened, without the SQL editor.
-- =======================================================================================

alter table public.email_log add column if not exists request_id bigint;
alter table public.email_log add column if not exists answer text;
alter table public.email_log add column if not exists answer_code int;
create index if not exists email_log_unanswered_idx on public.email_log (at desc) where request_id is not null and answer is null;

create or replace function public.send_email(p_to text, p_lang text, p_subject text, p_lines text[], p_cta_url text, p_cta_label text, p_template text) returns void
language plpgsql security definer set search_path = public as $$
declare
  api_key text; sender text; net_schema text; recent int; req_id bigint;
begin
  if p_to is null or p_to !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return; end if;
  select value into api_key from public.app_secrets where key = 'resend_key';
  if api_key is null or api_key = '' then
    insert into public.email_log (recipient, template, status, detail) values (p_to, p_template, 'skipped', 'alerts are not switched on');
    return;
  end if;
  select value into sender from public.app_secrets where key = 'alert_from';
  select count(*) into recent from public.email_log where recipient = p_to and status = 'sent' and at > now() - interval '1 hour';
  if recent >= 20 then
    insert into public.email_log (recipient, template, status, detail) values (p_to, p_template, 'throttled', '20 in the last hour');
    return;
  end if;
  select n.nspname into net_schema from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.proname = 'http_post' limit 1;
  if net_schema is null then
    insert into public.email_log (recipient, template, status, detail) values (p_to, p_template, 'failed', 'pg_net is not installed');
    return;
  end if;
  execute format('select %I.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 5000)', net_schema) into req_id
    using 'https://api.resend.com/emails',
          jsonb_build_object('Authorization', 'Bearer ' || api_key, 'Content-Type', 'application/json'),
          jsonb_build_object('from', coalesce(sender, 'Tarmem <alerts@tarmem.sa>'), 'to', array[p_to], 'subject', p_subject,
                             'html', public.email_html(p_lang, p_subject, p_lines, p_cta_url, p_cta_label));
  insert into public.email_log (recipient, template, status, request_id) values (p_to, p_template, 'sent', req_id);
exception when others then
  insert into public.email_log (recipient, template, status, detail) values (coalesce(p_to, '?'), p_template, 'failed', left(sqlerrm, 300));
end;
$$;

create or replace function public.wa_post(p_num text, p_lang text, p_event text, p_params text[], p_path text) returns void
language plpgsql security definer set search_path = public as $$
declare
  token text; phone_id text; net_schema text; params jsonb; comps jsonb; req_id bigint;
begin
  select value into token from public.app_secrets where key = 'wa_token';
  if token is null or token = '' then return; end if;
  select value into phone_id from public.app_secrets where key = 'wa_phone_id';
  select nsp.nspname into net_schema from pg_proc p join pg_namespace nsp on nsp.oid = p.pronamespace where p.proname = 'http_post' limit 1;
  if net_schema is null then
    insert into public.email_log (recipient, template, status, detail, channel) values (p_num, p_event, 'failed', 'pg_net is not installed', 'whatsapp');
    return;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('type', 'text', 'text', left(trim(regexp_replace(coalesce(u.x, ''), '\s+', ' ', 'g')), 300)) order by u.i), '[]'::jsonb)
    into params from unnest(coalesce(p_params, '{}')) with ordinality as u(x, i);
  comps := case when jsonb_array_length(params) > 0 then jsonb_build_array(jsonb_build_object('type', 'body', 'parameters', params)) else '[]'::jsonb end
        || jsonb_build_array(jsonb_build_object('type', 'button', 'sub_type', 'url', 'index', '0', 'parameters', jsonb_build_array(
             jsonb_build_object('type', 'text', 'text', ltrim(coalesce(p_path, ''), '/')))));
  execute format('select %I.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 5000)', net_schema) into req_id
    using 'https://graph.facebook.com/v25.0/' || phone_id || '/messages',
          jsonb_build_object('Authorization', 'Bearer ' || token, 'Content-Type', 'application/json'),
          jsonb_build_object('messaging_product', 'whatsapp', 'to', p_num, 'type', 'template',
            'template', jsonb_build_object('name', public.wa_template_name(p_event), 'language', jsonb_build_object('code', case when p_lang = 'en' then 'en' else 'ar' end), 'components', comps));
  insert into public.email_log (recipient, template, status, channel, request_id) values (p_num, p_event, 'sent', 'whatsapp', req_id);
exception when others then
  insert into public.email_log (recipient, template, status, detail, channel) values (p_num, p_event, 'failed', left(sqlerrm, 300), 'whatsapp');
end;
$$;

-- text that may or may not be JSON
create or replace function public.wa_json(p text) returns jsonb
language plpgsql immutable as $$
begin
  return p::jsonb;
exception when others then
  return null;
end;
$$;

-- copy the providers' replies onto the log rows that are still waiting for one (the last day; pg_net forgets sooner)
create or replace function public.wa_reconcile() returns int
language plpgsql security definer set search_path = public as $$
declare net_schema text; n int := 0;
begin
  if auth.uid() is not null and not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  select nsp.nspname into net_schema from pg_proc p join pg_namespace nsp on nsp.oid = p.pronamespace where p.proname = 'http_post' limit 1;
  if net_schema is null then return 0; end if;
  execute format($q$
    with answered as (
      select e.id, r.status_code, r.timed_out, r.error_msg, public.wa_json(r.content) as body
      from public.email_log e join %I._http_response r on r.id = e.request_id
      where e.request_id is not null and e.answer is null and e.at > now() - interval '1 day'
    )
    update public.email_log e set
      answer_code = a.status_code,
      answer = case
        when a.status_code between 200 and 299 then 'accepted'
        when a.timed_out then 'timed out'
        else coalesce(a.body -> 'error' ->> 'message', a.body ->> 'message', a.error_msg, 'refused')
      end
    from answered a where a.id = e.id
  $q$, net_schema);
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.wa_reconcile() from public, anon;
grant execute on function public.wa_reconcile() to authenticated;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('tarmem-wa-reconcile', '*/10 * * * *', 'select public.wa_reconcile()');
exception when others then
  raise notice 'pg_cron is not available here (%). The admin console reconciles when the inbox is opened.', sqlerrm;
end;
$$;
