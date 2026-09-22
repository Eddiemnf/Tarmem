-- =======================================================================================
-- Tarmem — 014: one WhatsApp template per event, submitted to Meta by the database itself
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run. Safe to run more than once.
-- Needs 001–013. The last line submits the templates to Meta (running it again re-submits; Meta answers
-- "already exists" for the ones it has, which is harmless).
--
-- WHY: the single generic template of 012 ("an update on your project: {{1}} {{2}}") is almost entirely
-- variables, so Meta's classifier could not tell what it says and filed it as Marketing — five times the
-- price, rationed per person. A template that names its event in fixed words ("New bid on your project
-- {{1}}: {{2}} bid SAR {{3}} for {{4}} days") is a Utility message. So: nine templates, each for one event,
-- in Arabic and English, defined below and posted to Meta through the API with the stored token — the same
-- token that sends, which never leaves the database.
--
-- The sending side changes with it: send_whatsapp(mobile, lang, event, params[], path). notify_people passes
-- the specifics (project code, company, amount, days…) instead of a subject line. Quiet hours, the person's
-- channel choice, the throttle and the test button (013) all stay as they are.
--
-- AFTER RUNNING, Meta's answers are in:  select created, status_code, content from net._http_response order by created desc limit 20;
-- and the templates page in WhatsApp Manager lists them with their status.
-- The old "tarmem_update" pair (Marketing) can go:  select public.wa_delete_template('tarmem_update');
-- =======================================================================================

-- 1. the templates, exactly as Meta will hold them ------------------------------------------------
-- Every one has one body per language, a sample for each {{n}}, and one "Visit website" button whose
-- address is https://www.tarmem.sa/{{1}} — the path the database sends with each message.
create or replace function public.wa_template_specs() returns jsonb
language sql immutable as $$
select jsonb_build_array(
  jsonb_build_object('event', 'project_posted',
    'ar', jsonb_build_object('body', 'نُشر مشروعك {{1}} في ترميم: {{2}}. يراه المقاولون الموثّقون الآن، وتصلك رسالة مع كل عرض جديد.', 'samples', jsonb_build_array('P-2001', 'تجديد مطبخ 4×5'), 'button', 'افتح المشروع', 'path', 'project/P-2001'),
    'en', jsonb_build_object('body', 'Your project {{1}} is posted on Tarmem: {{2}}. Verified contractors can see it now, and you get a message with each new bid.', 'samples', jsonb_build_array('P-2001', 'Kitchen renovation 4x5'), 'button', 'Open the project', 'path', 'project/P-2001')),
  jsonb_build_object('event', 'new_bid',
    'ar', jsonb_build_object('body', 'عرض جديد على مشروعك {{1}} في ترميم: قدّم {{2}} عرضًا بقيمة {{3}} ريال خلال {{4}} يوم. قارن العروض واقبل ما يناسبك حين تكون جاهزًا.', 'samples', jsonb_build_array('P-2001', 'مؤسسة البناء المتقن', '52,000', '30'), 'button', 'قارن العروض', 'path', 'project/P-2001'),
    'en', jsonb_build_object('body', 'New bid on your project {{1}} on Tarmem: {{2}} bid SAR {{3}} for {{4}} days. Compare the bids and accept one when you are ready.', 'samples', jsonb_build_array('P-2001', 'Build Co', '52,000', '30'), 'button', 'Compare the bids', 'path', 'project/P-2001')),
  jsonb_build_object('event', 'agreement_accepted',
    'ar', jsonb_build_object('body', 'اختار صاحب المنزل عرضك على المشروع {{1}} في ترميم بقيمة {{2}} ريال. راجع الاتفاقية ووقّعها؛ يُسند المشروع إليك فور توقيعك.', 'samples', jsonb_build_array('P-2001', '52,000'), 'button', 'راجع الاتفاقية', 'path', 'project/P-2001'),
    'en', jsonb_build_object('body', 'The homeowner accepted your bid on project {{1}} on Tarmem, SAR {{2}}. Review and sign the agreement; the project is awarded to you the moment you do.', 'samples', jsonb_build_array('P-2001', '52,000'), 'button', 'Review the agreement', 'path', 'project/P-2001')),
  jsonb_build_object('event', 'agreement_signed',
    'ar', jsonb_build_object('body', 'وقّع المقاول الاتفاقية: أُسند مشروعك {{1}} في ترميم إلى {{2}} بمبلغ {{3}} ريال. يتواصل معكما فريق ترميم لترتيب الدفعة الأولى وموعد البدء.', 'samples', jsonb_build_array('P-2001', 'مؤسسة البناء المتقن', '52,000'), 'button', 'افتح المشروع', 'path', 'project/P-2001'),
    'en', jsonb_build_object('body', 'The contractor signed: your project {{1}} on Tarmem is awarded to {{2}} for SAR {{3}}. The Tarmem team will contact you both to arrange the first payment and the start date.', 'samples', jsonb_build_array('P-2001', 'Build Co', '52,000'), 'button', 'Open the project', 'path', 'project/P-2001')),
  jsonb_build_object('event', 'application_verified',
    'ar', jsonb_build_object('body', 'تم توثيق حساب «{{1}}» في ترميم وأصبح جاهزًا للاستخدام. سجّل دخولك لتصفّح المشاريع المفتوحة وتقديم عروضك.', 'samples', jsonb_build_array('مؤسسة البناء المتقن'), 'button', 'سجّل دخولك', 'path', 'signin'),
    'en', jsonb_build_object('body', 'Your Tarmem account for {{1}} is verified and ready to use. Sign in to browse open projects and send your bids.', 'samples', jsonb_build_array('Build Co'), 'button', 'Sign in', 'path', 'signin')),
  jsonb_build_object('event', 'stage_submitted',
    'ar', jsonb_build_object('body', 'المرحلة {{1}} من مشروعك {{2}} في ترميم بانتظار اعتمادك: قدّم المقاول صور العمل والفيديو. راجع العمل واعتمد المرحلة، أو سجّل ملاحظة.', 'samples', jsonb_build_array('1', 'P-2001'), 'button', 'راجع المرحلة', 'path', 'project/P-2001'),
    'en', jsonb_build_object('body', 'Stage {{1}} of your project {{2}} on Tarmem is ready for your approval: the contractor submitted photos and a video of the work. Review it and approve the stage, or raise an issue.', 'samples', jsonb_build_array('1', 'P-2001'), 'button', 'Review the stage', 'path', 'project/P-2001')),
  jsonb_build_object('event', 'stage_released',
    'ar', jsonb_build_object('body', 'اعتمد صاحب المنزل المرحلة {{1}} من المشروع {{2}} في ترميم، وصُرفت دفعتها إلى محفظتك.', 'samples', jsonb_build_array('1', 'P-2001'), 'button', 'افتح المشروع', 'path', 'project/P-2001'),
    'en', jsonb_build_object('body', 'The homeowner approved stage {{1}} of project {{2}} on Tarmem; its payment is released to your wallet.', 'samples', jsonb_build_array('1', 'P-2001'), 'button', 'Open the project', 'path', 'project/P-2001')),
  jsonb_build_object('event', 'stage_disputed',
    'ar', jsonb_build_object('body', 'سجّل صاحب المنزل ملاحظة على المرحلة {{1}} من المشروع {{2}} في ترميم: {{3}}. راجع الملاحظة وردّ عليها من صفحة المشروع.', 'samples', jsonb_build_array('1', 'P-2001', 'الدهان غير مكتمل في الغرفة الثانية'), 'button', 'افتح المشروع', 'path', 'project/P-2001'),
    'en', jsonb_build_object('body', 'The homeowner raised an issue on stage {{1}} of project {{2}} on Tarmem: {{3}}. Review it and reply from the project page.', 'samples', jsonb_build_array('1', 'P-2001', 'The paint in the second room is not finished'), 'button', 'Open the project', 'path', 'project/P-2001')),
  jsonb_build_object('event', 'wa_test',
    'ar', jsonb_build_object('body', 'هذه رسالة تجريبية من ترميم للتأكد من وصول تحديثات مشاريعك إلى هذا الرقم. لا يلزمك الرد عليها.', 'samples', jsonb_build_array(), 'button', 'الإعدادات', 'path', 'settings'),
    'en', jsonb_build_object('body', 'This is a test message from Tarmem to confirm that your project updates reach this number. No reply is needed.', 'samples', jsonb_build_array(), 'button', 'Settings', 'path', 'settings'))
);
$$;

-- 2. submitting them to Meta (and removing one) -----------------------------------------------------
create or replace function public.wa_submit_templates(p_waba_id text default '2162520270999056') returns text
language plpgsql security definer set search_path = public as $$
declare
  token text; net_schema text; spec jsonb; lang text; t jsonb; comps jsonb; body jsonb; n int := 0;
begin
  select value into token from public.app_secrets where key = 'wa_token';
  if token is null or token = '' then raise exception 'WhatsApp is not switched on yet: run set_whatsapp first'; end if;
  select nsp.nspname into net_schema from pg_proc p join pg_namespace nsp on nsp.oid = p.pronamespace where p.proname = 'http_post' limit 1;
  if net_schema is null then raise exception 'pg_net is not installed'; end if;
  for spec in select * from jsonb_array_elements(public.wa_template_specs()) loop
    foreach lang in array array['ar', 'en'] loop
      t := spec -> lang;
      comps := jsonb_build_array(
        jsonb_build_object('type', 'BODY', 'text', t ->> 'body')
          || case when jsonb_array_length(t -> 'samples') > 0 then jsonb_build_object('example', jsonb_build_object('body_text', jsonb_build_array(t -> 'samples'))) else '{}'::jsonb end,
        jsonb_build_object('type', 'BUTTONS', 'buttons', jsonb_build_array(
          jsonb_build_object('type', 'URL', 'text', t ->> 'button', 'url', 'https://www.tarmem.sa/{{1}}', 'example', jsonb_build_array('https://www.tarmem.sa/' || (t ->> 'path'))))));
      body := jsonb_build_object('name', 'tarmem_' || (spec ->> 'event'), 'language', lang, 'category', 'UTILITY', 'allow_category_change', false, 'components', comps);
      execute format('select %I.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 8000)', net_schema)
        using 'https://graph.facebook.com/v25.0/' || p_waba_id || '/message_templates',
              jsonb_build_object('Authorization', 'Bearer ' || token, 'Content-Type', 'application/json'), body;
      insert into public.email_log (recipient, template, status, detail, channel) values ('meta', 'tarmem_' || (spec ->> 'event'), 'submitted', lang, 'whatsapp');
      n := n + 1;
    end loop;
  end loop;
  return n || ' templates sent to Meta. Its answers: select created, status_code, content from net._http_response order by created desc limit 20;';
end;
$$;
revoke all on function public.wa_submit_templates(text) from public, anon, authenticated;

create or replace function public.wa_delete_template(p_name text, p_waba_id text default '2162520270999056') returns text
language plpgsql security definer set search_path = public as $$
declare token text; net_schema text;
begin
  select value into token from public.app_secrets where key = 'wa_token';
  if token is null or token = '' then raise exception 'WhatsApp is not switched on yet'; end if;
  if p_name !~ '^[a-z0-9_]+$' or length(p_name) > 512 then raise exception 'a template name is lowercase letters, digits and underscores'; end if;
  select nsp.nspname into net_schema from pg_proc p join pg_namespace nsp on nsp.oid = p.pronamespace where p.proname = 'http_delete' limit 1;
  if net_schema is null then raise exception 'pg_net is not installed'; end if;
  execute format('select %I.http_delete(url := $1, headers := $2)', net_schema)
    using 'https://graph.facebook.com/v25.0/' || p_waba_id || '/message_templates?name=' || p_name,
          jsonb_build_object('Authorization', 'Bearer ' || token);
  insert into public.email_log (recipient, template, status, detail, channel) values ('meta', p_name, 'deleted', 'all languages', 'whatsapp');
  return 'asked Meta to delete ' || p_name || ' in every language';
end;
$$;
revoke all on function public.wa_delete_template(text, text) from public, anon, authenticated;

-- 3. sending with specifics instead of a subject line --------------------------------------------------
drop function if exists public.wa_post(text, text, text, text, text, text);
drop function if exists public.send_whatsapp(text, text, text, text, text, text);
drop function if exists public.tell(text, text, text, text, text[], text, text, text);
drop table if exists public.wa_queue;

create table public.wa_queue (
  id          bigint generated always as identity primary key,
  mobile      text not null,                       -- already in Meta's format (9665…)
  lang        text not null,
  event       text not null,
  params      text[] not null default '{}',
  path        text,
  due_at      timestamptz not null,
  created_at  timestamptz not null default now()
);
alter table public.wa_queue enable row level security;      -- no policies: only the functions below touch it
revoke all on public.wa_queue from public, anon, authenticated;

create or replace function public.wa_post(p_num text, p_lang text, p_event text, p_params text[], p_path text) returns void
language plpgsql security definer set search_path = public as $$
declare
  token text; phone_id text; net_schema text; params jsonb; comps jsonb;
begin
  select value into token from public.app_secrets where key = 'wa_token';
  if token is null or token = '' then return; end if;
  select value into phone_id from public.app_secrets where key = 'wa_phone_id';
  select nsp.nspname into net_schema from pg_proc p join pg_namespace nsp on nsp.oid = p.pronamespace where p.proname = 'http_post' limit 1;
  if net_schema is null then
    insert into public.email_log (recipient, template, status, detail, channel) values (p_num, p_event, 'failed', 'pg_net is not installed', 'whatsapp');
    return;
  end if;
  -- Meta refuses line breaks, tabs and runs of spaces inside a parameter
  select coalesce(jsonb_agg(jsonb_build_object('type', 'text', 'text', left(trim(regexp_replace(coalesce(u.x, ''), '\s+', ' ', 'g')), 300)) order by u.i), '[]'::jsonb)
    into params from unnest(coalesce(p_params, '{}')) with ordinality as u(x, i);
  comps := case when jsonb_array_length(params) > 0 then jsonb_build_array(jsonb_build_object('type', 'body', 'parameters', params)) else '[]'::jsonb end
        || jsonb_build_array(jsonb_build_object('type', 'button', 'sub_type', 'url', 'index', '0', 'parameters', jsonb_build_array(
             jsonb_build_object('type', 'text', 'text', ltrim(coalesce(p_path, ''), '/')))));
  execute format('select %I.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 5000)', net_schema)
    using 'https://graph.facebook.com/v25.0/' || phone_id || '/messages',
          jsonb_build_object('Authorization', 'Bearer ' || token, 'Content-Type', 'application/json'),
          jsonb_build_object('messaging_product', 'whatsapp', 'to', p_num, 'type', 'template',
            'template', jsonb_build_object('name', 'tarmem_' || p_event, 'language', jsonb_build_object('code', case when p_lang = 'en' then 'en' else 'ar' end), 'components', comps));
  insert into public.email_log (recipient, template, status, channel) values (p_num, p_event, 'sent', 'whatsapp');
exception when others then
  insert into public.email_log (recipient, template, status, detail, channel) values (p_num, p_event, 'failed', left(sqlerrm, 300), 'whatsapp');
end;
$$;
revoke all on function public.wa_post(text, text, text, text[], text) from public, anon, authenticated;

create or replace function public.wa_flush() returns int
language plpgsql security definer set search_path = public as $$
declare q record; n int := 0;
begin
  for q in select * from public.wa_queue where due_at <= public.wa_now() order by id limit 50 loop
    perform public.wa_post(q.mobile, q.lang, q.event, q.params, q.path);
    delete from public.wa_queue where id = q.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.wa_flush() from public, anon, authenticated;

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

-- one call tells a person both ways: the email (010) and the same event on WhatsApp, with its specifics
create or replace function public.tell(p_email text, p_mobile text, p_lang text, p_subject text, p_lines text[], p_path text, p_cta text, p_event text, p_wa_params text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.send_email(p_email, p_lang, p_subject, p_lines, case when p_path is null then null else 'https://www.tarmem.sa/' || ltrim(p_path, '/') end, p_cta, p_event);
  perform public.send_whatsapp(p_mobile, p_lang, p_event, p_wa_params, p_path);
end;
$$;
revoke all on function public.tell(text, text, text, text, text[], text, text, text, text[]) from public, anon, authenticated;

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
  perform public.send_whatsapp(me.mobile, case when me.lang = 'en' then 'en' else 'ar' end, 'wa_test', '{}', 'settings');
  return num;
end;
$$;
revoke all on function public.whatsapp_test() from public, anon;
grant execute on function public.whatsapp_test() to authenticated;

-- 4. who is told what (as in 012), now with the specifics each template needs ------------------------
create or replace function public.notify_people() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  site constant text := 'https://www.tarmem.sa';
  who record; pr record; firm text; money text; n int;
begin
  if tg_table_name = 'projects' then
    if tg_op = 'INSERT' and new.title not like 'RLS TEST%' then
      select email, mobile, lang into who from public.profiles where id = new.owner_id;
      if who.lang = 'en' then
        perform public.tell(who.email, who.mobile, 'en', 'Your project ' || new.code || ' is posted: ' || new.title,
          array['Verified contractors can see it now. You will get a message with each new bid, and the Tarmem team is following it too.'], 'project/' || new.code, 'Open the project', 'project_posted', array[new.code, new.title]);
      else
        perform public.tell(who.email, who.mobile, 'ar', 'نُشر مشروعك ' || new.code || ': ' || new.title,
          array['مشروعك الآن أمام المقاولين الموثّقين. تصلك رسالة مع كل عرض جديد، وفريق ترميم يتابعه معك.'], 'project/' || new.code, 'افتح المشروع', 'project_posted', array[new.code, new.title]);
      end if;
    end if;

  elsif tg_table_name = 'bids' then
    if tg_op = 'INSERT' then
      select p.code, p.title, p.owner_id into pr from public.projects p where p.id = new.project_id;
      select email, mobile, lang, prefs into who from public.profiles where id = pr.owner_id;
      if coalesce((who.prefs ->> 'pBids')::boolean, true) then
        select company into firm from public.contractor_applications where user_id = new.contractor_id and status = 'verified' limit 1;
        money := to_char(new.price, 'FM999,999,999');
        if who.lang = 'en' then
          perform public.tell(who.email, who.mobile, 'en', 'New bid on your project ' || pr.code,
            array[coalesce(firm, 'A verified contractor') || ' bid SAR ' || money || ' for “' || pr.title || '”, ' || new.days || ' days.', 'Compare the bids side by side, and accept one when you are ready.'], 'project/' || pr.code, 'Compare the bids', 'new_bid',
            array[pr.code, coalesce(firm, 'A verified contractor'), money, new.days::text]);
        else
          perform public.tell(who.email, who.mobile, 'ar', 'عرض جديد على مشروعك ' || pr.code,
            array[coalesce(firm, 'مقاول موثّق') || ' قدّم عرضًا بقيمة ' || money || ' ريال على «' || pr.title || '» خلال ' || new.days || ' يوم.', 'قارن العروض جنبًا إلى جنب، واقبل ما يناسبك حين تكون جاهزًا.'], 'project/' || pr.code, 'قارن العروض', 'new_bid',
            array[pr.code, coalesce(firm, 'مقاول موثّق'), money, new.days::text]);
        end if;
      end if;
    end if;

  elsif tg_table_name = 'agreements' then
    select p.code, p.title into pr from public.projects p where p.id = new.project_id;
    money := to_char(new.amount, 'FM999,999,999');
    if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.contractor_signed_at is null and old.bid_id <> new.bid_id) then
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
      if who.lang = 'en' then
        perform public.tell(who.email, who.mobile, 'en', 'The contractor signed — ' || pr.code || ' is awarded',
          array['“' || pr.title || '” is awarded to ' || coalesce(new.contractor_name, 'the contractor') || ' for SAR ' || money || '.', 'The Tarmem team will contact you both to arrange the first payment and the start date.'], 'project/' || pr.code, 'Open the project', 'agreement_signed',
          array[pr.code, coalesce(new.contractor_name, 'the contractor'), money]);
      else
        perform public.tell(who.email, who.mobile, 'ar', 'وقّع المقاول الاتفاقية — أُسند ' || pr.code,
          array['أُسند «' || pr.title || '» إلى ' || coalesce(new.contractor_name, 'المقاول') || ' بمبلغ ' || money || ' ريال.', 'يتواصل معكما فريق ترميم لترتيب الدفعة الأولى وموعد البدء.'], 'project/' || pr.code, 'افتح المشروع', 'agreement_signed',
          array[pr.code, coalesce(new.contractor_name, 'المقاول'), money]);
      end if;
    end if;

  elsif tg_table_name = 'contractor_applications' then
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

  elsif tg_table_name = 'contact_messages' then
    -- a receipt by email only: the sender has no account, so no WhatsApp
    if tg_op = 'INSERT' and new.email is not null and new.name <> 'RLS TEST'
       and not exists (select 1 from public.email_log where recipient = new.email and template = 'contact_receipt' and at > now() - interval '1 day') then
      if new.lang = 'en' then
        perform public.send_email(new.email, 'en', 'We received your message', array['Thank you, ' || new.name || '. Your message reached the Tarmem team, and we reply within one working day.'], site, 'Visit Tarmem', 'contact_receipt');
      else
        perform public.send_email(new.email, 'ar', 'وصلتنا رسالتك', array['شكرًا ' || new.name || '. وصلت رسالتك إلى فريق ترميم، ونرد عليك خلال يوم عمل.'], site, 'زيارة ترميم', 'contact_receipt');
      end if;
    end if;

  elsif tg_table_name = 'stages' then
    if tg_op = 'UPDATE' and new.status <> old.status then
      select p.code, p.title, p.owner_id, p.contractor_id into pr from public.projects p where p.id = new.project_id;
      n := new.idx + 1;
      if new.status = 'submitted' then
        select email, mobile, lang, prefs into who from public.profiles where id = pr.owner_id;
        if coalesce((who.prefs ->> 'pStages')::boolean, true) then
          if who.lang = 'en' then
            perform public.tell(who.email, who.mobile, 'en', 'Stage ' || n || ' is ready for your approval — ' || pr.code,
              array['The contractor submitted stage ' || n || ' of “' || pr.title || '” with photos and a video.', 'Look at the work, add your own photo of it, and approve — or raise an issue.'], 'project/' || pr.code, 'Review stage ' || n, 'stage_submitted', array[n::text, pr.code]);
          else
            perform public.tell(who.email, who.mobile, 'ar', 'المرحلة ' || n || ' بانتظار اعتمادك — ' || pr.code,
              array['قدّم المقاول المرحلة ' || n || ' من «' || pr.title || '» مع الصور والفيديو.', 'اطّلع على العمل، وأضف صورتك له، واعتمد المرحلة — أو سجّل ملاحظة.'], 'project/' || pr.code, 'راجع المرحلة ' || n, 'stage_submitted', array[n::text, pr.code]);
          end if;
        end if;
      elsif new.status in ('released', 'disputed') then
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
$$;

-- 5. and now, the templates go to Meta ----------------------------------------------------------------
select public.wa_submit_templates();
