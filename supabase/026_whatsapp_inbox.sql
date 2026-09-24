-- =======================================================================================
-- Tarmem — 026: WhatsApp replies reach the team, and our messages report back
--
-- Until now a customer who answered one of our WhatsApp updates wrote into the void: nothing received messages
-- sent to +966 53 450 7400 (Meta: "Your app is not subscribed to the message webhook"). Now Meta calls
-- https://www.tarmem.sa/api/wa-webhook (api/wa-webhook.ts, a small Vercel function), which hands every event
-- to wa_webhook() here. wa_webhook() first checks Meta's signature with the app secret, then:
--   · a customer's message is kept in wa_inbox, emailed to the team (alert_to), shown in the admin inbox, and
--     answered once a day with a short automatic reply saying it arrived;
--   · a delivery update of our own messages (delivered, read, failed and why) lands on its email_log row.
--
-- HOW TO RUN: Supabase → SQL Editor → paste → Run. Safe to run again. Then, once, the owner:
--   Meta for Developers → the Tarmem app → App settings → Basic → App secret → Show → copy, and run here
--       select public.set_wa_app_secret('PASTE-THE-APP-SECRET-HERE');
--   on its own line, in this editor only (never in a chat or a file). That saves it and asks Meta to send the
--   app's WhatsApp events to the address above, and the WhatsApp account's events to the app.
-- =======================================================================================

-- 1. where things are kept -------------------------------------------------------------------------
create table if not exists public.wa_inbox (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  wamid       text not null unique,                 -- Meta's id for the message: a retried event is kept once
  from_number text not null,                        -- as Meta writes it: 9665…
  name        text,                                 -- the name on their WhatsApp profile
  kind        text not null,                        -- text, image, audio, document, location, button, reaction…
  body        text,                                 -- the words: text, caption, button or choice, place
  profile_id  uuid references public.profiles (id) on delete set null,
  emailed_at  timestamptz,
  replied_at  timestamptz,
  raw         jsonb
);
create index if not exists wa_inbox_at_idx on public.wa_inbox (at desc);
create index if not exists wa_inbox_from_idx on public.wa_inbox (from_number, at desc);
create index if not exists wa_inbox_profile_id_fkey_idx on public.wa_inbox (profile_id);
alter table public.wa_inbox enable row level security;
drop policy if exists "admins read whatsapp messages" on public.wa_inbox;
create policy "admins read whatsapp messages" on public.wa_inbox for select to authenticated using ((select public.is_admin()));
revoke all on public.wa_inbox from anon, authenticated;
grant select on public.wa_inbox to authenticated;

create table if not exists public.wa_statuses (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  wamid   text not null,
  status  text not null,
  detail  text
);
create index if not exists wa_statuses_wamid_idx on public.wa_statuses (wamid);
alter table public.wa_statuses enable row level security;      -- no policy: only the functions below touch it
revoke all on public.wa_statuses from anon, authenticated;

alter table public.email_log add column if not exists wamid text;            -- Meta's id for a message we sent
alter table public.email_log add column if not exists delivery text;         -- sent, delivered, read or failed
alter table public.email_log add column if not exists delivery_detail text;  -- why it failed
alter table public.email_log add column if not exists delivery_at timestamptz;
create index if not exists email_log_wamid_idx on public.email_log (wamid) where wamid is not null;

-- 2. Meta's signature: HMAC-SHA256 with the app secret, from Postgres' own sha256 (no extension needed) ----
create or replace function public.hmac_sha256(p_key bytea, p_msg bytea) returns bytea
language plpgsql immutable strict set search_path = public as $$
declare k bytea := p_key; ipad bytea; opad bytea; i int;
begin
  if length(k) > 64 then k := sha256(k); end if;
  k := k || decode(repeat('00', 64 - length(k)), 'hex');
  ipad := k; opad := k;
  for i in 0 .. 63 loop
    ipad := set_byte(ipad, i, get_byte(k, i) # 54);   -- 0x36
    opad := set_byte(opad, i, get_byte(k, i) # 92);   -- 0x5c
  end loop;
  return sha256(opad || sha256(ipad || p_msg));
end $$;
revoke all on function public.hmac_sha256(bytea, bytea) from public, anon, authenticated;

-- 3. the owner's one step, and the two subscriptions it asks Meta for ------------------------------------
create or replace function public.wa_setup_webhook(p_app_id text default '1603887434608417', p_waba_id text default '2162520270999056') returns text
language plpgsql security definer set search_path = public as $$
declare token text; secret text; net_schema text; app_req bigint; waba_req bigint;
begin
  select value into token from public.app_secrets where key = 'wa_token';
  select value into secret from public.app_secrets where key = 'wa_app_secret';
  if coalesce(token, '') = '' then return 'WhatsApp is not switched on (set_whatsapp)'; end if;
  if coalesce(secret, '') = '' then return 'the app secret is not saved yet (set_wa_app_secret)'; end if;
  select nsp.nspname into net_schema from pg_proc p join pg_namespace nsp on nsp.oid = p.pronamespace where p.proname = 'http_post' limit 1;
  if net_schema is null then return 'pg_net is not installed'; end if;
  -- the app: WhatsApp events go to our address (Meta checks the address at once with the verify token)
  execute format('select %I.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 10000)', net_schema) into app_req
    using 'https://graph.facebook.com/v25.0/' || p_app_id || '/subscriptions',
          jsonb_build_object('Content-Type', 'application/json'),
          jsonb_build_object('object', 'whatsapp_business_account', 'callback_url', 'https://www.tarmem.sa/api/wa-webhook',
                             'verify_token', 'tarmem-whatsapp-webhook', 'fields', 'messages',
                             'access_token', p_app_id || '|' || secret);
  -- the WhatsApp account: its events go to the app
  execute format('select %I.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 10000)', net_schema) into waba_req
    using 'https://graph.facebook.com/v25.0/' || p_waba_id || '/subscribed_apps',
          jsonb_build_object('Authorization', 'Bearer ' || token, 'Content-Type', 'application/json'), '{}'::jsonb;
  return 'asked Meta for both subscriptions; its answers, a few seconds after this run: select id, status_code, content from net._http_response where id in (' || app_req || ', ' || waba_req || ');';
end $$;
revoke all on function public.wa_setup_webhook(text, text) from public, anon, authenticated;

create or replace function public.set_wa_app_secret(p_secret text) returns text
language plpgsql security definer set search_path = public as $$
declare s text := regexp_replace(coalesce(p_secret, ''), '\s', '', 'g');
begin
  if p_secret is null then
    delete from public.app_secrets where key = 'wa_app_secret';
    return 'the app secret is removed: WhatsApp events are no longer accepted';
  end if;
  if s !~ '^[0-9a-fA-F]{32}$' then
    raise exception 'That does not look like the app secret: Meta shows 32 letters and digits (0–9, a–f) under App settings → Basic → App secret. It had % characters.', length(s);
  end if;
  insert into public.app_secrets (key, value) values ('wa_app_secret', lower(s)) on conflict (key) do update set value = excluded.value;
  return 'the app secret is saved; ' || public.wa_setup_webhook();
end $$;
revoke all on function public.set_wa_app_secret(text) from public, anon, authenticated;

-- 4. sending a plain reply (only inside the 24 hours after the customer wrote) -----------------------------
create or replace function public.wa_send_text(p_num text, p_text text, p_template text) returns void
language plpgsql security definer set search_path = public as $$
declare token text; phone_id text; net_schema text; req_id bigint;
begin
  select value into token from public.app_secrets where key = 'wa_token';
  select value into phone_id from public.app_secrets where key = 'wa_phone_id';
  if coalesce(token, '') = '' or coalesce(phone_id, '') = '' then return; end if;
  select nsp.nspname into net_schema from pg_proc p join pg_namespace nsp on nsp.oid = p.pronamespace where p.proname = 'http_post' limit 1;
  if net_schema is null then return; end if;
  execute format('select %I.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 5000)', net_schema) into req_id
    using 'https://graph.facebook.com/v25.0/' || phone_id || '/messages',
          jsonb_build_object('Authorization', 'Bearer ' || token, 'Content-Type', 'application/json'),
          jsonb_build_object('messaging_product', 'whatsapp', 'recipient_type', 'individual', 'to', p_num, 'type', 'text',
                             'text', jsonb_build_object('preview_url', false, 'body', p_text));
  insert into public.email_log (recipient, template, status, channel, request_id) values (p_num, p_template, 'sent', 'whatsapp', req_id);
exception when others then
  insert into public.email_log (recipient, template, status, detail, channel) values (p_num, p_template, 'failed', left(sqlerrm, 300), 'whatsapp');
end $$;
revoke all on function public.wa_send_text(text, text, text) from public, anon, authenticated;

-- 5. delivery updates land on the row of the message they are about --------------------------------------
create or replace function public.wa_status_rank(p text) returns int
language sql immutable set search_path = public as $$
  select case p when 'sent' then 1 when 'delivered' then 2 when 'read' then 3 when 'failed' then 4 else 0 end
$$;

create or replace function public.wa_apply_statuses() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with latest as (
    select distinct on (s.wamid) s.wamid, s.status, s.detail, s.at
    from public.wa_statuses s
    where s.wamid in (select e.wamid from public.email_log e where e.wamid is not null and e.at > now() - interval '30 days')
    order by s.wamid, public.wa_status_rank(s.status) desc, s.at desc
  )
  update public.email_log e set delivery = l.status, delivery_detail = l.detail, delivery_at = l.at
  from latest l
  where e.wamid = l.wamid and public.wa_status_rank(l.status) > public.wa_status_rank(coalesce(e.delivery, ''));
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.wa_apply_statuses() from public, anon, authenticated;

-- 018's reconcile, now also keeping Meta's id for each accepted message, then applying waiting updates
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
      end,
      wamid = coalesce(e.wamid, case when e.channel = 'whatsapp' then a.body -> 'messages' -> 0 ->> 'id' end)
    from answered a where a.id = e.id
  $q$, net_schema);
  get diagnostics n = row_count;
  perform public.wa_apply_statuses();
  return n;
end;
$$;
revoke all on function public.wa_reconcile() from public, anon;
grant execute on function public.wa_reconcile() to authenticated;

-- 6. the webhook: Meta's events, checked and recorded ------------------------------------------------------
create or replace function public.wa_webhook(p_raw text, p_signature text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  secret text; payload jsonb; entry jsonb; change jsonb; v jsonb; m jsonb; s jsonb; phone_id text;
  msgs int := 0; stats int := 0; num text; nm text; kind text; body text; lang text; pretty text; team text; what text;
  who public.profiles; new_id bigint;
begin
  if p_raw is null or length(p_raw) > 262144 then return jsonb_build_object('ok', false, 'error', 'size'); end if;
  select value into secret from public.app_secrets where key = 'wa_app_secret';
  if coalesce(secret, '') = '' then return jsonb_build_object('ok', false, 'error', 'not configured'); end if;
  if lower(coalesce(p_signature, '')) <> 'sha256=' || encode(public.hmac_sha256(convert_to(secret, 'UTF8'), convert_to(p_raw, 'UTF8')), 'hex') then
    if not exists (select 1 from public.email_log where template = 'wa_webhook' and at > now() - interval '1 hour') then
      insert into public.email_log (recipient, template, status, detail, channel)
        values ('meta', 'wa_webhook', 'failed', 'a webhook call whose signature does not match the saved app secret', 'whatsapp');
    end if;
    return jsonb_build_object('ok', false, 'error', 'signature');
  end if;
  begin payload := p_raw::jsonb; exception when others then return jsonb_build_object('ok', false, 'error', 'json'); end;

  select value into phone_id from public.app_secrets where key = 'wa_phone_id';
  select nullif(btrim(split_part(value, ',', 1)), '') into team from public.app_secrets where key = 'alert_to';
  begin perform public.wa_reconcile(); exception when others then null; end;   -- our recent sends learn their Meta ids first

  for entry in select * from jsonb_array_elements(coalesce(payload -> 'entry', '[]'::jsonb)) loop
    for change in select * from jsonb_array_elements(coalesce(entry -> 'changes', '[]'::jsonb)) loop
      v := change -> 'value';
      if change ->> 'field' is distinct from 'messages' or v is null then continue; end if;
      if phone_id is not null and (v -> 'metadata' ->> 'phone_number_id') is distinct from phone_id then continue; end if;

      for s in select * from jsonb_array_elements(coalesce(v -> 'statuses', '[]'::jsonb)) loop
        if coalesce(s ->> 'id', '') = '' then continue; end if;
        insert into public.wa_statuses (wamid, status, detail, at)
        values (s ->> 'id', coalesce(s ->> 'status', '?'),
                case when s ->> 'status' = 'failed' then left(concat_ws(' — ', s -> 'errors' -> 0 ->> 'code', s -> 'errors' -> 0 ->> 'title',
                                                                         s -> 'errors' -> 0 -> 'error_data' ->> 'details'), 300) end,
                coalesce(to_timestamp(nullif(s ->> 'timestamp', '')::double precision), now()));
        stats := stats + 1;
      end loop;

      for m in select * from jsonb_array_elements(coalesce(v -> 'messages', '[]'::jsonb)) loop
        num := m ->> 'from';
        if coalesce(m ->> 'id', '') = '' or coalesce(num, '') !~ '^[0-9]{6,20}$' then continue; end if;
        kind := coalesce(m ->> 'type', 'unknown');
        nm := (select c -> 'profile' ->> 'name' from jsonb_array_elements(coalesce(v -> 'contacts', '[]'::jsonb)) c where c ->> 'wa_id' = num limit 1);
        body := left(coalesce(
          m -> 'text' ->> 'body',
          m -> 'button' ->> 'text',
          m -> 'interactive' -> 'button_reply' ->> 'title',
          m -> 'interactive' -> 'list_reply' ->> 'title',
          m -> kind ->> 'caption',
          case kind when 'location' then concat_ws(' · ', m -> 'location' ->> 'name', m -> 'location' ->> 'address',
                                                     (m -> 'location' ->> 'latitude') || ',' || (m -> 'location' ->> 'longitude'))
                    when 'reaction' then m -> 'reaction' ->> 'emoji' end), 2000);
        who := null;
        select * into who from public.profiles p where p.deleted_at is null and public.wa_number(p.mobile) = num limit 1;
        new_id := null;
        insert into public.wa_inbox (wamid, from_number, name, kind, body, profile_id, raw, at)
        values (m ->> 'id', num, left(nm, 120), kind, body, who.id, m, coalesce(to_timestamp(nullif(m ->> 'timestamp', '')::double precision), now()))
        on conflict (wamid) do nothing
        returning id into new_id;
        if new_id is null then continue; end if;          -- Meta sent it again: already handled
        msgs := msgs + 1;

        pretty := case when num ~ '^9665[0-9]{8}$' then '+966 ' || substr(num, 4, 2) || ' ' || substr(num, 6, 3) || ' ' || substr(num, 9) else '+' || num end;
        what := case kind when 'text' then null when 'image' then 'صورة' when 'video' then 'فيديو' when 'audio' then 'رسالة صوتية'
                          when 'document' then 'ملف' when 'sticker' then 'ملصق' when 'location' then 'موقع' when 'contacts' then 'جهة اتصال'
                          when 'reaction' then 'تفاعل على رسالة' when 'button' then 'زر في رسالتنا' when 'interactive' then 'اختيار'
                          else 'رسالة من نوع ' || kind end;
        if kind <> 'reaction' then
          perform public.send_email(coalesce(team, 'support@tarmem.sa'), 'ar',
            'رسالة واتساب من ' || coalesce(nullif(btrim(who.full_name), ''), nm, pretty),
            array_remove(array[
              'المرسل: ' || coalesce(nm, '—') || ' · ' || pretty,
              case when who.id is not null then 'حسابه في ترميم: ' || coalesce(who.full_name, '') || ' (' || coalesce(who.role, '') || ')' || coalesce(' · ' || who.email, '') end,
              case when what is not null then 'النوع: ' || what || ' (افتحها من واتساب على هاتف الفريق إن لزم)' end,
              case when coalesce(body, '') <> '' then '«' || body || '»' end,
              'للرد عليه: اتصل به، أو راسله من واتساب الأعمال، أو على بريده إن وُجد.'
            ], null),
            'https://www.tarmem.sa/inbox', 'افتح الوارد', 'wa_inbound');
          update public.wa_inbox set emailed_at = now() where id = new_id;
        end if;

        -- one short automatic reply a day per number, so the customer knows it arrived
        if kind not in ('reaction', 'system', 'unsupported')
           and coalesce((select enabled from public.platform_flags where key = 'whatsapp_live'), false)
           and not exists (select 1 from public.wa_inbox i where i.from_number = num and i.replied_at > now() - interval '24 hours') then
          lang := coalesce(who.lang, case when coalesce(body, '') ~ '[A-Za-z]' and coalesce(body, '') !~ '[ء-ي]' then 'en' else 'ar' end);
          perform public.wa_send_text(num, case when lang = 'en'
            then 'Thank you, your message reached the Tarmem team and we will get back to you soon. This number sends your project updates; for a faster answer: https://www.tarmem.sa/contact'
            else 'شكرًا لرسالتك، وصلت إلى فريق ترميم وسنتواصل معك قريبًا. هذا الرقم مخصص لتحديثات مشاريعك، وللتواصل الأسرع: https://www.tarmem.sa/contact' end,
            'wa_autoreply');
          update public.wa_inbox set replied_at = now() where id = new_id;
        end if;
      end loop;
    end loop;
  end loop;

  perform public.wa_apply_statuses();
  return jsonb_build_object('ok', true, 'messages', msgs, 'statuses', stats);
end $$;
revoke all on function public.wa_webhook(text, text) from public, authenticated;
grant execute on function public.wa_webhook(text, text) to anon;   -- the Vercel function calls it with the publishable key; the signature is the lock

-- 7. erasing an account erases its WhatsApp messages too (022) ---------------------------------------------
create or replace function public.wa_inbox_forget() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    delete from public.wa_inbox where profile_id = new.id or (public.wa_number(old.mobile) is not null and from_number = public.wa_number(old.mobile));
  end if;
  return new;
end $$;
revoke all on function public.wa_inbox_forget() from public, anon, authenticated;
drop trigger if exists wa_inbox_forget on public.profiles;
create trigger wa_inbox_forget after update of deleted_at on public.profiles for each row execute function public.wa_inbox_forget();

-- if the owner saved the app secret before a rerun, ask Meta again for the subscriptions
do $$
begin
  if exists (select 1 from public.app_secrets where key = 'wa_app_secret' and value <> '') then
    raise notice '%', public.wa_setup_webhook();
  end if;
end $$;

select 'WhatsApp replies to the team: ready. Next, once: select public.set_wa_app_secret(''the app secret from Meta'');' as result,
  exists (select 1 from public.app_secrets where key = 'wa_app_secret' and value <> '') as app_secret_saved;
