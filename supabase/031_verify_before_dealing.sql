-- =======================================================================================
-- Tarmem — 031: explore first, verify before dealing
--
-- The owner's rule (30 September 2026): whoever registers is in at once and can look around; they cannot deal with the
-- other side until they have confirmed their email and given their name and mobile (and, once mobile codes are switched
-- on, verified the mobile too). Supabase's own "Confirm email" is switched OFF for this, so a sign-up opens a session
-- straight away; the proof of the address is now Tarmem's own:
--   · profiles.email_verified_at / email_verified_email: set only by opening the link in the "confirm your email" mail
--     Tarmem sends at sign-up (send_email_verification, resent by request_email_verification). Accounts that already
--     had a confirmed login email are counted as confirmed (they signed up before this rule, or confirmed Supabase's link).
--   · email_proven() — which 029's erasure rule, the console's detail and 030's claim_my_application already ask — now
--     means exactly that.
--   · can_interact(user): confirmed email + a name + a mobile (+ a verified mobile once otp_live is on); admins always.
-- What waits for it:
--   · a homeowner's project is saved but shown to contractors only once its owner can deal (a restrictive row rule, and
--     the project's photos likewise);
--   · bids, messages, choosing a bid, both signatures and change requests are refused with
--     "verify your account first: confirm your email and add your name and mobile";
--   · no email or WhatsApp about projects goes to an account that has not confirmed its email (only the confirmation
--     mail itself, replies to what it sent, and its password mails).
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run. Safe to run again. Needs 001–030.
-- Then switch Authentication → Sign In / Providers → "Confirm email" OFF (Save).
-- =======================================================================================

-- 1. the proof, kept on the profile ------------------------------------------------------------------------------------
alter table public.profiles add column if not exists email_verified_at timestamptz;
alter table public.profiles add column if not exists email_verified_email text check (email_verified_email is null or char_length(email_verified_email) <= 320);
-- (the site's column grants — 001 — never included these: only the link below writes them)

create or replace function public.email_proven(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select p.email_verified_at is not null and p.email_verified_email is not null and u.email is not null
       and lower(p.email_verified_email) = lower(u.email)
      from public.profiles p join auth.users u on u.id = p.id
     where p.id = p_user), false)
$$;
revoke all on function public.email_proven(uuid) from public, anon, authenticated;

-- who may deal with the other side
create or replace function public.can_interact(p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select p.role = 'admin'
        or (p.deleted_at is null
            and public.email_proven(p.id)
            and nullif(btrim(coalesce(p.full_name, '')), '') is not null
            and nullif(btrim(coalesce(p.mobile, '')), '') is not null
            and (not coalesce((select f.enabled from public.platform_flags f where f.key = 'otp_live'), false) or p.mobile_verified_at is not null))
      from public.profiles p where p.id = p_user), false)
$$;
revoke all on function public.can_interact(uuid) from public, anon;
grant execute on function public.can_interact(uuid) to authenticated;

-- a project's owner, read past the row rules (used inside them, where a plain read of projects would loop)
create or replace function public.owner_can_interact(p_project uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select public.can_interact(pr.owner_id) from public.projects pr where pr.id = p_project), false)
$$;
revoke all on function public.owner_can_interact(uuid) from public, anon;
grant execute on function public.owner_can_interact(uuid) to authenticated;

-- 2. the link ----------------------------------------------------------------------------------------------------------
create table if not exists public.email_verifications (
  token_hash  text primary key,                     -- sha-256 of the token in the link; the token itself is never kept
  user_id     uuid not null references public.profiles (id) on delete cascade,
  email       text not null,                        -- the address it was sent to: a link proves only that one
  created_at  timestamptz not null default now(),
  used_at     timestamptz
);
create index if not exists email_verifications_user_idx on public.email_verifications (user_id, created_at desc);
alter table public.email_verifications enable row level security;
revoke all on public.email_verifications from public, anon, authenticated;

create or replace function public.send_email_verification(p_user uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  p record; addr text; tok text; recent int; today int; ar boolean;
begin
  select pr.role, pr.lang, pr.deleted_at into p from public.profiles pr where pr.id = p_user;
  if not found or p.deleted_at is not null or p.role = 'admin' then return 'none'; end if;
  if public.email_proven(p_user) then return 'already'; end if;
  select u.email into addr from auth.users u where u.id = p_user;
  if addr is null then return 'none'; end if;
  select count(*) filter (where created_at > now() - interval '1 hour'), count(*) filter (where created_at > now() - interval '1 day')
    into recent, today from public.email_verifications where user_id = p_user;
  if recent >= 3 or today >= 10 then return 'too_many'; end if;
  tok := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.email_verifications (token_hash, user_id, email) values (encode(extensions.digest(tok, 'sha256'), 'hex'), p_user, lower(addr));
  ar := coalesce(p.lang, 'ar') <> 'en';
  perform public.send_email(addr, case when ar then 'ar' else 'en' end,
    case when ar then 'أكّد بريدك الإلكتروني في ترميم' else 'Confirm your email for Tarmem' end,
    case when ar then array[
        'اضغط الزر لتأكيد بريدك الإلكتروني.',
        case when p.role = 'contractor' then 'بعد التأكيد تستطيع تقديم عروضك ومراسلة أصحاب المنازل.'
             else 'بعد التأكيد يظهر مشروعك للمقاولين، وتستطيع مراسلتهم واعتماد العروض.' end,
        'إن لم تنشئ حسابًا في ترميم فتجاهل هذه الرسالة.']
      else array[
        'Press the button to confirm your email address.',
        case when p.role = 'contractor' then 'Once it is confirmed you can send bids and message homeowners.'
             else 'Once it is confirmed your project is shown to contractors, and you can message them and accept a bid.' end,
        'If you did not create a Tarmem account, ignore this email.'] end,
    'https://www.tarmem.sa/?verify=' || tok,
    case when ar then 'تأكيد البريد' else 'Confirm email' end,
    'email_verify');
  return 'sent';
end $$;
revoke all on function public.send_email_verification(uuid) from public, anon, authenticated;

-- "send it again", from the site's banner
create or replace function public.request_email_verification() returns jsonb
language plpgsql security definer set search_path = public as $$
declare r text;
begin
  if auth.uid() is null then raise exception 'sign in first' using errcode = '42501'; end if;
  r := public.send_email_verification(auth.uid());
  return jsonb_build_object('ok', r in ('sent', 'already'), 'status', r);
end $$;
revoke all on function public.request_email_verification() from public, anon;
grant execute on function public.request_email_verification() to authenticated;

-- the link itself: opened signed in or not (the token is the proof)
create or replace function public.confirm_email_verification(p_token text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v record; addr text; h text;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{48}$' then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  h := encode(extensions.digest(p_token, 'sha256'), 'hex');
  select * into v from public.email_verifications where token_hash = h for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  if v.used_at is not null then
    if public.email_proven(v.user_id) then return jsonb_build_object('ok', true, 'already', true); end if;
    return jsonb_build_object('ok', false, 'error', 'used');
  end if;
  if v.created_at < now() - interval '3 days' then return jsonb_build_object('ok', false, 'error', 'expired'); end if;
  select u.email into addr from auth.users u where u.id = v.user_id;
  if addr is null or lower(addr) <> v.email or not exists (select 1 from public.profiles p where p.id = v.user_id and p.deleted_at is null) then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  update public.email_verifications set used_at = now() where user_id = v.user_id and used_at is null;
  update public.profiles set email_verified_at = now(), email_verified_email = v.email where id = v.user_id;
  insert into public.events (actor_id, entity, entity_id, action, detail) values (v.user_id, 'profile', v.user_id::text, 'email_confirmed', '{}'::jsonb);
  return jsonb_build_object('ok', true, 'role', (select role from public.profiles where id = v.user_id));
end $$;
revoke all on function public.confirm_email_verification(text) from public;
grant execute on function public.confirm_email_verification(text) to anon, authenticated;

-- a new account: nobody writes the proof for themselves; the confirmation mail goes out as the profile is made
create or replace function public.profiles_email_proof() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then new.email_verified_at := null; new.email_verified_email := null; end if;
  return new;
end $$;
drop trigger if exists profiles_email_proof on public.profiles;
create trigger profiles_email_proof before insert on public.profiles for each row execute function public.profiles_email_proof();

create or replace function public.profiles_send_verification() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email_verified_at is null and new.role in ('homeowner', 'contractor') then
    begin perform public.send_email_verification(new.id); exception when others then null; end;
  end if;
  return null;
end $$;
drop trigger if exists profiles_send_verification on public.profiles;
create trigger profiles_send_verification after insert on public.profiles for each row execute function public.profiles_send_verification();

-- 3. what waits for it -------------------------------------------------------------------------------------------------
-- a project reaches contractors only once its owner can deal (its owner, the team and its awarded contractor always see it)
drop policy if exists "a project reaches contractors once its owner can deal" on public.projects;
create policy "a project reaches contractors once its owner can deal" on public.projects as restrictive for select to authenticated
  using (owner_id = (select auth.uid()) or contractor_id = (select auth.uid()) or (select public.is_admin()) or public.can_interact(owner_id));

-- and so do its photos
create or replace function public.can_see_project_files(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.projects pr
    where pr.id::text = p
      and ((pr.status = 'open' and public.is_verified_contractor() and public.can_interact(pr.owner_id)) or pr.contractor_id = auth.uid()
           or exists (select 1 from public.bids b where b.project_id = pr.id and b.contractor_id = auth.uid()))
  );
$$;

-- bids: from a contractor who can deal, on a project whose owner can
drop policy if exists "bids come from people who can deal" on public.bids;
create policy "bids come from people who can deal" on public.bids as restrictive for insert to authenticated
  with check (public.can_interact() and public.owner_can_interact(project_id));

-- messages
drop policy if exists "messages come from people who can deal" on public.project_messages;
create policy "messages come from people who can deal" on public.project_messages as restrictive for insert to authenticated
  with check (public.can_interact());

-- choosing a bid
create or replace function public.gate_choose_bid() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and new.status is distinct from old.status
     and auth.uid() = (select pr.owner_id from public.projects pr where pr.id = new.project_id)
     and not public.can_interact(auth.uid()) then
    raise exception 'verify your account first: confirm your email and add your name and mobile' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists bids_gate_choose on public.bids;
create trigger bids_gate_choose before update of status on public.bids for each row execute function public.gate_choose_bid();

-- both signatures
create or replace function public.gate_signatures() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.homeowner_signed_at is not null and not public.can_interact(new.homeowner_id) then raise exception 'verify your account first: confirm your email and add your name and mobile' using errcode = '42501'; end if;
    if new.contractor_signed_at is not null and not public.can_interact(new.contractor_id) then raise exception 'verify your account first: confirm your email and add your name and mobile' using errcode = '42501'; end if;
  else
    if new.homeowner_signed_at is not null and old.homeowner_signed_at is null and not public.can_interact(new.homeowner_id) then raise exception 'verify your account first: confirm your email and add your name and mobile' using errcode = '42501'; end if;
    if new.contractor_signed_at is not null and old.contractor_signed_at is null and not public.can_interact(new.contractor_id) then raise exception 'verify your account first: confirm your email and add your name and mobile' using errcode = '42501'; end if;
  end if;
  return new;
end $$;
drop trigger if exists agreements_gate on public.agreements;
create trigger agreements_gate before insert or update on public.agreements for each row execute function public.gate_signatures();

-- change requests: proposing and approving
create or replace function public.gate_change_requests() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.can_interact(auth.uid()) then raise exception 'verify your account first: confirm your email and add your name and mobile' using errcode = '42501'; end if;
  return new;
end $$;
drop trigger if exists change_requests_gate on public.change_requests;
create trigger change_requests_gate before insert or update on public.change_requests for each row execute function public.gate_change_requests();

-- 4. no project mail or WhatsApp to an unconfirmed account (send_email as 022, send_whatsapp as 029, each + one rule) ----
create or replace function public.send_email(p_to text, p_lang text, p_subject text, p_lines text[], p_cta_url text, p_cta_label text, p_template text) returns void
language plpgsql security definer set search_path = public as $$
declare
  api_key text; sender text; reply_to text; net_schema text; recent int; req_id bigint;
begin
  if p_to is null or p_to !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return; end if;
  -- (031) an account that has not confirmed its email gets only the mail that helps it do so, or that answers something
  -- it sent itself (an application, a contact message, its own password); nothing about projects until it confirms
  if p_template not in ('email_verify', 'application_received', 'application_declined', 'application_verified', 'contact_receipt', 'case_reply', 'password_changed')
     and p_template not like 'auth\_%'
     and exists (select 1 from public.profiles p where lower(p.email) = lower(p_to) and p.deleted_at is null and p.role <> 'admin' and not public.email_proven(p.id)) then
    insert into public.email_log (recipient, template, status, detail) values (p_to, p_template, 'skipped', 'email not confirmed yet');
    return;
  end if;
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

create or replace function public.send_whatsapp(p_mobile text, p_lang text, p_event text, p_params text[], p_path text) returns void
language plpgsql security definer set search_path = public as $$
declare
  token text; num text; recent int; choices jsonb; hold timestamptz;
begin
  select value into token from public.app_secrets where key = 'wa_token';
  if token is null or token = '' then return; end if;                    -- not switched on: silently nothing
  if not exists (select 1 from jsonb_array_elements(public.wa_template_specs()) s where s ->> 'event' = p_event) then
    insert into public.email_log (recipient, template, status, detail, channel) values (coalesce(p_mobile, '?'), p_event, 'skipped', 'no template for this event', 'whatsapp');
    return;
  end if;
  num := public.wa_number(p_mobile);
  if num is null then
    insert into public.email_log (recipient, template, status, detail, channel) values (coalesce(p_mobile, '?'), p_event, 'skipped', 'not a Saudi mobile number', 'whatsapp');
    return;
  end if;
  -- (029) with mobile verification on: a number nobody has verified gets nothing (the test is refused earlier, in whatsapp_test)
  if p_event <> 'wa_test' and coalesce((select enabled from public.platform_flags where key = 'otp_live'), false)
     and not exists (select 1 from public.profiles p where public.mobile_key(p.mobile) = num and p.mobile_verified_at is not null and p.deleted_at is null) then
    insert into public.email_log (recipient, template, status, detail, channel) values (num, p_event, 'skipped', 'number not verified', 'whatsapp');
    return;
  end if;
  -- (031) the account behind this number has not confirmed its email yet: no WhatsApp from Tarmem until it does (the test
  -- message the person presses for themselves still goes). A number with no account (an application, a contact form) is not held.
  if p_event <> 'wa_test'
     and exists (select 1 from public.profiles p where public.wa_number(p.mobile) = num and p.deleted_at is null)
     and not exists (select 1 from public.profiles p where public.wa_number(p.mobile) = num and p.deleted_at is null and (p.role = 'admin' or public.email_proven(p.id))) then
    insert into public.email_log (recipient, template, status, detail, channel) values (num, p_event, 'skipped', 'email not confirmed yet', 'whatsapp');
    return;
  end if;
  -- the person's own choices on the settings page; a test message goes whatever they are — they just pressed the button
  select p.prefs into choices from public.profiles p where public.wa_number(p.mobile) = num limit 1;
  if p_event <> 'wa_test' and choices ->> 'channel' = 'email' then
    insert into public.email_log (recipient, template, status, detail, channel) values (num, p_event, 'skipped', 'WhatsApp switched off in their settings', 'whatsapp');
    return;
  end if;
  select count(*) into recent from public.email_log where recipient = num and channel = 'whatsapp' and status = 'sent' and at > now() - interval '1 hour';
  if recent >= 20 then
    insert into public.email_log (recipient, template, status, detail, channel) values (num, p_event, 'throttled', '20 in the last hour', 'whatsapp');
    return;
  end if;
  perform public.wa_flush();
  hold := public.wa_quiet_until(public.wa_now());
  if hold is not null and p_event not in ('wa_test', 'stage_released', 'stage_disputed') and coalesce((choices ->> 'quiet')::boolean, true) then
    insert into public.wa_queue (mobile, lang, event, params, path, due_at) values (num, p_lang, p_event, coalesce(p_params, '{}'), p_path, hold);
    insert into public.email_log (recipient, template, status, detail, channel) values (num, p_event, 'queued', 'quiet hours: goes at ' || to_char(hold at time zone 'Asia/Riyadh', 'HH24:MI'), 'whatsapp');
    return;
  end if;
  perform public.wa_post(num, p_lang, p_event, p_params, p_path);
exception when others then
  insert into public.email_log (recipient, template, status, detail, channel) values (coalesce(num, p_mobile, '?'), p_event, 'failed', left(sqlerrm, 300), 'whatsapp');
end;
$$;

-- 5. the accounts that exist today -------------------------------------------------------------------------------------
-- a confirmed login email counts as confirmed: accounts made before this rule (Supabase confirmed them at sign-up) and
-- accounts that opened Supabase's own link while "Confirm email" was on
update public.profiles p
   set email_verified_at = coalesce(nullif(to_jsonb(u) ->> 'email_confirmed_at', '')::timestamptz, now()), email_verified_email = lower(u.email)
  from auth.users u
 where u.id = p.id and p.email_verified_at is null and p.deleted_at is null and u.email is not null
   and nullif(to_jsonb(u) ->> 'email_confirmed_at', '') is not null;
-- sign-ups from while "Confirm email" was on that never opened Supabase's link could not sign in at all; with it off they
-- can, and Tarmem's own mail asks them to confirm (nothing trusts the login record's flag any more)
do $do$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'auth' and table_name = 'users' and column_name = 'email_confirmed_at') then
    execute 'update auth.users set email_confirmed_at = now() where email_confirmed_at is null and email is not null';
  end if;
end $do$;

-- trigger functions: nobody calls them through the API
revoke execute on function public.profiles_email_proof() from public, anon, authenticated;
revoke execute on function public.profiles_send_verification() from public, anon, authenticated;
revoke execute on function public.gate_choose_bid() from public, anon, authenticated;
revoke execute on function public.gate_signatures() from public, anon, authenticated;
revoke execute on function public.gate_change_requests() from public, anon, authenticated;

select 'explore first, verify before dealing (031): ready' as result,
  (select string_agg(p.proname, ', ' order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')) as visitors_may_call,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) c where c like 'search_path=%')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')) as no_search_path,
  (select count(*) from public.profiles where deleted_at is null and email_verified_at is null) as accounts_to_confirm;
