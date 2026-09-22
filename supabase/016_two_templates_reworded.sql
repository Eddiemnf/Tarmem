-- =======================================================================================
-- Tarmem — 016: two templates reworded for Meta's Arabic checker, resubmitted under new names
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run. Safe to run more than once
-- (a second run re-submits the two; Meta answers "already exists", which is harmless).
--
-- Of the eighteen submitted by 014, Meta filed two Arabic ones as Marketing: "project posted" (its second
-- sentence read like a pitch for the service) and the test message (nothing tied it to an account). Both are
-- reworded as a confirmation of the person's own transaction — "confirmation… status: open for bids", and
-- "the WhatsApp number {{1}} linked to your account is confirmed" — and resubmitted in both languages under
-- new names (a Meta template name cannot be reused for a while once deleted). The old two are deleted.
-- =======================================================================================

create or replace function public.wa_template_specs() returns jsonb
language sql immutable as $$
select jsonb_build_array(
  jsonb_build_object('event', 'project_posted', 'name', 'tarmem_project_posted_2',
    'ar', jsonb_build_object('body', 'تأكيد نشر مشروعك رقم {{1}} في ترميم: «{{2}}». حالة المشروع الآن: مفتوح لاستقبال العروض، وتصلك رسالة عند وصول كل عرض.', 'samples', jsonb_build_array('P-2001', 'تجديد مطبخ 4×5'), 'button', 'افتح المشروع', 'path', 'project/P-2001'),
    'en', jsonb_build_object('body', 'Confirmation: your project {{1}} is posted on Tarmem: {{2}}. Its status is now open for bids, and you get a message when each bid arrives.', 'samples', jsonb_build_array('P-2001', 'Kitchen renovation 4x5'), 'button', 'Open the project', 'path', 'project/P-2001')),
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
  jsonb_build_object('event', 'wa_test', 'name', 'tarmem_wa_test_2',
    'ar', jsonb_build_object('body', 'تم التحقق من رقم واتساب {{1}} المرتبط بحسابك في ترميم. تصلك عليه تحديثات مشاريعك من الآن. لا يلزمك الرد على هذه الرسالة.', 'samples', jsonb_build_array('+966 55 123 4567'), 'button', 'الإعدادات', 'path', 'settings'),
    'en', jsonb_build_object('body', 'The WhatsApp number {{1}} linked to your Tarmem account is confirmed. Your project updates will arrive here from now on. No reply is needed.', 'samples', jsonb_build_array('+966 55 123 4567'), 'button', 'Settings', 'path', 'settings'))
);
$$;

-- the Meta name of an event's template: as the spec says, or tarmem_<event>
create or replace function public.wa_template_name(p_event text) returns text
language sql stable as $$
  select coalesce(s ->> 'name', 'tarmem_' || p_event) from jsonb_array_elements(public.wa_template_specs()) s where s ->> 'event' = p_event limit 1
$$;

-- submit all, or only the events named
create or replace function public.wa_submit_templates(p_waba_id text default '2162520270999056', p_events text[] default null) returns text
language plpgsql security definer set search_path = public as $$
declare
  token text; net_schema text; spec jsonb; lang text; t jsonb; comps jsonb; body jsonb; n int := 0; tname text;
begin
  select value into token from public.app_secrets where key = 'wa_token';
  if token is null or token = '' then raise exception 'WhatsApp is not switched on yet: run set_whatsapp first'; end if;
  select nsp.nspname into net_schema from pg_proc p join pg_namespace nsp on nsp.oid = p.pronamespace where p.proname = 'http_post' limit 1;
  if net_schema is null then raise exception 'pg_net is not installed'; end if;
  for spec in select * from jsonb_array_elements(public.wa_template_specs()) loop
    if p_events is not null and not (spec ->> 'event') = any (p_events) then continue; end if;
    tname := public.wa_template_name(spec ->> 'event');
    foreach lang in array array['ar', 'en'] loop
      t := spec -> lang;
      comps := jsonb_build_array(
        jsonb_build_object('type', 'BODY', 'text', t ->> 'body')
          || case when jsonb_array_length(t -> 'samples') > 0 then jsonb_build_object('example', jsonb_build_object('body_text', jsonb_build_array(t -> 'samples'))) else '{}'::jsonb end,
        jsonb_build_object('type', 'BUTTONS', 'buttons', jsonb_build_array(
          jsonb_build_object('type', 'URL', 'text', t ->> 'button', 'url', 'https://www.tarmem.sa/{{1}}', 'example', jsonb_build_array('https://www.tarmem.sa/' || (t ->> 'path'))))));
      body := jsonb_build_object('name', tname, 'language', lang, 'category', 'UTILITY', 'allow_category_change', false, 'components', comps);
      execute format('select %I.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 8000)', net_schema)
        using 'https://graph.facebook.com/v25.0/' || p_waba_id || '/message_templates',
              jsonb_build_object('Authorization', 'Bearer ' || token, 'Content-Type', 'application/json'), body;
      insert into public.email_log (recipient, template, status, detail, channel) values ('meta', tname, 'submitted', lang, 'whatsapp');
      n := n + 1;
    end loop;
  end loop;
  return n || ' templates sent to Meta. Its answers: select created, status_code, content from net._http_response order by created desc limit 20;';
end;
$$;
revoke all on function public.wa_submit_templates(text, text[]) from public, anon, authenticated;
drop function if exists public.wa_submit_templates(text);

-- sending uses the spec's name
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
  select coalesce(jsonb_agg(jsonb_build_object('type', 'text', 'text', left(trim(regexp_replace(coalesce(u.x, ''), '\s+', ' ', 'g')), 300)) order by u.i), '[]'::jsonb)
    into params from unnest(coalesce(p_params, '{}')) with ordinality as u(x, i);
  comps := case when jsonb_array_length(params) > 0 then jsonb_build_array(jsonb_build_object('type', 'body', 'parameters', params)) else '[]'::jsonb end
        || jsonb_build_array(jsonb_build_object('type', 'button', 'sub_type', 'url', 'index', '0', 'parameters', jsonb_build_array(
             jsonb_build_object('type', 'text', 'text', ltrim(coalesce(p_path, ''), '/')))));
  execute format('select %I.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 5000)', net_schema)
    using 'https://graph.facebook.com/v25.0/' || phone_id || '/messages',
          jsonb_build_object('Authorization', 'Bearer ' || token, 'Content-Type', 'application/json'),
          jsonb_build_object('messaging_product', 'whatsapp', 'to', p_num, 'type', 'template',
            'template', jsonb_build_object('name', public.wa_template_name(p_event), 'language', jsonb_build_object('code', case when p_lang = 'en' then 'en' else 'ar' end), 'components', comps));
  insert into public.email_log (recipient, template, status, channel) values (p_num, p_event, 'sent', 'whatsapp');
exception when others then
  insert into public.email_log (recipient, template, status, detail, channel) values (p_num, p_event, 'failed', left(sqlerrm, 300), 'whatsapp');
end;
$$;
revoke all on function public.wa_post(text, text, text, text[], text) from public, anon, authenticated;

-- the test message now names the number it confirms
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
  perform public.send_whatsapp(me.mobile, case when me.lang = 'en' then 'en' else 'ar' end, 'wa_test',
    array['+' || substr(num, 1, 3) || ' ' || substr(num, 4, 2) || ' ' || substr(num, 6, 3) || ' ' || substr(num, 9)], 'settings');
  return num;
end;
$$;
revoke all on function public.whatsapp_test() from public, anon;
grant execute on function public.whatsapp_test() to authenticated;

-- out with the two Meta filed as Marketing, in with their rewording
select public.wa_delete_template('tarmem_project_posted');
select public.wa_delete_template('tarmem_wa_test');
select public.wa_submit_templates(p_events := array['project_posted', 'wa_test']);
