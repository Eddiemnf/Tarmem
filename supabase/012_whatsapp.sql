-- =======================================================================================
-- Tarmem — 012: the same updates on WhatsApp (built now, switched OFF until Meta's API is set up)
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run ("Run without RLS" if asked).
-- Safe to run more than once. Needs 001–011 to have been run first.
--
-- Every update the database emails (010) it can also send to the person's WhatsApp, through Meta's
-- official Cloud API, using one approved message template (category Utility, submitted 22 Sept 2026 in
-- Arabic and English) with two variables and a button:
--
--     تحديث على مشروعك في منصة ترميم:
--     {{1}}                       e.g.  عرض جديد على مشروعك P-2005
--     {{2}}                       e.g.  مؤسسة البناء المتقن قدّم عرضًا بقيمة 52,000 ريال خلال 30 يوم.
--     اضغط على الزر أدناه لعرض التفاصيل في حسابك.
--     [ افتح ]  → https://www.tarmem.sa/{{1}}
--
-- (A closing line that read like a slogan made Meta's checker file it as Marketing — five times the price.)
-- Nothing is sent until the three settings exist. AFTER Meta's setup, in this editor, with the token on its
-- own line (triple-click the line, paste; never a partial selection):
--
--   select public.set_whatsapp(trim(both from $t$
--   PASTE-THE-TOKEN-ON-THIS-LINE
--   $t$), 'YOUR_PHONE_NUMBER_ID', 'tarmem_update');
--
-- To stop:  select public.set_whatsapp(null, null, null);   Log: public.email_log (channel = 'whatsapp').
-- The token lives in app_secrets, which nothing on the website can read. Messages go only to people
-- with an account (never to contact-form senders), respecting the same settings as the emails, at
-- most 20 an hour per number; a failure never blocks the action that caused it.
-- =======================================================================================

alter table public.email_log add column if not exists channel text not null default 'email';

create or replace function public.set_whatsapp(p_token text, p_phone_id text default null, p_template text default null) returns text
language plpgsql security definer set search_path = public as $$
begin
  if p_token is null then
    delete from public.app_secrets where key in ('wa_token', 'wa_phone_id', 'wa_template');
    return 'whatsapp is off';
  end if;
  if p_phone_id !~ '^[0-9]{8,20}$' then raise exception 'The phone number ID is the long number Meta shows under the phone number, digits only.'; end if;
  if length(p_token) < 40 then raise exception 'That does not look like a permanent access token (% characters).', length(p_token); end if;
  insert into public.app_secrets (key, value) values ('wa_token', p_token), ('wa_phone_id', p_phone_id), ('wa_template', coalesce(p_template, 'tarmem_update'))
    on conflict (key) do update set value = excluded.value;
  return 'whatsapp is on, template ' || coalesce(p_template, 'tarmem_update');
end;
$$;
revoke all on function public.set_whatsapp(text, text, text) from public, anon, authenticated;

-- "055 123 4567" / "+966 55 123 4567" / "٠٥٥١٢٣٤٥٦٧"  →  966551234567 ;  anything else → null
create or replace function public.wa_number(p_mobile text) returns text
language sql immutable as $$
  select case
    when d ~ '^9665[0-9]{8}$' then d
    when d ~ '^05[0-9]{8}$' then '966' || substr(d, 2)
    when d ~ '^5[0-9]{8}$' then '966' || d
    when d ~ '^009665[0-9]{8}$' then substr(d, 3)
    else null end
  from (select regexp_replace(translate(coalesce(p_mobile, ''), '٠١٢٣٤٥٦٧٨٩', '0123456789'), '[^0-9]', '', 'g') as d) x;
$$;

create or replace function public.send_whatsapp(p_mobile text, p_lang text, p_line1 text, p_line2 text, p_path text, p_template text) returns void
language plpgsql security definer set search_path = public as $$
declare
  token text; phone_id text; tmpl text; num text; net_schema text; recent int;
begin
  select value into token from public.app_secrets where key = 'wa_token';
  if token is null or token = '' then return; end if;                    -- not switched on: silently nothing
  num := public.wa_number(p_mobile);
  if num is null then
    insert into public.email_log (recipient, template, status, detail, channel) values (coalesce(p_mobile, '?'), p_template, 'skipped', 'not a Saudi mobile number', 'whatsapp');
    return;
  end if;
  select value into phone_id from public.app_secrets where key = 'wa_phone_id';
  select value into tmpl from public.app_secrets where key = 'wa_template';
  select count(*) into recent from public.email_log where recipient = num and channel = 'whatsapp' and status = 'sent' and at > now() - interval '1 hour';
  if recent >= 20 then
    insert into public.email_log (recipient, template, status, detail, channel) values (num, p_template, 'throttled', '20 in the last hour', 'whatsapp');
    return;
  end if;
  select n.nspname into net_schema from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.proname = 'http_post' limit 1;
  if net_schema is null then
    insert into public.email_log (recipient, template, status, detail, channel) values (num, p_template, 'failed', 'pg_net is not installed', 'whatsapp');
    return;
  end if;
  execute format('select %I.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 5000)', net_schema)
    using 'https://graph.facebook.com/v25.0/' || phone_id || '/messages',   -- the version Meta's own setup page shows (Sept 2026)
          jsonb_build_object('Authorization', 'Bearer ' || token, 'Content-Type', 'application/json'),
          jsonb_build_object('messaging_product', 'whatsapp', 'to', num, 'type', 'template',
            'template', jsonb_build_object('name', coalesce(tmpl, 'tarmem_update'), 'language', jsonb_build_object('code', case when p_lang = 'en' then 'en' else 'ar' end),
              'components', jsonb_build_array(
                jsonb_build_object('type', 'body', 'parameters', jsonb_build_array(
                  jsonb_build_object('type', 'text', 'text', left(regexp_replace(p_line1, '\s+', ' ', 'g'), 200)),
                  jsonb_build_object('type', 'text', 'text', left(regexp_replace(p_line2, '\s+', ' ', 'g'), 400)))),
                jsonb_build_object('type', 'button', 'sub_type', 'url', 'index', '0', 'parameters', jsonb_build_array(
                  jsonb_build_object('type', 'text', 'text', ltrim(coalesce(p_path, ''), '/')))))));
  insert into public.email_log (recipient, template, status, channel) values (num, p_template, 'sent', 'whatsapp');
exception when others then
  insert into public.email_log (recipient, template, status, detail, channel) values (coalesce(num, p_mobile, '?'), p_template, 'failed', left(sqlerrm, 300), 'whatsapp');
end;
$$;
revoke all on function public.send_whatsapp(text, text, text, text, text, text) from public, anon, authenticated;

-- One call tells a person both ways: the email (010) and, when switched on, the same thing on WhatsApp.
create or replace function public.tell(p_email text, p_mobile text, p_lang text, p_subject text, p_lines text[], p_path text, p_cta text, p_template text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.send_email(p_email, p_lang, p_subject, p_lines, case when p_path is null then null else 'https://www.tarmem.sa/' || ltrim(p_path, '/') end, p_cta, p_template);
  perform public.send_whatsapp(p_mobile, p_lang, p_subject, coalesce(p_lines[1], ''), p_path, p_template);
end;
$$;
revoke all on function public.tell(text, text, text, text, text[], text, text, text) from public, anon, authenticated;

-- who is told what (as in 010), now through `tell`, so every person with a mobile can hear it on WhatsApp too
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
          array['Verified contractors can see it now. You will get a message with each new bid, and the Tarmem team is following it too.'], 'project/' || new.code, 'Open the project', 'project_posted');
      else
        perform public.tell(who.email, who.mobile, 'ar', 'نُشر مشروعك ' || new.code || ': ' || new.title,
          array['مشروعك الآن أمام المقاولين الموثّقين. تصلك رسالة مع كل عرض جديد، وفريق ترميم يتابعه معك.'], 'project/' || new.code, 'افتح المشروع', 'project_posted');
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
            array[coalesce(firm, 'A verified contractor') || ' bid SAR ' || money || ' for “' || pr.title || '”, ' || new.days || ' days.', 'Compare the bids side by side, and accept one when you are ready.'], 'project/' || pr.code, 'Compare the bids', 'new_bid');
        else
          perform public.tell(who.email, who.mobile, 'ar', 'عرض جديد على مشروعك ' || pr.code,
            array[coalesce(firm, 'مقاول موثّق') || ' قدّم عرضًا بقيمة ' || money || ' ريال على «' || pr.title || '» خلال ' || new.days || ' يوم.', 'قارن العروض جنبًا إلى جنب، واقبل ما يناسبك حين تكون جاهزًا.'], 'project/' || pr.code, 'قارن العروض', 'new_bid');
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
          array['The homeowner accepted your bid of SAR ' || money || ' on “' || pr.title || '”.', 'Review the agreement and sign it; the project is awarded to you the moment you do.'], 'project/' || pr.code, 'Review and sign the agreement', 'agreement_accepted');
      else
        perform public.tell(who.email, who.mobile, 'ar', 'اختار صاحب المنزل عرضك — ' || pr.code,
          array['قُبل عرضك بقيمة ' || money || ' ريال على «' || pr.title || '».', 'راجع الاتفاقية ووقّعها؛ يُسند المشروع إليك فور توقيعك.'], 'project/' || pr.code, 'راجع الاتفاقية ووقّع', 'agreement_accepted');
      end if;
    elsif tg_op = 'UPDATE' and new.contractor_signed_at is not null and old.contractor_signed_at is null then
      select email, mobile, lang into who from public.profiles where id = new.homeowner_id;
      if who.lang = 'en' then
        perform public.tell(who.email, who.mobile, 'en', 'The contractor signed — ' || pr.code || ' is awarded',
          array['“' || pr.title || '” is awarded to ' || coalesce(new.contractor_name, 'the contractor') || ' for SAR ' || money || '.', 'The Tarmem team will contact you both to arrange the first payment and the start date.'], 'project/' || pr.code, 'Open the project', 'agreement_signed');
      else
        perform public.tell(who.email, who.mobile, 'ar', 'وقّع المقاول الاتفاقية — أُسند ' || pr.code,
          array['أُسند «' || pr.title || '» إلى ' || coalesce(new.contractor_name, 'المقاول') || ' بمبلغ ' || money || ' ريال.', 'يتواصل معكما فريق ترميم لترتيب الدفعة الأولى وموعد البدء.'], 'project/' || pr.code, 'افتح المشروع', 'agreement_signed');
      end if;
    end if;

  elsif tg_table_name = 'contractor_applications' then
    if tg_op = 'UPDATE' and new.status = 'verified' and old.status is distinct from 'verified' and new.company <> 'RLS TEST' then
      select email, mobile, lang into who from public.profiles where id = new.user_id;
      if who.email is null then who := (select r from (select new.email as email, new.mobile as mobile, new.lang as lang) r); end if;
      if who.lang = 'en' then
        perform public.tell(who.email, who.mobile, 'en', 'Your Tarmem account is verified',
          array['“' || new.company || '” is verified and ready to use.', case when new.user_id is null then 'Create your account on the contractor page with this email to start.' else 'Sign in to browse open projects and send your bids.' end],
          case when new.user_id is null then 'join' else 'signin' end, case when new.user_id is null then 'Create your account' else 'Sign in' end, 'application_verified');
      else
        perform public.tell(who.email, who.mobile, 'ar', 'تم توثيق حسابك في ترميم',
          array['حساب «' || new.company || '» موثّق وجاهز للاستخدام.', case when new.user_id is null then 'أنشئ حسابك من صفحة انضمام المقاولين بهذا البريد لتبدأ.' else 'سجّل دخولك لتصفّح المشاريع المفتوحة وتقديم عروضك.' end],
          case when new.user_id is null then 'join' else 'signin' end, case when new.user_id is null then 'أنشئ حسابك' else 'سجّل دخولك' end, 'application_verified');
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
              array['The contractor submitted stage ' || n || ' of “' || pr.title || '” with photos and a video.', 'Look at the work, add your own photo of it, and approve — or raise an issue.'], 'project/' || pr.code, 'Review stage ' || n, 'stage_submitted');
          else
            perform public.tell(who.email, who.mobile, 'ar', 'المرحلة ' || n || ' بانتظار اعتمادك — ' || pr.code,
              array['قدّم المقاول المرحلة ' || n || ' من «' || pr.title || '» مع الصور والفيديو.', 'اطّلع على العمل، وأضف صورتك له، واعتمد المرحلة — أو سجّل ملاحظة.'], 'project/' || pr.code, 'راجع المرحلة ' || n, 'stage_submitted');
          end if;
        end if;
      elsif new.status in ('released', 'disputed') then
        select email, mobile, lang, prefs into who from public.profiles where id = pr.contractor_id;
        if coalesce((who.prefs ->> 'pStages')::boolean, true) then
          if who.lang = 'en' then
            perform public.tell(who.email, who.mobile, 'en', case when new.status = 'released' then 'Stage ' || n || ' approved — ' || pr.code else 'An issue was raised on stage ' || n || ' — ' || pr.code end,
              array[case when new.status = 'released' then 'The homeowner approved stage ' || n || ' of “' || pr.title || '”; its payment is released.' else 'The homeowner raised an issue on stage ' || n || ' of “' || pr.title || '”: ' || coalesce(new.reason, '') end],
              'project/' || pr.code, 'Open the project', 'stage_' || new.status);
          else
            perform public.tell(who.email, who.mobile, 'ar', case when new.status = 'released' then 'اعتُمدت المرحلة ' || n || ' — ' || pr.code else 'ملاحظة على المرحلة ' || n || ' — ' || pr.code end,
              array[case when new.status = 'released' then 'اعتمد صاحب المنزل المرحلة ' || n || ' من «' || pr.title || '»، وصُرفت دفعتها.' else 'سجّل صاحب المنزل ملاحظة على المرحلة ' || n || ' من «' || pr.title || '»: ' || coalesce(new.reason, '') end],
              'project/' || pr.code, 'افتح المشروع', 'stage_' || new.status);
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
