-- =======================================================================================
-- Tarmem — 022: replies reach the team, spam limits on the public forms, account erasure,
-- site errors in the visit log, and mobile verification by a WhatsApp code (switched on later)
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run. Safe to run again.
--
-- 1. Every email the site sends now carries reply-to support@tarmem.sa (or the app_secrets
--    key 'alert_reply_to'), so a customer who answers an alert reaches the team.
-- 2. The two public forms (contact, contractor application) accept at most five entries an
--    hour from the same email or mobile, and forty in ten minutes in all.
-- 3. Erasure. delete_my_account() (the settings page) and admin_delete_user(id) (the console)
--    remove a person's data: the profile is scrubbed to "deleted account" with no email, no
--    real number and no preferences; portfolio, bank details, their messages, their contact
--    messages and their files' records go; the login record gets a dead email, no password and
--    a permanent ban, and every session is cut. Projects, bids, agreements and wallet entries
--    stay, under the anonymous profile, as contractual and financial records. An account with
--    a project in progress must finish it first.
-- 4. The visit log accepts event 'error' with a short detail, so the console can show what
--    broke in visitors' browsers.
-- 5. Mobile verification: a six-digit code sent by WhatsApp (authentication template
--    tarmem_otp, submitted to Meta at the end of this file). otp_request() sends one to the
--    signed-in person's number (three an hour), otp_check(code) confirms it within ten
--    minutes and stamps profiles.mobile_verified_at. Off until set_otp(true), which waits for
--    Meta to approve the template.
-- =======================================================================================

-- ---------------------------------------------------------------------------------------
-- 1. Replies reach the team
-- ---------------------------------------------------------------------------------------
create or replace function public.send_email(p_to text, p_lang text, p_subject text, p_lines text[], p_cta_url text, p_cta_label text, p_template text) returns void
language plpgsql security definer set search_path = public as $$
declare
  api_key text; sender text; reply_to text; net_schema text; recent int; req_id bigint;
begin
  if p_to is null or p_to !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return; end if;
  select value into api_key from public.app_secrets where key = 'resend_key';
  if api_key is null or api_key = '' then
    insert into public.email_log (recipient, template, status, detail) values (p_to, p_template, 'skipped', 'alerts are not switched on');
    return;
  end if;
  select value into sender from public.app_secrets where key = 'alert_from';
  select value into reply_to from public.app_secrets where key = 'alert_reply_to';
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
                             'reply_to', coalesce(nullif(reply_to, ''), 'support@tarmem.sa'),
                             'html', public.email_html(p_lang, p_subject, p_lines, p_cta_url, p_cta_label));
  insert into public.email_log (recipient, template, status, request_id) values (p_to, p_template, 'sent', req_id);
exception when others then
  insert into public.email_log (recipient, template, status, detail) values (coalesce(p_to, '?'), p_template, 'failed', left(sqlerrm, 300));
end;
$$;

-- ---------------------------------------------------------------------------------------
-- 2. Spam limits on the public forms
-- ---------------------------------------------------------------------------------------
create or replace function public.forms_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare same int := 0; burst int := 0;
begin
  if tg_table_name = 'contact_messages' then
    select count(*) into same from public.contact_messages m
      where m.created_at > now() - interval '1 hour'
        and ((new.email is not null and lower(m.email) = lower(new.email))
          or (new.mobile is not null and public.mobile_key(m.mobile) = public.mobile_key(new.mobile)));
    select count(*) into burst from public.contact_messages where created_at > now() - interval '10 minutes';
  else
    select count(*) into same from public.contractor_applications a
      where a.created_at > now() - interval '1 hour'
        and ((new.email is not null and lower(a.email) = lower(new.email))
          or public.mobile_key(a.mobile) = public.mobile_key(new.mobile));
    select count(*) into burst from public.contractor_applications where created_at > now() - interval '10 minutes';
  end if;
  if same >= 5 then raise exception 'too many: five in an hour from the same address or number' using errcode = 'P0001'; end if;
  if burst >= 40 then raise exception 'too many right now: please try again in a few minutes' using errcode = 'P0001'; end if;
  return new;
end $$;
drop trigger if exists contact_messages_rate_limit on public.contact_messages;
create trigger contact_messages_rate_limit before insert on public.contact_messages for each row execute function public.forms_rate_limit();
drop trigger if exists contractor_applications_rate_limit on public.contractor_applications;
create trigger contractor_applications_rate_limit before insert on public.contractor_applications for each row execute function public.forms_rate_limit();

-- ---------------------------------------------------------------------------------------
-- 4. Site errors in the visit log (before erasure, which touches visits)
-- ---------------------------------------------------------------------------------------
alter table public.visits drop constraint if exists visits_event_check;
alter table public.visits add constraint visits_event_check check (event in ('view', 'signup', 'signin', 'project', 'application', 'contact', 'error'));
alter table public.visits add column if not exists detail text check (detail is null or char_length(detail) <= 300);
grant insert (detail) on public.visits to anon, authenticated;

-- ---------------------------------------------------------------------------------------
-- 5a. Mobile codes: the table first, erasure deletes from it
-- ---------------------------------------------------------------------------------------
insert into public.platform_flags (key, enabled) values ('otp_live', false) on conflict (key) do nothing;
alter table public.profiles add column if not exists mobile_verified_at timestamptz;
create table if not exists public.mobile_codes (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  mobile_key  text not null,
  code_hash   text not null,
  expires_at  timestamptz not null,
  attempts    int not null default 0,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists mobile_codes_user_idx on public.mobile_codes (user_id, created_at desc);
alter table public.mobile_codes enable row level security;
revoke all on public.mobile_codes from anon, authenticated; -- only the two functions below touch it

-- ---------------------------------------------------------------------------------------
-- 3. Account erasure
-- ---------------------------------------------------------------------------------------
alter table public.profiles add column if not exists deleted_at timestamptz;

-- erased accounts carry a dead number: they neither block a real one nor count as "taken"
create or replace function public.profiles_mobile_unique() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.mobile is null or public.mobile_key(new.mobile) is null or new.deleted_at is not null then return new; end if;
  if exists (select 1 from public.profiles p
             where p.id <> new.id and p.deleted_at is null and public.mobile_key(p.mobile) = public.mobile_key(new.mobile)) then
    raise exception 'mobile_taken: this mobile number belongs to another account' using errcode = '23505';
  end if;
  return new;
end $$;
create or replace function public.mobile_taken(p_mobile text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.mobile_key(p_mobile) is not null
     and exists (select 1 from public.profiles where deleted_at is null and public.mobile_key(mobile) = public.mobile_key(p_mobile));
$$;

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

-- the settings page: the person removes their own account
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if public.is_admin() then raise exception 'an admin account is removed by another admin'; end if;
  perform public.erase_account(auth.uid());
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- the console: the team removes a person (never themselves, never another admin)
create or replace function public.admin_delete_user(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  if p_user = auth.uid() then raise exception 'not yourself'; end if;
  if exists (select 1 from public.profiles where id = p_user and role = 'admin') then raise exception 'another admin is removed in the SQL editor, not here'; end if;
  perform public.erase_account(p_user);
end $$;
revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;

-- a dead login record gets no "password changed" email
create or replace function public.notify_password_changed() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  lang text; who text; site text;
begin
  if old.encrypted_password is null or new.encrypted_password is not distinct from old.encrypted_password then return new; end if;
  if new.email is null or new.email like '%@deleted.tarmem.sa' or new.encrypted_password is null then return new; end if;
  select p.lang, split_part(btrim(p.full_name), ' ', 1) into lang, who from public.profiles p where p.id = new.id;
  lang := coalesce(lang, 'ar');
  site := coalesce((select value from public.app_secrets where key = 'site_url'), 'https://www.tarmem.sa');
  if lang = 'en' then
    perform public.send_email(new.email, 'en', 'Your Tarmem password was changed',
      array['Hello ' || coalesce(who, '') || ',',
            'The password of your Tarmem account was changed just now.',
            'If that was you, there is nothing to do.',
            'If it was not you, reset your password right away from the sign-in page and write to support@tarmem.sa.'],
      site || '/signin', 'Open the sign-in page', 'password_changed');
  else
    perform public.send_email(new.email, 'ar', 'تم تغيير كلمة مرور حسابك في ترميم',
      array['مرحبًا ' || coalesce(who, '') || '،',
            'تم تغيير كلمة مرور حسابك في ترميم قبل قليل.',
            'إذا كنت أنت من غيّرها فلا يلزمك شيء.',
            'وإن لم تكن أنت، فأعد تعيين كلمة المرور فورًا من صفحة تسجيل الدخول وراسلنا على support@tarmem.sa.'],
      site || '/signin', 'فتح صفحة تسجيل الدخول', 'password_changed');
  end if;
  return new;
exception when others then
  return new;
end $$;

-- ---------------------------------------------------------------------------------------
-- 5b. Mobile verification by a WhatsApp code
-- ---------------------------------------------------------------------------------------
create or replace function public.set_otp(p_on boolean) returns text
language plpgsql security definer set search_path = public as $$
begin
  insert into public.platform_flags (key, enabled) values ('otp_live', coalesce(p_on, false))
    on conflict (key) do update set enabled = excluded.enabled;
  return 'mobile verification by WhatsApp code: ' || case when coalesce(p_on, false) then 'on' else 'off' end;
end $$;
revoke all on function public.set_otp(boolean) from public, anon, authenticated; -- the SQL editor only

-- one authentication-template message: the code goes in the body and on the copy button
create or replace function public.wa_post_otp(p_num text, p_lang text, p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare
  token text; phone_id text; net_schema text; comps jsonb; req_id bigint;
begin
  select value into token from public.app_secrets where key = 'wa_token';
  if token is null or token = '' then
    insert into public.email_log (recipient, template, status, detail, channel) values (p_num, 'otp', 'skipped', 'WhatsApp is not switched on', 'whatsapp');
    return;
  end if;
  select value into phone_id from public.app_secrets where key = 'wa_phone_id';
  select nsp.nspname into net_schema from pg_proc p join pg_namespace nsp on nsp.oid = p.pronamespace where p.proname = 'http_post' limit 1;
  if net_schema is null then
    insert into public.email_log (recipient, template, status, detail, channel) values (p_num, 'otp', 'failed', 'pg_net is not installed', 'whatsapp');
    return;
  end if;
  comps := jsonb_build_array(
    jsonb_build_object('type', 'body', 'parameters', jsonb_build_array(jsonb_build_object('type', 'text', 'text', p_code))),
    jsonb_build_object('type', 'button', 'sub_type', 'url', 'index', '0', 'parameters', jsonb_build_array(jsonb_build_object('type', 'text', 'text', p_code))));
  execute format('select %I.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 5000)', net_schema) into req_id
    using 'https://graph.facebook.com/v25.0/' || phone_id || '/messages',
          jsonb_build_object('Authorization', 'Bearer ' || token, 'Content-Type', 'application/json'),
          jsonb_build_object('messaging_product', 'whatsapp', 'to', p_num, 'type', 'template',
            'template', jsonb_build_object('name', 'tarmem_otp', 'language', jsonb_build_object('code', case when p_lang = 'en' then 'en' else 'ar' end), 'components', comps));
  insert into public.email_log (recipient, template, status, channel, request_id) values (p_num, 'otp', 'sent', 'whatsapp', req_id);
exception when others then
  insert into public.email_log (recipient, template, status, detail, channel) values (p_num, 'otp', 'failed', left(sqlerrm, 300), 'whatsapp');
end;
$$;
revoke all on function public.wa_post_otp(text, text, text) from public, anon, authenticated;

create or replace function public.otp_request() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); me record; num text; recent int; code text;
begin
  if uid is null then raise exception 'sign in first'; end if;
  if not exists (select 1 from public.platform_flags where key = 'otp_live' and enabled) then raise exception 'otp_off: mobile verification is not switched on'; end if;
  select mobile, lang into me from public.profiles where id = uid;
  if not found then raise exception 'no profile yet'; end if;
  num := public.wa_number(me.mobile);
  if num is null then raise exception 'not a Saudi mobile number'; end if;
  select count(*) into recent from public.mobile_codes where user_id = uid and created_at > now() - interval '1 hour';
  if recent >= 3 then raise exception 'too many codes: wait an hour' using errcode = 'P0001'; end if;
  code := lpad(floor(random() * 1000000)::int::text, 6, '0');
  insert into public.mobile_codes (user_id, mobile_key, code_hash, expires_at)
    values (uid, public.mobile_key(me.mobile), md5(code || uid::text), now() + interval '10 minutes');
  perform public.wa_post_otp(num, me.lang, code);
  return jsonb_build_object('sent', true, 'to', num);
end $$;
revoke all on function public.otp_request() from public, anon;
grant execute on function public.otp_request() to authenticated;

create or replace function public.otp_check(p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); c record;
begin
  if uid is null then raise exception 'sign in first'; end if;
  select * into c from public.mobile_codes where user_id = uid and used_at is null order by created_at desc limit 1;
  if not found or c.expires_at < now() or c.attempts >= 5 then return false; end if;
  if c.code_hash = md5(regexp_replace(coalesce(p_code, ''), '[^0-9]', '', 'g') || uid::text) then
    update public.mobile_codes set used_at = now() where id = c.id;
    update public.profiles set mobile_verified_at = now() where id = uid;
    return true;
  end if;
  update public.mobile_codes set attempts = attempts + 1 where id = c.id;
  return false;
end $$;
revoke all on function public.otp_check(text) from public, anon;
grant execute on function public.otp_check(text) to authenticated;

-- Meta's authentication template: fixed wording by Meta, the code on a copy button, ten-minute expiry
create or replace function public.wa_submit_otp_template(p_waba_id text default '2162520270999056') returns text
language plpgsql security definer set search_path = public as $$
declare
  token text; net_schema text; lang text; body jsonb; n int := 0;
begin
  select value into token from public.app_secrets where key = 'wa_token';
  if token is null or token = '' then raise exception 'WhatsApp is not switched on yet: run set_whatsapp first'; end if;
  select nsp.nspname into net_schema from pg_proc p join pg_namespace nsp on nsp.oid = p.pronamespace where p.proname = 'http_post' limit 1;
  if net_schema is null then raise exception 'pg_net is not installed'; end if;
  foreach lang in array array['ar', 'en'] loop
    body := jsonb_build_object('name', 'tarmem_otp', 'language', lang, 'category', 'AUTHENTICATION', 'allow_category_change', false,
      'components', jsonb_build_array(
        jsonb_build_object('type', 'BODY', 'add_security_recommendation', true),
        jsonb_build_object('type', 'FOOTER', 'code_expiration_minutes', 10),
        jsonb_build_object('type', 'BUTTONS', 'buttons', jsonb_build_array(jsonb_build_object('type', 'OTP', 'otp_type', 'COPY_CODE')))));
    execute format('select %I.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 8000)', net_schema)
      using 'https://graph.facebook.com/v25.0/' || p_waba_id || '/message_templates',
            jsonb_build_object('Authorization', 'Bearer ' || token, 'Content-Type', 'application/json'), body;
    insert into public.email_log (recipient, template, status, detail, channel) values ('meta', 'tarmem_otp', 'submitted', lang, 'whatsapp');
    n := n + 1;
  end loop;
  return n || ' authentication templates sent to Meta. Its answers: select created, status_code, content from net._http_response order by created desc limit 5;';
end $$;
revoke all on function public.wa_submit_otp_template(text) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from public.app_secrets where key = 'wa_token' and value <> '')
     and not exists (select 1 from public.email_log where template = 'tarmem_otp' and status = 'submitted') then
    raise notice '%', public.wa_submit_otp_template();
  end if;
end $$;

select 'replies to the team, spam limits, account erasure, error log, mobile codes (off until set_otp(true)): ready' as result;
