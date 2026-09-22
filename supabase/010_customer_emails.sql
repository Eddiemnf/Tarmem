-- =======================================================================================
-- Tarmem — 010: emails to customers and contractors
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run ("Run without RLS" if asked).
-- Safe to run more than once. Needs 001–009 to have been run first, and the domain verified in Resend.
--
-- Who is told what, by the database itself the moment it happens:
--   a project is posted            → its owner:        "your project is posted"
--   a bid arrives                  → the project owner: "new bid from <company>, <price>"      (settings: bids)
--   the owner signs the agreement  → the contractor:    "your bid was accepted — review and sign"
--   the contractor counter-signs   → the owner:         "the contractor signed — awarded"
--   an application is verified     → the contractor:    "your account is verified — sign in"
--   a contact message with an email→ the sender:        "we received your message"
--   a stage moves                  → the other party    (settings: stages; only once payments are live)
-- Nobody's contact details are ever put in somebody else's email. Every send is written to
-- email_log; a failure never blocks the action that caused it. At most 20 emails an hour reach any
-- one address, and a contact-form receipt goes to an address at most once a day.
-- =======================================================================================

create table if not exists public.email_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  recipient  text not null,
  template   text not null,
  status     text not null,
  detail     text
);
create index if not exists email_log_recipient_idx on public.email_log (recipient, at desc);
alter table public.email_log enable row level security;
drop policy if exists "admins read the email log" on public.email_log;
create policy "admins read the email log" on public.email_log for select to authenticated using (public.is_admin());
revoke all on public.email_log from anon, authenticated;
grant select on public.email_log to authenticated;

-- the letter -------------------------------------------------------------------------------
create or replace function public.email_html(p_lang text, p_subject text, p_lines text[], p_cta_url text, p_cta_label text) returns text
language sql immutable as $$
  select '<div dir="' || case when p_lang = 'en' then 'ltr' else 'rtl' end || '" style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.9;color:#14113F;max-width:560px">'
      || '<p style="font-size:18px;font-weight:600;color:#1B1464;margin:0 0 14px">' || replace(p_subject, '<', '&lt;') || '</p>'
      || coalesce((select string_agg('<p style="margin:0 0 10px">' || replace(l, '<', '&lt;') || '</p>', '') from unnest(p_lines) l), '')
      || case when p_cta_url is null then '' else
         '<p style="margin:22px 0"><a href="' || p_cta_url || '" style="background:#FF5A3C;color:#fff;padding:11px 20px;border-radius:10px;text-decoration:none;font-weight:600">' || p_cta_label || '</a></p>' end
      || '<p style="margin-top:28px;font-size:12.5px;color:#6B6986">'
      || case when p_lang = 'en' then 'An automatic message from Tarmem · <a href="https://www.tarmem.sa/settings" style="color:#6B6986">notification settings</a>'
                                 else 'رسالة تلقائية من ترميم · <a href="https://www.tarmem.sa/settings" style="color:#6B6986">إعدادات التنبيهات</a>' end
      || '</p></div>';
$$;

-- the sending ------------------------------------------------------------------------------
create or replace function public.send_email(p_to text, p_lang text, p_subject text, p_lines text[], p_cta_url text, p_cta_label text, p_template text) returns void
language plpgsql security definer set search_path = public as $$
declare
  api_key text; sender text; net_schema text; recent int;
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
  execute format('select %I.http_post(url := $1, headers := $2, body := $3, timeout_milliseconds := 5000)', net_schema)
    using 'https://api.resend.com/emails',
          jsonb_build_object('Authorization', 'Bearer ' || api_key, 'Content-Type', 'application/json'),
          jsonb_build_object('from', coalesce(sender, 'Tarmem <alerts@tarmem.sa>'), 'to', array[p_to], 'subject', p_subject,
                             'html', public.email_html(p_lang, p_subject, p_lines, p_cta_url, p_cta_label));
  insert into public.email_log (recipient, template, status) values (p_to, p_template, 'sent');
exception when others then
  insert into public.email_log (recipient, template, status, detail) values (coalesce(p_to, '?'), p_template, 'failed', left(sqlerrm, 300));
end;
$$;
revoke all on function public.send_email(text, text, text, text[], text, text, text) from public, anon, authenticated;

-- who is told what -------------------------------------------------------------------------
create or replace function public.notify_people() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  site constant text := 'https://www.tarmem.sa';
  who record;            -- email, lang, prefs of the person being written to
  pr  record;            -- the project
  firm text; money text; stage text; n int;
  wants boolean;
begin
  if tg_table_name = 'projects' then
  -- a posted project: its owner
    if tg_op = 'INSERT' then
    if new.title like 'RLS TEST%' then return new; end if;
    select email, lang into who from public.profiles where id = new.owner_id;
    if who.lang = 'en' then
      perform public.send_email(who.email, 'en', 'Your project ' || new.code || ' is posted: ' || new.title,
        array['Verified contractors can see it now. You will get an email with each new bid, and the Tarmem team is following it too.'],
        site || '/project/' || new.code, 'Open the project', 'project_posted');
    else
      perform public.send_email(who.email, 'ar', 'نُشر مشروعك ' || new.code || ': ' || new.title,
        array['مشروعك الآن أمام المقاولين الموثّقين. تصلك رسالة مع كل عرض جديد، وفريق ترميم يتابعه معك.'],
        site || '/project/' || new.code, 'افتح المشروع', 'project_posted');
    end if;

    end if;
  elsif tg_table_name = 'bids' then
  -- a bid: the project's owner (who chose, in settings, whether to hear about bids)
    if tg_op = 'INSERT' then
    select p.code, p.title, p.owner_id into pr from public.projects p where p.id = new.project_id;
    select email, lang, prefs into who from public.profiles where id = pr.owner_id;
    wants := coalesce((who.prefs ->> 'pBids')::boolean, true);
    if not wants then return new; end if;
    select company into firm from public.contractor_applications where user_id = new.contractor_id and status = 'verified' limit 1;
    money := to_char(new.price, 'FM999,999,999');
    if who.lang = 'en' then
      perform public.send_email(who.email, 'en', 'New bid on your project ' || pr.code,
        array[coalesce(firm, 'A verified contractor') || ' bid SAR ' || money || ' for “' || pr.title || '”, ' || new.days || ' days.', 'Compare the bids side by side, and accept one when you are ready.'],
        site || '/project/' || pr.code, 'Compare the bids', 'new_bid');
    else
      perform public.send_email(who.email, 'ar', 'عرض جديد على مشروعك ' || pr.code,
        array[coalesce(firm, 'مقاول موثّق') || ' قدّم عرضًا بقيمة ' || money || ' ريال على «' || pr.title || '» خلال ' || new.days || ' يوم.', 'قارن العروض جنبًا إلى جنب، واقبل ما يناسبك حين تكون جاهزًا.'],
        site || '/project/' || pr.code, 'قارن العروض', 'new_bid');
    end if;

    end if;
  elsif tg_table_name = 'agreements' then
  -- the owner signed (or switched to another bid): the contractor whose bid it is
    if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.contractor_signed_at is null and old.bid_id <> new.bid_id) then
    select p.code, p.title into pr from public.projects p where p.id = new.project_id;
    select email, lang into who from public.profiles where id = new.contractor_id;
    money := to_char(new.amount, 'FM999,999,999');
    if who.lang = 'en' then
      perform public.send_email(who.email, 'en', 'Your bid was accepted — ' || pr.code,
        array['The homeowner accepted your bid of SAR ' || money || ' on “' || pr.title || '”.', 'Review the agreement and sign it; the project is awarded to you the moment you do.'],
        site || '/project/' || pr.code, 'Review and sign the agreement', 'agreement_accepted');
    else
      perform public.send_email(who.email, 'ar', 'اختار صاحب المنزل عرضك — ' || pr.code,
        array['قُبل عرضك بقيمة ' || money || ' ريال على «' || pr.title || '».', 'راجع الاتفاقية ووقّعها؛ يُسند المشروع إليك فور توقيعك.'],
        site || '/project/' || pr.code, 'راجع الاتفاقية ووقّع', 'agreement_accepted');
    end if;

  -- the contractor counter-signed: the owner
    elsif tg_op = 'UPDATE' and new.contractor_signed_at is not null and old.contractor_signed_at is null then
    select p.code, p.title into pr from public.projects p where p.id = new.project_id;
    select email, lang into who from public.profiles where id = new.homeowner_id;
    money := to_char(new.amount, 'FM999,999,999');
    if who.lang = 'en' then
      perform public.send_email(who.email, 'en', 'The contractor signed — ' || pr.code || ' is awarded',
        array['“' || pr.title || '” is awarded to ' || coalesce(new.contractor_name, 'the contractor') || ' for SAR ' || money || '.', 'The Tarmem team will contact you both to arrange the first payment and the start date.'],
        site || '/project/' || pr.code, 'Open the project', 'agreement_signed');
    else
      perform public.send_email(who.email, 'ar', 'وقّع المقاول الاتفاقية — أُسند ' || pr.code,
        array['أُسند «' || pr.title || '» إلى ' || coalesce(new.contractor_name, 'المقاول') || ' بمبلغ ' || money || ' ريال.', 'يتواصل معكما فريق ترميم لترتيب الدفعة الأولى وموعد البدء.'],
        site || '/project/' || pr.code, 'افتح المشروع', 'agreement_signed');
    end if;

    end if;
  elsif tg_table_name = 'contractor_applications' then
  -- an application verified: the contractor (their account email if they have one, else the one on the form)
    if tg_op = 'UPDATE' and new.status = 'verified' and old.status is distinct from 'verified' then
    if new.company = 'RLS TEST' then return new; end if;
    select email, lang into who from public.profiles where id = new.user_id;
    if who.email is null then who := (select r from (select new.email as email, new.lang as lang) r); end if;
    if who.lang = 'en' then
      perform public.send_email(who.email, 'en', 'Your Tarmem account is verified',
        array['“' || new.company || '” is verified and ready to use.', case when new.user_id is null then 'Create your account on the contractor page with this email to start.' else 'Sign in to browse open projects and send your bids.' end],
        site || case when new.user_id is null then '/join' else '/signin' end, case when new.user_id is null then 'Create your account' else 'Sign in' end, 'application_verified');
    else
      perform public.send_email(who.email, 'ar', 'تم توثيق حسابك في ترميم',
        array['حساب «' || new.company || '» موثّق وجاهز للاستخدام.', case when new.user_id is null then 'أنشئ حسابك من صفحة انضمام المقاولين بهذا البريد لتبدأ.' else 'سجّل دخولك لتصفّح المشاريع المفتوحة وتقديم عروضك.' end],
        site || case when new.user_id is null then '/join' else '/signin' end, case when new.user_id is null then 'أنشئ حسابك' else 'سجّل دخولك' end, 'application_verified');
    end if;

    end if;
  elsif tg_table_name = 'contact_messages' then
  -- a contact message with an email: a receipt to the sender, at most once a day per address
    if tg_op = 'INSERT' and new.email is not null then
    if new.name = 'RLS TEST' then return new; end if;
    if exists (select 1 from public.email_log where recipient = new.email and template = 'contact_receipt' and at > now() - interval '1 day') then return new; end if;
    if new.lang = 'en' then
      perform public.send_email(new.email, 'en', 'We received your message',
        array['Thank you, ' || new.name || '. Your message reached the Tarmem team, and we reply within one working day.'], site, 'Visit Tarmem', 'contact_receipt');
    else
      perform public.send_email(new.email, 'ar', 'وصلتنا رسالتك',
        array['شكرًا ' || new.name || '. وصلت رسالتك إلى فريق ترميم، ونرد عليك خلال يوم عمل.'], site, 'زيارة ترميم', 'contact_receipt');
    end if;

    end if;
  elsif tg_table_name = 'stages' then
  -- a stage moved: the other party (who chose, in settings, whether to hear about stages)
    if tg_op = 'UPDATE' and new.status <> old.status then
    select p.code, p.title, p.owner_id, p.contractor_id into pr from public.projects p where p.id = new.project_id;
    n := new.idx + 1;
    if new.status = 'submitted' then
      select email, lang, prefs into who from public.profiles where id = pr.owner_id;
      if not coalesce((who.prefs ->> 'pStages')::boolean, true) then return new; end if;
      if who.lang = 'en' then
        perform public.send_email(who.email, 'en', 'Stage ' || n || ' is ready for your approval — ' || pr.code,
          array['The contractor submitted stage ' || n || ' of “' || pr.title || '” with photos and a video.', 'Look at the work, add your own photo of it, and approve — or raise an issue.'],
          site || '/project/' || pr.code, 'Review stage ' || n, 'stage_submitted');
      else
        perform public.send_email(who.email, 'ar', 'المرحلة ' || n || ' بانتظار اعتمادك — ' || pr.code,
          array['قدّم المقاول المرحلة ' || n || ' من «' || pr.title || '» مع الصور والفيديو.', 'اطّلع على العمل، وأضف صورتك له، واعتمد المرحلة — أو سجّل ملاحظة.'],
          site || '/project/' || pr.code, 'راجع المرحلة ' || n, 'stage_submitted');
      end if;
    elsif new.status in ('released', 'disputed') then
      select email, lang, prefs into who from public.profiles where id = pr.contractor_id;
      if not coalesce((who.prefs ->> 'pStages')::boolean, true) then return new; end if;
      if who.lang = 'en' then
        perform public.send_email(who.email, 'en', case when new.status = 'released' then 'Stage ' || n || ' approved — ' || pr.code else 'An issue was raised on stage ' || n || ' — ' || pr.code end,
          array[case when new.status = 'released' then 'The homeowner approved stage ' || n || ' of “' || pr.title || '”; its payment is released.' else 'The homeowner raised an issue on stage ' || n || ' of “' || pr.title || '”: ' || coalesce(new.reason, '') end],
          site || '/project/' || pr.code, 'Open the project', 'stage_' || new.status);
      else
        perform public.send_email(who.email, 'ar', case when new.status = 'released' then 'اعتُمدت المرحلة ' || n || ' — ' || pr.code else 'ملاحظة على المرحلة ' || n || ' — ' || pr.code end,
          array[case when new.status = 'released' then 'اعتمد صاحب المنزل المرحلة ' || n || ' من «' || pr.title || '»، وصُرفت دفعتها.' else 'سجّل صاحب المنزل ملاحظة على المرحلة ' || n || ' من «' || pr.title || '»: ' || coalesce(new.reason, '') end],
          site || '/project/' || pr.code, 'افتح المشروع', 'stage_' || new.status);
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

drop trigger if exists notify_project_posted on public.projects;
create trigger notify_project_posted after insert on public.projects for each row execute function public.notify_people();
drop trigger if exists notify_new_bid on public.bids;
create trigger notify_new_bid after insert on public.bids for each row execute function public.notify_people();
drop trigger if exists notify_agreement on public.agreements;
create trigger notify_agreement after insert or update on public.agreements for each row execute function public.notify_people();
drop trigger if exists notify_application_verified on public.contractor_applications;
create trigger notify_application_verified after update on public.contractor_applications for each row execute function public.notify_people();
drop trigger if exists notify_contact_receipt on public.contact_messages;
create trigger notify_contact_receipt after insert on public.contact_messages for each row execute function public.notify_people();
drop trigger if exists notify_stage on public.stages;
create trigger notify_stage after update on public.stages for each row execute function public.notify_people();

-- the team's own alert about a bid now names the project and the company, instead of an id
create or replace function public.alert_on_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare subject text; lines text[]; money text; code text; firm text;
begin
  if tg_table_name = 'projects' then
    if coalesce(new.title, '') like 'RLS TEST%' then return new; end if;
    money := to_char(new.budget_min, 'FM999,999,999') || ' – ' || to_char(new.budget_max, 'FM999,999,999') || ' ريال';
    subject := 'مشروع جديد ' || new.code || ': ' || new.title;
    lines := array['المدينة: ' || new.city, 'التخصص: ' || new.trade, 'الميزانية: ' || money, 'الوصف: ' || left(new.description, 300)];
  elsif tg_table_name = 'bids' then
    select p.code into code from public.projects p where p.id = new.project_id;
    select company into firm from public.contractor_applications where user_id = new.contractor_id and status = 'verified' limit 1;
    subject := 'عرض جديد على ' || coalesce(code, 'مشروع') || ' بقيمة ' || to_char(new.price, 'FM999,999,999') || ' ريال';
    lines := array['المقاول: ' || coalesce(firm, '—'), 'المدة: ' || new.days || ' يوم', coalesce('ملاحظات المقاول: ' || left(new.note, 300), '')];
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
