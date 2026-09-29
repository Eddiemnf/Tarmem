-- =======================================================================================
-- Tarmem — 029: launch hardening, the security review's twelve findings
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run. Safe to run again. Needs 001–028.
-- Safe to run again after 030 too: 030 has its own, newer "who is told what" (notify_people), and this file then
-- leaves it as it is (it checks for 030's marker first). Nothing else here is redefined by 030.
-- The last line lists what a visitor who is not signed in may still call; it should be exactly
-- is_admin, mobile_taken and wa_webhook.
--
--  1. Mobile codes. Changing the mobile number clears its verification. A code counts only for the number
--     it was sent to (the account's current one). Codes come from a cryptographic random source
--     (pgcrypto's gen_random_bytes) and are kept as a SHA-256 hash, not md5.
--     Once mobile verification is switched on (platform_flags otp_live), WhatsApp updates go only to a number
--     that an account has verified with a code; anything else is logged 'skipped' ('number not verified'), and
--     the settings page's WhatsApp test asks for the code first. With otp_live off (today), WhatsApp is sent as
--     before: nobody can verify a number yet.
--  2. No words typed by a customer are sent back to that customer's own email or number, which may not
--     be theirs: the "project posted" email and WhatsApp name the trade and the project number instead
--     of the title (the WhatsApp template's wording is Meta's approved text and does not change, only
--     the value in {{2}}); the contact-form receipt no longer repeats the sender's name; greetings in the
--     sign-in, password and reply emails no longer carry the name; emails to a homeowner about their own
--     project name it by number and trade; the "change approved" email no longer repeats its description.
--     Receipts to an address a visitor typed (the contact form's, and 030's "application received"): at most
--     one a day per address, whichever form, and at most 40 an hour in all; the rest are logged 'skipped'.
--  3. The WhatsApp test: at most three a day per account (an admin ten), on top of three per number, so
--     changing the number does not buy more.
--  4. Erasure deletes rows matched only by EMAIL (contact messages, applications made without an
--     account) only when they were sent after the account existed and the account PROVED its address:
--     it confirmed it from the link Supabase emailed (email_proven: email_confirmed_at is at or after
--     confirmation_sent_at). An account made while "Confirm email" was off is marked confirmed at sign-up with
--     no email ever sent, which proves nothing. The console's count of a person's messages follows the same
--     rule. Rows linked to the account itself go as before, EXCEPT the record of a project that was awarded
--     (it has a contractor): its messages and its files stay, because the other party and the Rules page's
--     dispute path (settle → Tarmem's mediation → the competent authority) rely on them. Only files the erased
--     person uploaded are deleted; a contractor's stage evidence in a homeowner's folder never is.
--  5. Messages inside a project: the website may write only the project, the thread's contractor and the
--     words. The time, the sender and "read" come from the database.
--  6. A homeowner can move the choice between bids only while the project is open for bids.
--  7. An index for the delivery log's per-template look-ups.
--  8. At most 30 team alert emails an hour from what anyone can trigger (the forms, new projects, withdrawals);
--     beyond that they are skipped, and one row per hour counts them. Alerts the team must never miss go out
--     whatever the count, and do not use it up: send_alert(subject, lines, true) — the daily summary, signed
--     agreements and awards, change requests and completions (030).
--  9. The public forms also count per network address: ten an hour from one address, per form; the
--     overall ceiling rises from 40 to 120 in ten minutes so one sender cannot close the forms for all.
--     The address itself is never stored: a salted hash of it, kept one hour. Which address: see
--     form_client_key() — Cloudflare's cf-connecting-ip, else the last x-forwarded-for entry (the one the proxy
--     appended); never the first entry or x-real-ip, which the visitor can write.
-- 10. The visit log keeps at most 200 rows per visit code an hour, and at most 600 an hour from one network
--     address (the visit code is chosen by the browser); more are dropped without an error.
-- 11. Project files: at most 40 files per person in a project's folder. People can delete files they
--     uploaded under their own id, except in a project that was awarded (its files are the record of the
--     work); contractors keep deleting their own portfolio photos.
-- 12. Visitors who are not signed in can no longer call the database's internal helpers; they keep
--     is_admin, mobile_taken and wa_webhook, which the website's public pages and Meta's webhook use.
-- =======================================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
do $$
begin
  if to_regprocedure('extensions.gen_random_bytes(integer)') is null or to_regprocedure('extensions.digest(text, text)') is null then
    raise exception 'pgcrypto must live in the "extensions" schema (Database → Extensions → pgcrypto). Nothing was changed.';
  end if;
end $$;

-- ---------------------------------------------------------------------------------------
-- 1. Mobile codes
-- ---------------------------------------------------------------------------------------
-- a new number is an unverified number (the same number written another way stays verified)
create or replace function public.profiles_mobile_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.mobile_key(new.mobile) is distinct from public.mobile_key(old.mobile) then
    new.mobile_verified_at := null;
  end if;
  return new;
end $$;
drop trigger if exists profiles_mobile_changed on public.profiles;
create trigger profiles_mobile_changed before update of mobile on public.profiles
  for each row execute function public.profiles_mobile_changed();

-- the stored form of a code: bound to the account and to the number it was sent to
create or replace function public.otp_hash(p_user uuid, p_key text, p_code text) returns text
language sql immutable set search_path = public as $$
  select encode(extensions.digest(p_user::text || ':' || coalesce(p_key, '') || ':' || coalesce(p_code, ''), 'sha256'), 'hex')
$$;

-- codes stored as md5 before this file can no longer be checked: they simply expire
update public.mobile_codes set expires_at = least(expires_at, now()) where used_at is null and length(code_hash) = 32;

create or replace function public.otp_request() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); me record; num text; recent int; code text; b bytea; r bigint;
begin
  if uid is null then raise exception 'sign in first'; end if;
  if not exists (select 1 from public.platform_flags where key = 'otp_live' and enabled) then raise exception 'otp_off: mobile verification is not switched on'; end if;
  select mobile, lang into me from public.profiles where id = uid;
  if not found then raise exception 'no profile yet'; end if;
  num := public.wa_number(me.mobile);
  if num is null then raise exception 'not a Saudi mobile number'; end if;
  select count(*) into recent from public.mobile_codes where user_id = uid and created_at > now() - interval '1 hour';
  if recent >= 3 then raise exception 'too many codes: wait an hour' using errcode = 'P0001'; end if;
  -- six digits from a cryptographic source; draws above the last whole million are redrawn, so every code is equally likely
  loop
    b := extensions.gen_random_bytes(4);
    r := get_byte(b, 0)::bigint * 16777216 + get_byte(b, 1) * 65536 + get_byte(b, 2) * 256 + get_byte(b, 3);
    exit when r < 4294000000;
  end loop;
  code := lpad((r % 1000000)::text, 6, '0');
  insert into public.mobile_codes (user_id, mobile_key, code_hash, expires_at)
    values (uid, public.mobile_key(me.mobile), public.otp_hash(uid, public.mobile_key(me.mobile), code), now() + interval '10 minutes');
  perform public.wa_post_otp(num, me.lang, code);
  return jsonb_build_object('sent', true, 'to', num);
end $$;
revoke all on function public.otp_request() from public, anon;
grant execute on function public.otp_request() to authenticated;

create or replace function public.otp_check(p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); c record; cur text;
begin
  if uid is null then raise exception 'sign in first'; end if;
  select public.mobile_key(mobile) into cur from public.profiles where id = uid;
  -- a code sent to a number the account no longer has proves nothing: it is void
  update public.mobile_codes set expires_at = least(expires_at, now())
   where user_id = uid and used_at is null and mobile_key is distinct from cur and expires_at > now();
  select * into c from public.mobile_codes where user_id = uid and used_at is null order by id desc limit 1;
  if not found or cur is null or c.mobile_key is distinct from cur or c.expires_at < now() or c.attempts >= 5 then return false; end if;
  if c.code_hash = public.otp_hash(uid, c.mobile_key, regexp_replace(coalesce(p_code, ''), '[^0-9]', '', 'g')) then
    update public.mobile_codes set used_at = now() where id = c.id;
    update public.profiles set mobile_verified_at = now() where id = uid and public.mobile_key(mobile) = c.mobile_key;
    return true;
  end if;
  update public.mobile_codes set attempts = attempts + 1 where id = c.id;
  return false;
end $$;
revoke all on function public.otp_check(text) from public, anon;
grant execute on function public.otp_check(text) to authenticated;

-- WhatsApp updates (014), with one rule added: once mobile verification is switched on, only to a number some
-- account has verified. Anyone can type a stranger's number into their profile; without this, posting and
-- withdrawing projects would make Tarmem's number message that stranger. While otp_live is off nobody can verify
-- a number, so nothing changes until the owner switches it on. (The code itself goes by wa_post_otp, not here.)
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
revoke all on function public.send_whatsapp(text, text, text, text[], text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------
-- 2. No customer-typed words in messages to their own contact
-- ---------------------------------------------------------------------------------------
-- the trade, in fixed words (the site's own list, tarmem-i18n.js TRADES); anything else is "a renovation project"
create or replace function public.trade_label(p_trade text, p_lang text) returns text
language sql immutable set search_path = public as $$
  select coalesce(
    (select case when p_lang = 'en' then t.en else t.ar end
       from (values
         ('full', 'Full renovation', 'ترميم وتجديد شامل'), ('interior', 'Interior design', 'تصميم داخلي'),
         ('architectural', 'Architectural & exterior design', 'تصميم معماري وواجهات خارجية'), ('inspection', 'Engineering inspection & supervision', 'فحص وإشراف هندسي'),
         ('pm', 'Renovation project management', 'إدارة مشاريع الترميم'), ('demolition', 'Demolition & removal', 'هدم وإزالة'),
         ('structural', 'Structural repair & strengthening', 'ترميم وتدعيم إنشائي'), ('extensions', 'Construction & extensions', 'بناء الملاحق والتوسعات'),
         ('plaster', 'Plastering & wall treatment', 'لياسة ومعالجة جدران'), ('kitchen', 'Kitchens', 'تصميم وترميم المطابخ'),
         ('bathroom', 'Bathrooms', 'حمامات'), ('flooring', 'Flooring & tiling', 'أرضيات وبلاط'),
         ('stone', 'Marble, granite & stone', 'رخام وجرانيت وأحجار'), ('painting', 'Painting', 'دهانات'),
         ('wallcover', 'Decorative wall cladding', 'ديكورات وتكسية جدران'), ('gypsum', 'Gypsum & ceilings', 'جبس وأسقف'),
         ('carpentry', 'Carpentry & fitted furniture', 'أعمال النجارة والأثاث الثابت'), ('doors', 'Doors & windows', 'أبواب ونوافذ'),
         ('aluminium', 'Aluminium & glass', 'ألمنيوم وزجاج'), ('metalwork', 'Metalwork', 'حدادة ومعادن'),
         ('electrical', 'Electrical', 'كهرباء'), ('lighting', 'Lighting', 'إنارة'),
         ('plumbing', 'Plumbing & drainage', 'سباكة وصرف صحي'), ('watersys', 'Tanks, pumps & water treatment', 'خزانات ومضخات وتنقية مياه'),
         ('hvac', 'Air conditioning & ventilation', 'تكييف وتهوية'), ('gasheat', 'Gas & heating', 'غاز وتدفئة'),
         ('insulation', 'Insulation & damp treatment', 'عزل ومعالجة رطوبة'), ('roofing', 'Roofing & rainwater drainage', 'أسطح وتصريف أمطار'),
         ('facades', 'Facades & balconies', 'واجهات وبلكونات'), ('entrances', 'Entrances & staircases', 'مداخل وسلالم'),
         ('landscape', 'Gardens & yards', 'تنسيق الحدائق والأحواش'), ('shades', 'Shades & privacy screens', 'مظلات وسواتر'),
         ('paving', 'Parking & external paving', 'مواقف ورصف خارجي'), ('pools', 'Pools & fountains', 'مسابح ونوافير'),
         ('smarthome', 'Smart home', 'منزل ذكي'), ('security', 'Cameras & security systems', 'كاميرات وأنظمة أمن'),
         ('networks', 'Networks & communications', 'شبكات واتصالات'), ('av', 'Audio & home cinema', 'صوتيات وسينما منزلية'),
         ('energy', 'Energy & efficiency', 'طاقة وكفاءة استهلاك'), ('accessibility', 'Elderly & accessibility adaptation', 'تهيئة لكبار السن وذوي الإعاقة'),
         ('furnishings', 'Curtains & furnishings', 'ستائر ومفروشات'), ('postclean', 'Post-renovation cleaning', 'تنظيف بعد الترميم'),
         ('maintenance', 'General maintenance & minor repairs', 'صيانة عامة وإصلاحات بسيطة')
       ) as t(id, en, ar)
      where t.id = p_trade),
    case when p_lang = 'en' then 'Renovation project' else 'مشروع ترميم' end)
$$;

-- A receipt to an address typed on a public form (the contact form here, the contractor application in 030): the
-- address may be anyone's, so at most one receipt a day per address — whichever form — and at most 40 an hour in
-- all, so the forms cannot be used to mail strangers in bulk. A receipt held back is logged 'skipped' (once a day
-- per address, since the log row itself counts as that day's receipt).
create or replace function public.receipt_allowed(p_to text, p_template text) returns boolean
language plpgsql security definer set search_path = public as $$
declare addr text := lower(btrim(coalesce(p_to, ''))); recent int;
begin
  if addr = '' then return false; end if;
  if exists (select 1 from public.email_log where template in ('contact_receipt', 'application_received')
               and lower(recipient) = addr and at > now() - interval '1 day') then
    return false;
  end if;
  select count(*) into recent from public.email_log
   where template in ('contact_receipt', 'application_received') and status <> 'skipped' and at > now() - interval '1 hour';
  if recent >= 40 then
    insert into public.email_log (recipient, template, status, detail) values (btrim(p_to), p_template, 'skipped', 'receipts: 40 in the last hour');
    return false;
  end if;
  return true;
end $$;
revoke all on function public.receipt_allowed(text, text) from public, anon, authenticated;

-- who is told what (019), with the owner's own project named by number and trade, and no name on the receipt.
-- 030 replaces this function with a newer one (marked "(030)"); running this file again after 030 keeps 030's.
do $guard$
begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'notify_people' and p.prosrc like '%(030)%') then
    raise notice '030 is applied: its notify_people() is newer and stays as it is.';
    return;
  end if;
  execute $fn$
create or replace function public.notify_people() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  site constant text := 'https://www.tarmem.sa';
  who record; pr record; firm text; money text; n int; snippet text; label text;
begin
  if tg_table_name = 'projects' then
    if tg_op = 'INSERT' and new.title not like 'RLS TEST%' then
      select email, mobile, lang into who from public.profiles where id = new.owner_id;
      label := public.trade_label(new.trade, case when who.lang = 'en' then 'en' else 'ar' end);
      if who.lang = 'en' then
        perform public.tell(who.email, who.mobile, 'en', 'Your project ' || new.code || ' is posted: ' || label,
          array['Verified contractors can see it now. You will get a message with each new bid, and the Tarmem team is following it too.'], 'project/' || new.code, 'Open the project', 'project_posted', array[new.code, label]);
      else
        perform public.tell(who.email, who.mobile, 'ar', 'نُشر مشروعك ' || new.code || ': ' || label,
          array['مشروعك الآن أمام المقاولين الموثّقين. تصلك رسالة مع كل عرض جديد، وفريق ترميم يتابعه معك.'], 'project/' || new.code, 'افتح المشروع', 'project_posted', array[new.code, label]);
      end if;
    end if;

  elsif tg_table_name = 'bids' then
    if tg_op = 'INSERT' then
      select p.code, p.title, p.trade, p.owner_id into pr from public.projects p where p.id = new.project_id;
      select email, mobile, lang, prefs into who from public.profiles where id = pr.owner_id;
      if coalesce((who.prefs ->> 'pBids')::boolean, true) then
        select company into firm from public.contractor_applications where user_id = new.contractor_id and status = 'verified' limit 1;
        money := to_char(new.price, 'FM999,999,999');
        select count(*) into n from public.bids b where b.project_id = new.project_id and b.status <> 'withdrawn';   -- this bid's number on the project
        label := public.trade_label(pr.trade, case when who.lang = 'en' then 'en' else 'ar' end);
        if who.lang = 'en' then
          perform public.tell(who.email, who.mobile, 'en', 'New bid on your project ' || pr.code,
            array[coalesce(firm, 'A verified contractor') || ' bid SAR ' || money || ' on your project ' || pr.code || ' (' || label || '), ' || new.days || ' days.', 'Compare the bids side by side, and accept one when you are ready.'], 'project/' || pr.code, 'Compare the bids', 'new_bid',
            array[pr.code, greatest(n, 1)::text, coalesce(firm, 'A verified contractor'), money, new.days::text]);
        else
          perform public.tell(who.email, who.mobile, 'ar', 'عرض جديد على مشروعك ' || pr.code,
            array[coalesce(firm, 'مقاول موثّق') || ' قدّم عرضًا بقيمة ' || money || ' ريال على مشروعك ' || pr.code || ' (' || label || ') خلال ' || new.days || ' يوم.', 'قارن العروض جنبًا إلى جنب، واقبل ما يناسبك حين تكون جاهزًا.'], 'project/' || pr.code, 'قارن العروض', 'new_bid',
            array[pr.code, greatest(n, 1)::text, coalesce(firm, 'مقاول موثّق'), money, new.days::text]);
        end if;
      end if;
    end if;

  elsif tg_table_name = 'agreements' then
    select p.code, p.title, p.trade into pr from public.projects p where p.id = new.project_id;
    money := to_char(new.amount, 'FM999,999,999');
    if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.contractor_signed_at is null and old.bid_id <> new.bid_id) then
      -- to the contractor: the title is the homeowner's words, which is what the contractor bid on
      select email, mobile, lang into who from public.profiles where id = new.contractor_id;
      if who.lang = 'en' then
        perform public.tell(who.email, who.mobile, 'en', 'Your bid was accepted — ' || pr.code,
          array['The homeowner accepted your bid of SAR ' || money || ' on “' || pr.title || '”.', 'Review the agreement and sign it; the project is awarded to you the moment you do.'], 'project/' || pr.code, 'Review and sign the agreement', 'agreement_accepted', array[pr.code, money]);
      else
        perform public.tell(who.email, who.mobile, 'ar', 'اختار صاحب المنزل عرضك — ' || pr.code,
          array['قُبل عرضك بقيمة ' || money || ' ريال على «' || pr.title || '».', 'راجع الاتفاقية ووقّعها؛ يُسند المشروع إليك فور توقيعك.'], 'project/' || pr.code, 'راجع الاتفاقية ووقّع', 'agreement_accepted', array[pr.code, money]);
      end if;
    elsif tg_op = 'UPDATE' and new.contractor_signed_at is not null and old.contractor_signed_at is null then
      select email, mobile, lang into who from public.profiles where id = new.homeowner_id;
      label := public.trade_label(pr.trade, case when who.lang = 'en' then 'en' else 'ar' end);
      if who.lang = 'en' then
        perform public.tell(who.email, who.mobile, 'en', 'The contractor signed — ' || pr.code || ' is awarded',
          array['Your project ' || pr.code || ' (' || label || ') is awarded to ' || coalesce(new.contractor_name, 'the contractor') || ' for SAR ' || money || '.', 'The Tarmem team will contact you both to arrange the first payment and the start date.'], 'project/' || pr.code, 'Open the project', 'agreement_signed',
          array[pr.code, coalesce(new.contractor_name, 'the contractor'), money]);
      else
        perform public.tell(who.email, who.mobile, 'ar', 'وقّع المقاول الاتفاقية — أُسند ' || pr.code,
          array['أُسند مشروعك ' || pr.code || ' (' || label || ') إلى ' || coalesce(new.contractor_name, 'المقاول') || ' بمبلغ ' || money || ' ريال.', 'يتواصل معكما فريق ترميم لترتيب الدفعة الأولى وموعد البدء.'], 'project/' || pr.code, 'افتح المشروع', 'agreement_signed',
          array[pr.code, coalesce(new.contractor_name, 'المقاول'), money]);
      end if;
    end if;

  elsif tg_table_name = 'contractor_applications' then
    -- the company's name is sent only after a person on the team has checked and verified it
    if tg_op = 'UPDATE' and new.status = 'verified' and old.status is distinct from 'verified' and new.company <> 'RLS TEST' then
      select email, mobile, lang into who from public.profiles where id = new.user_id;
      if who.email is null then who := (select r from (select new.email as email, new.mobile as mobile, new.lang as lang) r); end if;
      if who.lang = 'en' then
        perform public.tell(who.email, who.mobile, 'en', 'Your Tarmem account is verified',
          array['“' || new.company || '” is verified and ready to use.', case when new.user_id is null then 'Create your account on the contractor page with this email to start.' else 'Sign in to browse open projects and send your bids.' end],
          case when new.user_id is null then 'join' else 'signin' end, case when new.user_id is null then 'Create your account' else 'Sign in' end, 'application_verified', array[new.company]);
      else
        perform public.tell(who.email, who.mobile, 'ar', 'تم توثيق حسابك في ترميم',
          array['حساب «' || new.company || '» موثّق وجاهز للاستخدام.', case when new.user_id is null then 'أنشئ حسابك من صفحة انضمام المقاولين بهذا البريد لتبدأ.' else 'سجّل دخولك لتصفّح المشاريع المفتوحة وتقديم عروضك.' end],
          case when new.user_id is null then 'join' else 'signin' end, case when new.user_id is null then 'أنشئ حسابك' else 'سجّل دخولك' end, 'application_verified', array[new.company]);
      end if;
    end if;

  elsif tg_table_name = 'project_messages' then
    -- a message inside a project tells the OTHER party, with a snippet; the homeowner is named by first name only
    if tg_op = 'INSERT' then
      select p.code, p.title, p.owner_id into pr from public.projects p where p.id = new.project_id;
      if new.from_id = pr.owner_id then
        select email, mobile, lang, prefs into who from public.profiles where id = new.contractor_id;
        select split_part(trim(full_name), ' ', 1) into firm from public.profiles where id = pr.owner_id;
      else
        select email, mobile, lang, prefs into who from public.profiles where id = pr.owner_id;
        select company into firm from public.contractor_applications where user_id = new.from_id and status = 'verified' limit 1;
      end if;
      if coalesce((who.prefs ->> 'pMsg')::boolean, true) then
        snippet := left(trim(regexp_replace(new.body, '\s+', ' ', 'g')), 120);
        if who.lang = 'en' then
          perform public.tell(who.email, who.mobile, 'en', 'A message about project ' || pr.code || ' from ' || coalesce(firm, 'the other party'),
            array['“' || snippet || '”', 'Reply from the project page; the conversation stays there.'], 'project/' || pr.code, 'Open the project', 'new_message', array[pr.code, coalesce(firm, 'the other party'), snippet]);
        else
          perform public.tell(who.email, who.mobile, 'ar', 'رسالة بخصوص المشروع ' || pr.code || ' من ' || coalesce(firm, 'الطرف الآخر'),
            array['«' || snippet || '»', 'الرد من صفحة المشروع، وتبقى المحادثة محفوظة هناك.'], 'project/' || pr.code, 'افتح المشروع', 'new_message', array[pr.code, coalesce(firm, 'الطرف الآخر'), snippet]);
        end if;
      end if;
    end if;

  elsif tg_table_name = 'contact_messages' then
    -- a receipt by email only, in fixed words: the address was typed by the sender and may not be theirs
    if tg_op = 'INSERT' and new.email is not null and new.name <> 'RLS TEST' and public.receipt_allowed(new.email, 'contact_receipt') then
      if new.lang = 'en' then
        perform public.send_email(new.email, 'en', 'We received your message', array['Thank you. Your message reached the Tarmem team, and we reply within one working day.'], site, 'Visit Tarmem', 'contact_receipt');
      else
        perform public.send_email(new.email, 'ar', 'وصلتنا رسالتك', array['شكرًا لك. وصلت رسالتك إلى فريق ترميم، ونرد عليك خلال يوم عمل.'], site, 'زيارة ترميم', 'contact_receipt');
      end if;
    end if;

  elsif tg_table_name = 'stages' then
    if tg_op = 'UPDATE' and new.status <> old.status then
      select p.code, p.title, p.trade, p.owner_id, p.contractor_id into pr from public.projects p where p.id = new.project_id;
      n := new.idx + 1;
      if new.status = 'submitted' then
        select email, mobile, lang, prefs into who from public.profiles where id = pr.owner_id;
        label := public.trade_label(pr.trade, case when who.lang = 'en' then 'en' else 'ar' end);
        if coalesce((who.prefs ->> 'pStages')::boolean, true) then
          if who.lang = 'en' then
            perform public.tell(who.email, who.mobile, 'en', 'Stage ' || n || ' is ready for your approval — ' || pr.code,
              array['The contractor submitted stage ' || n || ' of your project ' || pr.code || ' (' || label || ') with photos and a video.', 'Look at the work, add your own photo of it, and approve — or raise an issue.'], 'project/' || pr.code, 'Review stage ' || n, 'stage_submitted', array[n::text, pr.code]);
          else
            perform public.tell(who.email, who.mobile, 'ar', 'المرحلة ' || n || ' بانتظار اعتمادك — ' || pr.code,
              array['قدّم المقاول المرحلة ' || n || ' من مشروعك ' || pr.code || ' (' || label || ') مع الصور والفيديو.', 'اطّلع على العمل، وأضف صورتك له، واعتمد المرحلة — أو سجّل ملاحظة.'], 'project/' || pr.code, 'راجع المرحلة ' || n, 'stage_submitted', array[n::text, pr.code]);
          end if;
        end if;
      elsif new.status in ('released', 'disputed') then
        -- to the contractor: the title and the reason are the homeowner's words about the contractor's work
        select email, mobile, lang, prefs into who from public.profiles where id = pr.contractor_id;
        if coalesce((who.prefs ->> 'pStages')::boolean, true) then
          if who.lang = 'en' then
            perform public.tell(who.email, who.mobile, 'en', case when new.status = 'released' then 'Stage ' || n || ' approved — ' || pr.code else 'An issue was raised on stage ' || n || ' — ' || pr.code end,
              array[case when new.status = 'released' then 'The homeowner approved stage ' || n || ' of “' || pr.title || '”; its payment is released.' else 'The homeowner raised an issue on stage ' || n || ' of “' || pr.title || '”: ' || coalesce(new.reason, '') end],
              'project/' || pr.code, 'Open the project', 'stage_' || new.status,
              case when new.status = 'released' then array[n::text, pr.code] else array[n::text, pr.code, coalesce(nullif(trim(new.reason), ''), 'see the project page')] end);
          else
            perform public.tell(who.email, who.mobile, 'ar', case when new.status = 'released' then 'اعتُمدت المرحلة ' || n || ' — ' || pr.code else 'ملاحظة على المرحلة ' || n || ' — ' || pr.code end,
              array[case when new.status = 'released' then 'اعتمد صاحب المنزل المرحلة ' || n || ' من «' || pr.title || '»، وصُرفت دفعتها.' else 'سجّل صاحب المنزل ملاحظة على المرحلة ' || n || ' من «' || pr.title || '»: ' || coalesce(new.reason, '') end],
              'project/' || pr.code, 'افتح المشروع', 'stage_' || new.status,
              case when new.status = 'released' then array[n::text, pr.code] else array[n::text, pr.code, coalesce(nullif(trim(new.reason), ''), 'انظر صفحة المشروع')] end);
          end if;
        end if;
      end if;
    end if;
  end if;
  return new;
exception when others then
  insert into public.email_log (recipient, template, status, detail) values ('?', tg_table_name || ' ' || tg_op, 'failed', left(sqlerrm, 300));
  return new;
end;
$$
$fn$;
end $guard$;

-- "your password was changed" (022): the same notice, without the name typed at sign-up
create or replace function public.notify_password_changed() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  lang text; site text;
begin
  if old.encrypted_password is null or new.encrypted_password is not distinct from old.encrypted_password then return new; end if;
  if new.email is null or new.email like '%@deleted.tarmem.sa' or new.encrypted_password is null then return new; end if;
  select p.lang into lang from public.profiles p where p.id = new.id;
  lang := coalesce(lang, 'ar');
  site := coalesce((select value from public.app_secrets where key = 'site_url'), 'https://www.tarmem.sa');
  if lang = 'en' then
    perform public.send_email(new.email, 'en', 'Your Tarmem password was changed',
      array['Hello,',
            'The password of your Tarmem account was changed just now.',
            'If that was you, there is nothing to do.',
            'If it was not you, reset your password right away from the sign-in page and write to support@tarmem.sa.'],
      site || '/signin', 'Open the sign-in page', 'password_changed');
  else
    perform public.send_email(new.email, 'ar', 'تم تغيير كلمة مرور حسابك في ترميم',
      array['مرحبًا،',
            'تم تغيير كلمة مرور حسابك في ترميم قبل قليل.',
            'إذا كنت أنت من غيّرها فلا يلزمك شيء.',
            'وإن لم تكن أنت، فأعد تعيين كلمة المرور فورًا من صفحة تسجيل الدخول وراسلنا على support@tarmem.sa.'],
      site || '/signin', 'فتح صفحة تسجيل الدخول', 'password_changed');
  end if;
  return new;
exception when others then
  return new;
end $$;

-- Supabase's sign-in emails (024): the same emails, greeting without the name (the sign-up form's name
-- field would otherwise put a stranger's words in an email to an address they typed)
create or replace function public.auth_send_email(event jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  u jsonb := coalesce(event -> 'user', '{}'::jsonb);
  d jsonb := coalesce(event -> 'email_data', '{}'::jsonb);
  kind text := coalesce(d ->> 'email_action_type', '');
  to_addr text := u ->> 'email';
  lang text; api text; back text; link text; code text;
  subj text; lines text[]; cta text; hello text;
begin
  if kind like '%\_notification' then return '{}'::jsonb; end if;   -- 021 sends the one that matters

  begin
    select p.lang into lang from public.profiles p where p.id = (u ->> 'id')::uuid;
  exception when others then lang := null;
  end;
  lang := coalesce(lang, u -> 'user_metadata' ->> 'lang', 'ar');
  if lang not in ('ar', 'en') then lang := 'ar'; end if;

  api := coalesce((select value from public.app_secrets where key = 'supabase_url'), 'https://rdqlnsqdmaosghpxexup.supabase.co');
  back := coalesce(nullif(d ->> 'redirect_to', ''), nullif(d ->> 'site_url', ''), 'https://www.tarmem.sa');
  link := api || '/auth/v1/verify?token=' || public.url_encode(d ->> 'token_hash')
       || '&type=' || public.url_encode(kind) || '&redirect_to=' || public.url_encode(back);
  code := d ->> 'token';
  hello := case when lang = 'en' then 'Hello,' else 'مرحبًا،' end;

  if kind = 'recovery' then
    if lang = 'en' then
      subj := 'Reset your Tarmem password';
      lines := array[hello, 'You asked to reset the password of your Tarmem account. Press the button to choose a new one.',
                     'The link works once, for one hour.', 'If you did not ask for this, ignore this email: nothing changes.'];
      cta := 'Choose a new password';
    else
      subj := 'إعادة تعيين كلمة المرور في ترميم';
      lines := array[hello, 'طلبت إعادة تعيين كلمة مرور حسابك في ترميم. اضغط الزر لاختيار كلمة مرور جديدة.',
                     'الرابط يعمل مرة واحدة، ولمدة ساعة.', 'إذا لم تطلب ذلك فتجاهل هذه الرسالة، ولن يتغير شيء.'];
      cta := 'اختر كلمة مرور جديدة';
    end if;
  elsif kind = 'signup' then
    if lang = 'en' then
      subj := 'Confirm your email for Tarmem';
      lines := array[hello, 'Welcome to Tarmem. Press the button to confirm your email address and open your account.'];
      cta := 'Confirm my email';
    else
      subj := 'أكّد بريدك الإلكتروني في ترميم';
      lines := array[hello, 'أهلًا بك في ترميم. اضغط الزر لتأكيد بريدك الإلكتروني وفتح حسابك.'];
      cta := 'تأكيد البريد';
    end if;
  elsif kind = 'magiclink' then
    if lang = 'en' then
      subj := 'Your Tarmem sign-in link';
      lines := array[hello, 'Press the button to sign in to Tarmem. The link works once, for one hour.'];
      cta := 'Sign in';
    else
      subj := 'رابط الدخول إلى ترميم';
      lines := array[hello, 'اضغط الزر لتسجيل الدخول إلى ترميم. الرابط يعمل مرة واحدة، ولمدة ساعة.'];
      cta := 'تسجيل الدخول';
    end if;
  elsif kind = 'invite' then
    if lang = 'en' then
      subj := 'You are invited to Tarmem';
      lines := array[hello, 'You have been invited to Tarmem. Press the button to accept and set your password.'];
      cta := 'Accept the invitation';
    else
      subj := 'دعوة إلى ترميم';
      lines := array[hello, 'تمت دعوتك إلى ترميم. اضغط الزر لقبول الدعوة واختيار كلمة المرور.'];
      cta := 'قبول الدعوة';
    end if;
  elsif kind = 'email_change' then
    -- Supabase pairs token_hash with the new address and token_hash_new with the current one
    to_addr := coalesce(nullif(u ->> 'new_email', ''), to_addr);
    if lang = 'en' then
      subj := 'Confirm your new email for Tarmem';
      lines := array[hello, 'Press the button to confirm this address for your Tarmem account.'];
      cta := 'Confirm this email';
    else
      subj := 'تأكيد بريدك الجديد في ترميم';
      lines := array[hello, 'اضغط الزر لتأكيد هذا العنوان لحسابك في ترميم.'];
      cta := 'تأكيد البريد';
    end if;
    if nullif(d ->> 'token_hash_new', '') is not null and nullif(u ->> 'email', '') is not null and u ->> 'email' <> to_addr then
      perform public.send_email(u ->> 'email', lang, subj, lines,
        api || '/auth/v1/verify?token=' || public.url_encode(d ->> 'token_hash_new') || '&type=email_change&redirect_to=' || public.url_encode(back),
        cta, 'auth_email_change');
    end if;
  else
    -- a code to type (reauthentication, email OTP) or anything newer: the code and the link
    if lang = 'en' then
      subj := 'Your Tarmem verification code';
      lines := array[hello, 'Your code: ' || coalesce(code, '—'), 'It works once, for a short time. If you did not ask for it, ignore this email.'];
      cta := 'Continue';
    else
      subj := 'رمز التحقق في ترميم';
      lines := array[hello, 'رمزك: ' || coalesce(code, '—'), 'يعمل مرة واحدة ولوقت قصير. إذا لم تطلبه فتجاهل هذه الرسالة.'];
      cta := 'متابعة';
    end if;
    if nullif(d ->> 'token_hash', '') is null then link := null; end if;
  end if;

  perform public.send_email(to_addr, lang, subj, lines, link, cta, 'auth_' || coalesce(nullif(kind, ''), 'email'));
  return '{}'::jsonb;
exception when others then
  begin
    insert into public.email_log (recipient, template, status, detail) values (coalesce(to_addr, '?'), 'auth_' || kind, 'failed', left(sqlerrm, 300));
  exception when others then null;
  end;
  return jsonb_build_object('error', jsonb_build_object('http_code', 500, 'message', 'The email could not be sent. Please try again.'));
end $$;

-- the console's reply to a support case (021): the team's words, greeting without the name the sender typed
create or replace function public.admin_reply_case(p_case bigint, p_body text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  c record; sent boolean := false; rid bigint; site text;
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  if p_body is null or char_length(btrim(p_body)) < 2 then raise exception 'the reply is empty'; end if;
  select * into c from public.contact_messages where id = p_case;
  if not found then raise exception 'no such case'; end if;
  site := coalesce((select value from public.app_secrets where key = 'site_url'), 'https://www.tarmem.sa');
  if c.email is not null then
    if c.lang = 'en' then
      perform public.send_email(c.email, 'en', 'A reply from Tarmem about your message',
        array['Hello,', btrim(p_body), 'To continue the conversation, write to support@tarmem.sa.'],
        site || '/contact', 'Contact Tarmem', 'case_reply');
    else
      perform public.send_email(c.email, 'ar', 'رد فريق ترميم على رسالتك',
        array['مرحبًا،', btrim(p_body), 'لمتابعة الحديث، راسلنا على support@tarmem.sa.'],
        site || '/contact', 'تواصل مع ترميم', 'case_reply');
    end if;
    sent := true;
  end if;
  insert into public.case_replies (case_id, admin_id, body, sent_by_email) values (p_case, auth.uid(), btrim(p_body), sent) returning id into rid;
  update public.contact_messages set answered_at = now() where id = p_case;
  return jsonb_build_object('id', rid, 'sent', sent);
end $$;
revoke all on function public.admin_reply_case(bigint, text) from public, anon;
grant execute on function public.admin_reply_case(bigint, text) to authenticated;

-- change requests (027): the project named by number and trade; the "approved" email no longer repeats the
-- author's own description back to them
create or replace function public.change_request_create(p_project uuid, p_desc text, p_amount integer default 0, p_days integer default 0) returns public.change_requests
language plpgsql security definer set search_path = public as $$
declare p public.projects; side text; total bigint; row public.change_requests; other public.profiles; d text := btrim(coalesce(p_desc, '')); label text;
begin
  if auth.uid() is null then raise exception 'sign in first' using errcode = '42501'; end if;
  select * into p from public.projects where id = p_project;
  side := case when p.owner_id = auth.uid() then 'ho' when p.contractor_id = auth.uid() then 'co' end;
  if p.id is null or side is null then raise exception 'only the project''s two parties can propose a change' using errcode = '42501'; end if;
  if p.status <> 'active' or not exists (select 1 from public.agreements a where a.project_id = p_project and a.contractor_signed_at is not null) then
    raise exception 'change requests open once both parties have signed' using errcode = '42501';
  end if;
  if char_length(d) < 3 then raise exception 'describe the change' using errcode = '22023'; end if;
  if (select count(*) from public.change_requests where project_id = p_project and applied_at is null) >= 10 then
    raise exception 'too many change requests are waiting on this project' using errcode = '42501';
  end if;
  total := public.change_total(p_project) + coalesce(p_amount, 0);
  if total < 100 or total > 1000000 then raise exception 'the project''s value would leave its limits (100 to 1,000,000 riyals)' using errcode = '22023'; end if;
  insert into public.change_requests (project_id, code, by_id, by_side, description, amount, days, ho_ok_at, co_ok_at)
  values (p_project, 'CR-' || ((select count(*) from public.change_requests where project_id = p_project) + 1), auth.uid(), side, left(d, 1000),
          coalesce(p_amount, 0), coalesce(p_days, 0), case when side = 'ho' then now() end, case when side = 'co' then now() end)
  returning * into row;
  insert into public.events (actor_id, entity, entity_id, action, detail) values (auth.uid(), 'change', p_project::text, 'proposed', jsonb_build_object('code', row.code, 'amount', row.amount, 'days', row.days));
  select * into other from public.profiles where id = case when side = 'ho' then p.contractor_id else p.owner_id end;
  label := public.trade_label(p.trade, case when other.lang = 'en' then 'en' else 'ar' end);
  perform public.send_email(other.email, coalesce(other.lang, 'ar'),
    case when other.lang = 'en' then 'A change request on project ' || p.code else 'طلب تغيير على المشروع ' || p.code end,
    case when other.lang = 'en' then array['A change was proposed on project ' || p.code || ' (' || label || '): ' || row.description,
                                           'Amount: ' || case when row.amount >= 0 then '+' else '' end || row.amount || ' SAR · extra days: ' || row.days,
                                           'Nothing changes until you approve it on the project page.']
         else array['اقتُرح تغيير على المشروع ' || p.code || ' (' || label || '): ' || row.description,
                    'المبلغ: ' || case when row.amount >= 0 then '+' else '' end || row.amount || ' ريال · أيام إضافية: ' || row.days,
                    'لا يتغير شيء حتى تعتمده من صفحة المشروع.'] end,
    'https://www.tarmem.sa/project/' || p.code, case when other.lang = 'en' then 'Review the change' else 'راجع الطلب' end, 'change_request');
  return row;
end $$;
revoke all on function public.change_request_create(uuid, text, integer, integer) from public, anon;
grant execute on function public.change_request_create(uuid, text, integer, integer) to authenticated;

create or replace function public.change_request_approve(p_id bigint) returns public.change_requests
language plpgsql security definer set search_path = public as $$
declare c public.change_requests; p public.projects; side text; total bigint; author public.profiles;
begin
  if auth.uid() is null then raise exception 'sign in first' using errcode = '42501'; end if;
  select * into c from public.change_requests where id = p_id for update;
  select * into p from public.projects where id = c.project_id;
  side := case when p.owner_id = auth.uid() then 'ho' when p.contractor_id = auth.uid() then 'co' end;
  if c.id is null or side is null then raise exception 'only the project''s two parties can approve a change' using errcode = '42501'; end if;
  if c.applied_at is not null then return c; end if;
  if (side = 'ho' and c.ho_ok_at is not null) or (side = 'co' and c.co_ok_at is not null) then
    raise exception 'the other party approves a change you proposed' using errcode = '42501';
  end if;
  if p.status <> 'active' then raise exception 'this project no longer takes changes' using errcode = '42501'; end if;
  total := public.change_total(c.project_id) + c.amount;
  if total < 100 or total > 1000000 then raise exception 'the project''s value would leave its limits (100 to 1,000,000 riyals)' using errcode = '22023'; end if;
  update public.change_requests set ho_ok_at = coalesce(ho_ok_at, now()), co_ok_at = coalesce(co_ok_at, now()), applied_at = now()
   where id = p_id returning * into c;
  update public.projects set amount = total::integer where id = c.project_id;
  insert into public.events (actor_id, entity, entity_id, action, detail) values (auth.uid(), 'change', c.project_id::text, 'applied', jsonb_build_object('code', c.code, 'amount', c.amount, 'days', c.days, 'total', total));
  select * into author from public.profiles where id = c.by_id;
  perform public.send_email(author.email, coalesce(author.lang, 'ar'),
    case when author.lang = 'en' then 'Your change request on ' || p.code || ' is approved' else 'اعتُمد طلب التغيير على المشروع ' || p.code end,
    case when author.lang = 'en' then array['Both parties approved ' || c.code || ' on project ' || p.code || '.', 'The project''s value is now ' || total || ' SAR.']
         else array['اعتمد الطرفان ' || c.code || ' على المشروع ' || p.code || '.', 'قيمة المشروع الآن ' || total || ' ريال.'] end,
    'https://www.tarmem.sa/project/' || p.code, case when author.lang = 'en' then 'Open the project' else 'افتح المشروع' end, 'change_applied');
  return c;
end $$;
revoke all on function public.change_request_approve(bigint) from public, anon;
grant execute on function public.change_request_approve(bigint) to authenticated;

-- ---------------------------------------------------------------------------------------
-- 3. The WhatsApp test: per account too
-- ---------------------------------------------------------------------------------------
alter table public.email_log add column if not exists actor_id uuid;   -- who asked for it, where a person did (the WhatsApp test)
create index if not exists email_log_actor_idx on public.email_log (actor_id, at desc) where actor_id is not null;

create or replace function public.whatsapp_test() returns text
language plpgsql security definer set search_path = public as $$
declare me public.profiles; num text; today int; mine int; allowance int; before_id bigint;
begin
  if auth.uid() is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if not coalesce((select enabled from public.platform_flags where key = 'whatsapp_live'), false) then
    raise exception 'WhatsApp updates are not switched on yet' using errcode = '42501';
  end if;
  select * into me from public.profiles where id = auth.uid();
  num := public.wa_number(me.mobile);
  if num is null then raise exception 'not a Saudi mobile number' using errcode = '22023'; end if;
  -- with mobile verification on, a test goes only to a number the account has verified (the code comes first)
  if coalesce((select enabled from public.platform_flags where key = 'otp_live'), false) and me.mobile_verified_at is null then
    raise exception 'mobile_not_verified: confirm your number with the WhatsApp code first' using errcode = '42501';
  end if;
  if public.is_admin() then perform public.wa_reconcile(); end if; -- the cron and the inbox do it for everyone else
  allowance := case when public.is_admin() then 10 else 3 end;
  -- per number (023/025) …
  select count(*) into today from public.email_log
   where recipient = num and channel = 'whatsapp' and template = 'wa_test' and status = 'sent'
     and coalesce(answer_code, 200) < 400 and at > now() - interval '1 day';
  if today >= allowance then raise exception 'test messages a day: % reached', allowance using errcode = '42501'; end if;
  -- … and per account (029): changing the number does not buy more
  select count(*) into mine from public.email_log
   where actor_id = auth.uid() and channel = 'whatsapp' and template = 'wa_test' and status = 'sent'
     and coalesce(answer_code, 200) < 400 and at > now() - interval '1 day';
  if mine >= allowance then raise exception 'test messages a day: % reached', allowance using errcode = '42501'; end if;
  select coalesce(max(id), 0) into before_id from public.email_log;
  -- the body of tarmem_wa_test_2 has one value, {{1}}: the number, written the way people read it
  perform public.send_whatsapp(me.mobile, case when me.lang = 'en' then 'en' else 'ar' end, 'wa_test',
    array['+' || substr(num, 1, 3) || ' ' || substr(num, 4, 2) || ' ' || substr(num, 6, 3) || ' ' || substr(num, 9)], 'settings');
  update public.email_log set actor_id = auth.uid() where id > before_id and template = 'wa_test' and channel = 'whatsapp' and recipient = num;
  return num;
end;
$$;
revoke all on function public.whatsapp_test() from public, anon;
grant execute on function public.whatsapp_test() to authenticated;

-- ---------------------------------------------------------------------------------------
-- 4. Erasure: what is matched only by email, and what stays as a project's record
-- ---------------------------------------------------------------------------------------
-- Has this account proved it owns its email address? Only by opening the confirmation link Supabase emailed it:
-- email_confirmed_at at or after confirmation_sent_at. While "Confirm email" is off, Supabase marks every new
-- account confirmed at sign-up and sends nothing (confirmation_sent_at stays empty), so those accounts prove
-- nothing — anyone could have signed up with somebody else's address. (Read through to_jsonb so the function
-- does not depend on the column's presence in a test copy of auth.users.)
create or replace function public.email_proven(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select u.email is not null and u.email_confirmed_at is not null
       and nullif(to_jsonb(u) ->> 'confirmation_sent_at', '') is not null
       and u.email_confirmed_at >= (to_jsonb(u) ->> 'confirmation_sent_at')::timestamptz
      from auth.users u where u.id = p_user), false)
$$;
revoke all on function public.email_proven(uuid) from public, anon, authenticated;

create or replace function public.erase_account(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  digits text; tomb text; old_email text; joined timestamptz; confirmed boolean; own text;
begin
  if p_user is null or not exists (select 1 from public.profiles where id = p_user) then raise exception 'no such account'; end if;
  if exists (select 1 from public.projects where status = 'active' and (owner_id = p_user or contractor_id = p_user)) then
    raise exception 'active_project: a project in progress must be finished first' using errcode = 'P0001';
  end if;
  select email, created_at into old_email, joined from auth.users where id = p_user;
  confirmed := public.email_proven(p_user);
  digits := regexp_replace(md5(p_user::text), '[^0-9]', '', 'g') || '00000000000';
  update public.profiles
     set full_name = case when lang = 'en' then 'Deleted account' else 'حساب محذوف' end,
         mobile = '0' || rpad(left(digits, 11), 11, '0'), email = null, company = null, about = null,
         prefs = '{}'::jsonb, trades = null, mobile_verified_at = null, deleted_at = now()
   where id = p_user;
  -- (028) nothing of theirs stays open to others: open projects are withdrawn, waiting bids too
  update public.projects set status = 'withdrawn' where owner_id = p_user and status = 'open';
  update public.bids set status = 'withdrawn' where contractor_id = p_user and status = 'submitted' and public.project_is_open(project_id);
  -- (029) what is linked to the account goes; what only shares its email address goes only when the account proved
  -- the address and the row was sent after the account existed: anyone can sign up with somebody else's address
  delete from public.contractor_applications
   where user_id = p_user
      or (user_id is null and old_email is not null and confirmed and created_at >= joined and lower(email) = lower(old_email));
  delete from public.portfolio where user_id = p_user;
  delete from public.payout_accounts where user_id = p_user;
  -- (029) messages go, except in the thread of a project that was awarded to that thread's contractor: that
  -- conversation is part of the project's record, which the other party and a dispute may need
  delete from public.project_messages m where m.from_id = p_user
     and not exists (select 1 from public.projects p where p.id = m.project_id and p.contractor_id = m.contractor_id);
  delete from public.mobile_codes where user_id = p_user;
  if old_email is not null and confirmed then
    delete from public.contact_messages where email is not null and lower(email) = lower(old_email) and created_at >= joined;
  end if;
  update public.visits set user_id = null where user_id = p_user;
  update public.events set actor_id = null where actor_id = p_user;
  update public.email_log set actor_id = null where actor_id = p_user;
  begin
    delete from storage.objects where bucket_id = 'portfolio' and name like p_user::text || '/%';
  exception when others then null; end;
  -- (029) project files: only what this person uploaded (a contractor's stage evidence sits in the homeowner's folder,
  -- uploaded by the contractor), and nothing of a project that was awarded (its photos are the record of the work).
  -- Supabase stamps the uploader as owner_id (text) now, owner (uuid) before: whichever exists.
  begin
    own := case
      when exists (select 1 from information_schema.columns where table_schema = 'storage' and table_name = 'objects' and column_name = 'owner_id')
       and exists (select 1 from information_schema.columns where table_schema = 'storage' and table_name = 'objects' and column_name = 'owner')
        then 'coalesce(o.owner_id, o.owner::text)'
      when exists (select 1 from information_schema.columns where table_schema = 'storage' and table_name = 'objects' and column_name = 'owner_id') then 'o.owner_id'
      else 'o.owner::text' end;
    execute format('delete from storage.objects o where o.bucket_id = ''project-files'' and o.name like $1 and %s = $2'
                || ' and not exists (select 1 from public.projects p where p.id::text = (storage.foldername(o.name))[2] and p.contractor_id is not null)', own)
      using p_user::text || '/%', p_user::text;
  exception when others then null; end;
  tomb := 'deleted-' || replace(p_user::text, '-', '') || '@deleted.tarmem.sa';
  begin delete from auth.identities where user_id = p_user; exception when undefined_table then null; end;
  begin delete from auth.sessions where user_id = p_user; exception when undefined_table then null; end;
  begin delete from auth.mfa_factors where user_id = p_user; exception when undefined_table then null; end;
  update auth.users set email = tomb, encrypted_password = null, raw_user_meta_data = '{}'::jsonb, phone = null, banned_until = 'infinity' where id = p_user;
end $$;
revoke all on function public.erase_account(uuid) from public, anon, authenticated;

-- the console's view of one person (021): their contact messages counted by the same rule
create or replace function public.admin_user_detail(p_user uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  result jsonb;
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  select jsonb_build_object(
    'profile', to_jsonb(p) - 'prefs',
    'email', u.email,
    'created_at', u.created_at,
    'last_sign_in_at', u.last_sign_in_at,
    'email_confirmed_at', u.email_confirmed_at,
    'projects', (select coalesce(jsonb_agg(jsonb_build_object(
                   'id', pr.id, 'code', pr.code, 'title', pr.title, 'status', pr.status, 'city', pr.city, 'trade', pr.trade,
                   'budget_min', pr.budget_min, 'budget_max', pr.budget_max, 'created_at', pr.created_at,
                   'bids', (select count(*) from public.bids b where b.project_id = pr.id and b.status <> 'withdrawn'))
                   order by pr.created_at desc), '[]'::jsonb)
                 from public.projects pr where pr.owner_id = p.id),
    'bids', (select coalesce(jsonb_agg(jsonb_build_object(
               'id', b.id, 'project_code', pr.code, 'project_title', pr.title, 'price', b.price, 'days', b.days,
               'status', b.status, 'created_at', b.created_at)
               order by b.created_at desc), '[]'::jsonb)
             from public.bids b join public.projects pr on pr.id = b.project_id where b.contractor_id = p.id),
    'application', (select to_jsonb(a) from public.contractor_applications a where a.user_id = p.id order by a.created_at desc limit 1),
    'messages', (select count(*) from public.contact_messages m
                  where u.email is not null and public.email_proven(u.id) and m.created_at >= u.created_at and lower(m.email) = lower(u.email)),
    'portfolio', (select count(*) from public.portfolio f where f.user_id = p.id),
    'reviews', (select count(*) from public.reviews r where r.contractor_id = p.id)
  ) into result
  from public.profiles p join auth.users u on u.id = p.id
  where p.id = p_user;
  if result is null then raise exception 'no such user'; end if;
  return result;
end $$;
revoke all on function public.admin_user_detail(uuid) from public, anon;
grant execute on function public.admin_user_detail(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------
-- 5. Messages: the website writes the words, the database the rest
-- ---------------------------------------------------------------------------------------
revoke insert on public.project_messages from anon, authenticated;
grant insert (project_id, contractor_id, body) on public.project_messages to authenticated;
-- (marking as read stays mark_messages_read(), 019, which sets read_at itself)

-- ---------------------------------------------------------------------------------------
-- 6. The choice between bids, only while the project is open
-- ---------------------------------------------------------------------------------------
create or replace function public.bids_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.id <> old.id or new.project_id <> old.project_id or new.contractor_id <> old.contractor_id or new.created_at <> old.created_at then
    raise exception 'a bid cannot be moved' using errcode = '42501';
  end if;
  new.updated_at := now();
  -- the team, and the database's own work with nobody signed in (SQL editor, server key): the website never gets here
  -- without a signed-in person, because the row rule needs auth.uid()
  if public.is_admin() or auth.uid() is null then return new; end if;
  if old.contractor_id = auth.uid() then
    if old.status = 'chosen' then raise exception 'a chosen bid cannot be changed' using errcode = '42501'; end if;
    if new.status not in ('submitted', 'withdrawn') then raise exception 'only the homeowner chooses a bid' using errcode = '42501'; end if;
    if not public.project_is_open(old.project_id) then raise exception 'the project is no longer open' using errcode = '42501'; end if;
    return new;
  end if;
  -- the project's owner: the choice, and nothing else, and only while the project is open for bids (029)
  if not public.project_is_open(old.project_id) then raise exception 'the project is no longer open' using errcode = '42501'; end if;
  if new.price <> old.price or new.days <> old.days or new.note is distinct from old.note or new.details <> old.details then
    raise exception 'only the contractor changes a bid' using errcode = '42501';
  end if;
  if old.status = 'withdrawn' or new.status not in ('submitted', 'chosen') then
    raise exception 'this bid cannot be chosen' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------------------
-- 7. The delivery log, looked up by template and time
-- ---------------------------------------------------------------------------------------
create index if not exists email_log_template_at_idx on public.email_log (template, at);

-- ---------------------------------------------------------------------------------------
-- 8. At most 30 team alerts an hour
-- ---------------------------------------------------------------------------------------
create index if not exists alert_log_status_at_idx on public.alert_log (status, at desc);
-- an alert the team must never miss: sent whatever the hour's count, and not counted in it
alter table public.alert_log add column if not exists priority boolean not null default false;

create or replace function public.send_alert(p_subject text, p_lines text[], p_priority boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  api_key text; sender text; recipients text; body text; net_schema text; recent int; held int; skip_id bigint;
  urgent boolean := coalesce(p_priority, false);
begin
  select value into api_key from public.app_secrets where key = 'resend_key';
  if api_key is null or api_key = '' then return; end if;          -- alerts are not switched on
  if not urgent then
    select count(*) into recent from public.alert_log where status = 'sent' and not priority and at > now() - interval '1 hour';
    if recent >= 30 then
      -- a flood (or someone filling the forms) must not fill the team's mailbox: the rest of the hour waits in the
      -- console. One row per hour says how many were held back and which was the latest.
      select id, coalesce(nullif(substring(detail from '^([0-9]+) '), '')::int, 1) into skip_id, held
        from public.alert_log where status = 'skipped' and at > now() - interval '1 hour' order by id desc limit 1;
      if skip_id is null then
        insert into public.alert_log (what, status, detail)
        values (p_subject, 'skipped', '1 alert not emailed: 30 alert emails in the last hour. Alerts are not emailed until the hour has passed (the daily summary, signed agreements and completions always are); everything is still in the console');
      else
        update public.alert_log set what = p_subject,
          detail = (held + 1) || ' alerts not emailed: 30 alert emails in the last hour. Alerts are not emailed until the hour has passed (the daily summary, signed agreements and completions always are); everything is still in the console'
         where id = skip_id;
      end if;
      return;
    end if;
  end if;
  select value into sender from public.app_secrets where key = 'alert_from';
  select value into recipients from public.app_secrets where key = 'alert_to';

  body := '<div dir="rtl" style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.9;color:#14113F">'
       || '<p style="font-size:17px;font-weight:600;color:#1B1464">' || replace(p_subject, '<', '&lt;') || '</p>'
       || coalesce((select string_agg('<p>' || replace(l, '<', '&lt;') || '</p>', '') from unnest(p_lines) l), '')
       || '<p style="margin-top:18px"><a href="https://www.tarmem.sa/admin" style="background:#FF5A3C;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none">افتح لوحة الإدارة</a></p></div>';

  select n.nspname into net_schema from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.proname = 'http_post' limit 1;
  if net_schema is null then
    insert into public.alert_log (what, status, detail, priority) values (p_subject, 'failed', 'pg_net is not installed', urgent);
    return;
  end if;

  execute format('select %I.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 5000)', net_schema)
    using 'https://api.resend.com/emails',
          jsonb_build_object('Authorization', 'Bearer ' || api_key, 'Content-Type', 'application/json'),
          jsonb_build_object('from', sender, 'to', string_to_array(recipients, ','), 'subject', p_subject, 'html', body);

  insert into public.alert_log (what, status, priority) values (p_subject, 'sent', urgent);
exception when others then
  insert into public.alert_log (what, status, detail, priority) values (p_subject, 'failed', left(sqlerrm, 300), urgent);
end;
$$;
revoke all on function public.send_alert(text, text[], boolean) from public, anon, authenticated;

-- every alert written before (009–028: new projects, contact messages, applications…) is an ordinary one
create or replace function public.send_alert(p_subject text, p_lines text[]) returns void
language sql security definer set search_path = public as $$
  select public.send_alert(p_subject, p_lines, false)
$$;
revoke all on function public.send_alert(text, text[]) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------
-- 9. The public forms, per network address
-- ---------------------------------------------------------------------------------------
-- A salted hash of the sender's network address, one row per accepted form, kept one hour. Never the address.
create table if not exists public.form_hits (
  id      bigint generated always as identity primary key,
  at      timestamptz not null default now(),
  form    text not null,
  client  text not null
);
create index if not exists form_hits_client_idx on public.form_hits (form, client, at desc);
create index if not exists form_hits_at_idx on public.form_hits (at);
alter table public.form_hits enable row level security;   -- no policy: only the trigger below touches it
revoke all on public.form_hits from public, anon, authenticated;
insert into public.app_secrets (key, value) values ('form_salt', encode(extensions.gen_random_bytes(16), 'hex')) on conflict (key) do nothing;

-- The request's client address, as Supabase's API passes it to the database (request.headers), in this order:
--   1. cf-connecting-ip — set by Cloudflare in front of Supabase from the connection itself; Cloudflare overwrites
--      whatever a client sends under that name, so a client cannot choose it.
--   2. the LAST entry of x-forwarded-for — the one the last proxy appended from the connection it received. Never the
--      first: a client can send its own x-forwarded-for, and every proxy only appends to it, so the first entry is
--      whatever the visitor wrote (a new made-up address each time, or a victim's address to use up their allowance).
--   Not x-real-ip: a client can send that header too, and nothing here proves the gateway replaces it.
-- Supabase's API sits behind Cloudflare, so 1 is expected on every request and 2 is the fallback. Not yet checked
-- against the real gateway: to see which headers reach the database, call once, signed in, a temporary admin-only
-- function returning current_setting('request.headers', true)::jsonb - 'authorization' - 'apikey' - 'cookie'
-- (the SQL editor has no request, so it cannot show them). If 1 is missing there, the last x-forwarded-for entry may be
-- the proxy's own address (one count shared by many visitors): tell the developer before relying on the limit.
-- With neither, the per-network count is skipped.
-- An IPv6 address counts by its /64, which one household or phone holds. No header (SQL editor, server jobs) → null.
create or replace function public.form_client_key() returns text
language plpgsql stable set search_path = public as $$
declare h jsonb; cand text; a inet; k text; salt text; xff text[];
begin
  begin
    h := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then return null;
  end;
  if h is null or jsonb_typeof(h) <> 'object' then return null; end if;
  xff := string_to_array(coalesce(h ->> 'x-forwarded-for', ''), ',');
  foreach cand in array array[h ->> 'cf-connecting-ip', xff[coalesce(array_length(xff, 1), 1)]] loop
    cand := btrim(coalesce(cand, ''));
    if cand = '' or length(cand) > 64 then continue; end if;
    begin
      a := cand::inet;
    exception when others then a := null;
    end;
    if a is null then continue; end if;
    k := case when family(a) = 6 then '6:' || host(network(set_masklen(a, 64))) else '4:' || host(a) end;
    select value into salt from public.app_secrets where key = 'form_salt';
    return encode(extensions.digest(coalesce(salt, '') || '|' || k, 'sha256'), 'hex');
  end loop;
  return null;
end $$;

create or replace function public.forms_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare same int := 0; burst int := 0; from_here int := 0; v_client text := public.form_client_key();
begin
  if v_client is not null then
    delete from public.form_hits where at < now() - interval '1 hour';
    select count(*) into from_here from public.form_hits h where h.form = tg_table_name and h.client = v_client and h.at > now() - interval '1 hour';
  end if;
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
  if from_here >= 10 then raise exception 'too many: ten in an hour from the same network' using errcode = 'P0001'; end if;
  if burst >= 120 then raise exception 'too many right now: please try again in a few minutes' using errcode = 'P0001'; end if;
  if v_client is not null then insert into public.form_hits (form, client) values (tg_table_name, v_client); end if;
  return new;
end $$;
drop trigger if exists contact_messages_rate_limit on public.contact_messages;
create trigger contact_messages_rate_limit before insert on public.contact_messages for each row execute function public.forms_rate_limit();
drop trigger if exists contractor_applications_rate_limit on public.contractor_applications;
create trigger contractor_applications_rate_limit before insert on public.contractor_applications for each row execute function public.forms_rate_limit();

-- ---------------------------------------------------------------------------------------
-- 10. The visit log: at most 200 rows per visit code an hour, and 600 per network address
-- ---------------------------------------------------------------------------------------
create index if not exists visits_session_idx on public.visits (session_id, created_at desc);

-- The visit code is made by the browser, so a script can use a new one for every row: the network address (the same
-- salted, one-hour hash as the forms, form 'visits') caps what one sender adds.
create or replace function public.visits_throttle() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_client text := public.form_client_key(); from_here int;
begin
  if (select count(*) from (select 1 from public.visits v where v.session_id = new.session_id and v.created_at > now() - interval '1 hour' limit 200) x) >= 200 then
    return null;   -- dropped quietly: a page view is never worth an error
  end if;
  if v_client is not null then
    select count(*) into from_here from (select 1 from public.form_hits h where h.form = 'visits' and h.client = v_client and h.at > now() - interval '1 hour' limit 600) x;
    if from_here >= 600 then return null; end if;
    delete from public.form_hits where at < now() - interval '1 hour';
    insert into public.form_hits (form, client) values ('visits', v_client);
  end if;
  return new;
end $$;
drop trigger if exists visits_throttle on public.visits;
create trigger visits_throttle before insert on public.visits for each row execute function public.visits_throttle();

-- ---------------------------------------------------------------------------------------
-- 11. Storage: 40 files per person in a project's folder, and deleting your own
-- ---------------------------------------------------------------------------------------
-- Supabase stamps each object with its uploader: owner_id (text) now, owner (uuid) before; read whichever exists.
do $$
declare
  has_id boolean := exists (select 1 from information_schema.columns where table_schema = 'storage' and table_name = 'objects' and column_name = 'owner_id');
  has_uuid boolean := exists (select 1 from information_schema.columns where table_schema = 'storage' and table_name = 'objects' and column_name = 'owner');
  own text;   -- %1$s is the table name or alias
  cap text;
begin
  own := case when has_id and has_uuid then 'coalesce(%1$s.owner_id, %1$s.owner::text)' when has_id then '%1$s.owner_id' else '%1$s.owner::text' end;
  -- the files this person already has in this project's folder (theirs and, for a contractor, their stage evidence)
  cap := format('(select count(*) from storage.objects o where o.bucket_id = ''project-files'' and (storage.foldername(o.name))[1] = (storage.foldername(objects.name))[1]'
             || ' and (storage.foldername(o.name))[2] = (storage.foldername(objects.name))[2] and %s = (select auth.uid())::text) < 40', format(own, 'o'));

  execute 'drop policy if exists "homeowners add files to their own projects" on storage.objects';
  execute 'create policy "homeowners add files to their own projects" on storage.objects for insert to authenticated with check ('
       || 'bucket_id = ''project-files'' and (storage.foldername(name))[1] = (select auth.uid())::text'
       || ' and exists (select 1 from public.projects p where p.id::text = (storage.foldername(name))[2] and p.owner_id = (select auth.uid()))'
       || ' and ' || cap || ')';

  execute 'drop policy if exists "the awarded contractor adds stage evidence" on storage.objects';
  execute 'create policy "the awarded contractor adds stage evidence" on storage.objects for insert to authenticated with check ('
       || 'bucket_id = ''project-files'' and (storage.foldername(name))[3] like ''stage-_'''
       || ' and exists (select 1 from public.projects p where p.id::text = (storage.foldername(name))[2] and p.owner_id::text = (storage.foldername(name))[1] and p.contractor_id = (select auth.uid()))'
       || ' and ' || cap || ')';

  -- a person deletes files they uploaded under their own id (what "delete my account" does first), except in a
  -- project that was awarded (it has a contractor): from then on the photos are the record of the work, which the
  -- other party and a dispute may need — during the work and after it
  execute 'drop policy if exists "people delete their own project files, except during the work" on storage.objects';
  execute 'drop policy if exists "people delete their own project files, except an awarded project''s" on storage.objects';
  execute 'create policy "people delete their own project files, except an awarded project''s" on storage.objects for delete to authenticated using ('
       || 'bucket_id = ''project-files'' and ' || format(own, 'objects') || ' = (select auth.uid())::text'
       || ' and (storage.foldername(name))[1] = (select auth.uid())::text'
       || ' and not exists (select 1 from public.projects p where p.id::text = (storage.foldername(name))[2] and p.contractor_id is not null))';

  -- portfolio photos (011): their contractor removes them, as before
  execute 'drop policy if exists "contractors remove their own portfolio photos" on storage.objects';
  execute 'create policy "contractors remove their own portfolio photos" on storage.objects for delete to authenticated using ('
       || 'bucket_id = ''portfolio'' and (storage.foldername(name))[1] = (select auth.uid())::text)';
end $$;

-- ---------------------------------------------------------------------------------------
-- 12. What a visitor who is not signed in may call
-- ---------------------------------------------------------------------------------------
-- Internal helpers: only the database's own functions (which run as their owner) call them. Nobody through the API.
revoke execute on function public.email_html(text, text, text[], text, text) from public, anon, authenticated;
revoke execute on function public.url_encode(text) from public, anon, authenticated;   -- 024's grant to supabase_auth_admin stays
revoke execute on function public.wa_template_specs() from public, anon, authenticated;
revoke execute on function public.wa_template_name(text) from public, anon, authenticated;
revoke execute on function public.wa_json(text) from public, anon, authenticated;
revoke execute on function public.wa_now() from public, anon, authenticated;
revoke execute on function public.wa_quiet_until(timestamptz) from public, anon, authenticated;
revoke execute on function public.wa_number(text) from public, anon, authenticated;
revoke execute on function public.wa_status_rank(text) from public, anon, authenticated;
revoke execute on function public.trade_label(text, text) from public, anon, authenticated;
revoke execute on function public.form_client_key() from public, anon, authenticated;
revoke execute on function public.otp_hash(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.receipt_allowed(text, text) from public, anon, authenticated;
revoke execute on function public.email_proven(uuid) from public, anon, authenticated;
revoke execute on function public.send_alert(text, text[], boolean) from public, anon, authenticated;
-- (already closed by 009–028; said again so this file alone leaves them closed)
revoke execute on function public.send_email(text, text, text, text[], text, text, text) from public, anon, authenticated;
revoke execute on function public.send_alert(text, text[]) from public, anon, authenticated;
revoke execute on function public.send_whatsapp(text, text, text, text[], text) from public, anon, authenticated;
revoke execute on function public.tell(text, text, text, text, text[], text, text, text, text[]) from public, anon, authenticated;
revoke execute on function public.wa_post(text, text, text, text[], text) from public, anon, authenticated;
revoke execute on function public.wa_post_otp(text, text, text) from public, anon, authenticated;
revoke execute on function public.wa_send_text(text, text, text) from public, anon, authenticated;
revoke execute on function public.wa_flush() from public, anon, authenticated;
revoke execute on function public.wa_apply_statuses() from public, anon, authenticated;
revoke execute on function public.wa_submit_templates(text, text[]) from public, anon, authenticated;
revoke execute on function public.wa_submit_otp_template(text) from public, anon, authenticated;
revoke execute on function public.wa_delete_template(text, text) from public, anon, authenticated;
revoke execute on function public.wa_setup_webhook(text, text) from public, anon, authenticated;
revoke execute on function public.set_alerts(text, text, text) from public, anon, authenticated;
revoke execute on function public.set_whatsapp(text, text, text) from public, anon, authenticated;
revoke execute on function public.set_otp(boolean) from public, anon, authenticated;
revoke execute on function public.set_wa_app_secret(text) from public, anon, authenticated;
revoke execute on function public.hmac_sha256(bytea, bytea) from public, anon, authenticated;
revoke execute on function public.erase_account(uuid) from public, anon, authenticated;
revoke execute on function public.change_total(uuid) from public, anon, authenticated;
revoke execute on function public.stage_evidence(uuid, int, text) from public, anon, authenticated;
revoke execute on function public.auth_send_email(jsonb) from public, anon, authenticated;

-- Signed-in only: mobile_key is the index on profiles (evaluated as the person saving their profile), my_role a row rule
revoke execute on function public.mobile_key(text) from public, anon;
grant execute on function public.mobile_key(text) to authenticated;
revoke execute on function public.my_role() from public, anon;
grant execute on function public.my_role() to authenticated;

-- Trigger functions run whatever their caller may execute: nobody calls them through the API (as 025, now also the new ones)
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
             and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

-- Kept for visitors, on purpose: is_admin() (row rules), mobile_taken() (the sign-up form), wa_webhook() (Meta's
-- webhook, called by api/wa-webhook.ts with the publishable key; the signature is the lock).

select 'launch hardening (029): ready' as result,
  (select string_agg(p.proname, ', ' order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')) as visitors_may_call,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) c where c like 'search_path=%')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')) as no_search_path;
