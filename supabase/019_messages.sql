-- =======================================================================================
-- Tarmem — 019: messages inside a project, between the homeowner and a contractor — kept, delivered, and answered
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run. Safe to run more than once. Needs 001–018.
--
-- The design's project page has a Messages tab. Until now it kept messages in the browser only. Now every message
-- is a row here, a thread is one project and one contractor (a homeowner may have a thread with each bidder, and
-- with the contractor the project is awarded to), and the other party is told by email and WhatsApp with a snippet,
-- unless they switched "new messages" off on their settings page. Contact details never appear: the homeowner is
-- named by first name, the contractor by company. The last line submits the WhatsApp template for it.
-- =======================================================================================

create table if not exists public.project_messages (
  id             bigint generated always as identity primary key,
  project_id     uuid not null references public.projects (id) on delete cascade,
  contractor_id  uuid not null references auth.users (id) on delete cascade,      -- the thread's contractor
  from_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body           text not null check (char_length(trim(body)) between 1 and 2000),
  created_at     timestamptz not null default now(),
  read_at        timestamptz                                                      -- set by the other party
);
create index if not exists project_messages_thread_idx on public.project_messages (project_id, contractor_id, id);
alter table public.project_messages enable row level security;

-- a thread exists between a project's owner and a contractor who has a live bid on it, or is awarded it
create or replace function public.can_message(p_project uuid, p_contractor uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.projects p where p.id = p_project and p.status in ('open', 'active', 'completed')
      and (p.contractor_id = p_contractor
        or exists (select 1 from public.bids b where b.project_id = p_project and b.contractor_id = p_contractor and b.status <> 'withdrawn')))
$$;

drop policy if exists "the two parties read their thread" on public.project_messages;
create policy "the two parties read their thread" on public.project_messages for select to authenticated
  using (public.owns_project(project_id) or contractor_id = auth.uid());
drop policy if exists "the two parties write their thread" on public.project_messages;
create policy "the two parties write their thread" on public.project_messages for insert to authenticated
  with check (from_id = auth.uid() and public.can_message(project_id, contractor_id)
    and (public.owns_project(project_id) or (contractor_id = auth.uid() and public.is_verified_contractor())));
revoke all on public.project_messages from anon, authenticated;
grant select, insert on public.project_messages to authenticated;

-- the reader marks what the other side wrote as read
create or replace function public.mark_messages_read(p_project uuid, p_contractor uuid) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then return 0; end if;
  if not (public.owns_project(p_project) or p_contractor = auth.uid()) then return 0; end if;
  update public.project_messages set read_at = now() where project_id = p_project and contractor_id = p_contractor and from_id <> auth.uid() and read_at is null;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.mark_messages_read(uuid, uuid) from public, anon;
grant execute on function public.mark_messages_read(uuid, uuid) to authenticated;

create or replace function public.wa_template_specs() returns jsonb
language sql immutable as $$
select jsonb_build_array(
  jsonb_build_object('event', 'project_posted', 'name', 'tarmem_project_posted_2',
    'ar', jsonb_build_object('body', 'تأكيد نشر مشروعك رقم {{1}} في ترميم: «{{2}}». حالة المشروع الآن: مفتوح لاستقبال العطاءات. تصلك رسالة عند وصول كل عطاء.', 'samples', jsonb_build_array('P-2001', 'تجديد مطبخ 4×5'), 'button', 'افتح المشروع', 'path', 'project/P-2001'),
    'en', jsonb_build_object('body', 'Confirmation: your project {{1}} is posted on Tarmem: {{2}}. Its status is now open for bids, and you get a message when each bid arrives.', 'samples', jsonb_build_array('P-2001', 'Kitchen renovation 4x5'), 'button', 'Open the project', 'path', 'project/P-2001')),
  jsonb_build_object('event', 'new_bid', 'name', 'tarmem_new_bid_3',
    'ar', jsonb_build_object('body', 'تحديث حالة مشروعك رقم {{1}} في ترميم: تم استلام العطاء رقم {{2}} من {{3}} بقيمة {{4}} ريال ومدة تنفيذ {{5}} يوم. التفاصيل في صفحة المشروع.', 'samples', jsonb_build_array('P-2001', '3', 'مؤسسة البناء المتقن', '52,000', '30'), 'button', 'افتح المشروع', 'path', 'project/P-2001'),
    'en', jsonb_build_object('body', 'Status update for your project {{1}} on Tarmem: bid number {{2}} was received from {{3}}, SAR {{4}}, {{5}} days. The details are on the project page.', 'samples', jsonb_build_array('P-2001', '3', 'Build Co', '52,000', '30'), 'button', 'Open the project', 'path', 'project/P-2001')),
  jsonb_build_object('event', 'agreement_accepted',
    'ar', jsonb_build_object('body', 'اختار صاحب المنزل عرضك على المشروع {{1}} في ترميم بقيمة {{2}} ريال. راجع الاتفاقية ووقّعها؛ يُسند المشروع إليك فور توقيعك.', 'samples', jsonb_build_array('P-2001', '52,000'), 'button', 'راجع الاتفاقية', 'path', 'project/P-2001'),
    'en', jsonb_build_object('body', 'The homeowner accepted your bid on project {{1}} on Tarmem, SAR {{2}}. Review and sign the agreement; the project is awarded to you the moment you do.', 'samples', jsonb_build_array('P-2001', '52,000'), 'button', 'Review the agreement', 'path', 'project/P-2001')),
  jsonb_build_object('event', 'agreement_signed', 'name', 'tarmem_agreement_signed_2',
    'ar', jsonb_build_object('body', 'وقّع المقاول الاتفاقية. حالة مشروعك رقم {{1}} في ترميم الآن: مُسند إلى {{2}} بمبلغ {{3}} ريال. الخطوة التالية: يتواصل معكما فريق ترميم لتحديد موعد البدء.', 'samples', jsonb_build_array('P-2001', 'مؤسسة البناء المتقن', '52,000'), 'button', 'افتح المشروع', 'path', 'project/P-2001'),
    'en', jsonb_build_object('body', 'The contractor signed the agreement. Status of your project {{1}} on Tarmem: awarded to {{2}} for SAR {{3}}. Next step: the Tarmem team contacts you both to set the start date.', 'samples', jsonb_build_array('P-2001', 'Build Co', '52,000'), 'button', 'Open the project', 'path', 'project/P-2001')),
  jsonb_build_object('event', 'application_verified', 'name', 'tarmem_application_verified_2',
    'ar', jsonb_build_object('body', 'تم توثيق حساب «{{1}}» في ترميم. حالة الحساب الآن: موثّق ومفعّل. سجّل دخولك بالبريد وكلمة المرور اللذين أنشأتهما.', 'samples', jsonb_build_array('مؤسسة البناء المتقن'), 'button', 'سجّل دخولك', 'path', 'signin'),
    'en', jsonb_build_object('body', 'Your Tarmem account for {{1}} is verified. Account status: verified and active. Sign in with the email and password you created.', 'samples', jsonb_build_array('Build Co'), 'button', 'Sign in', 'path', 'signin')),
  jsonb_build_object('event', 'stage_submitted',
    'ar', jsonb_build_object('body', 'المرحلة {{1}} من مشروعك {{2}} في ترميم بانتظار اعتمادك: قدّم المقاول صور العمل والفيديو. راجع العمل واعتمد المرحلة، أو سجّل ملاحظة.', 'samples', jsonb_build_array('1', 'P-2001'), 'button', 'راجع المرحلة', 'path', 'project/P-2001'),
    'en', jsonb_build_object('body', 'Stage {{1}} of your project {{2}} on Tarmem is ready for your approval: the contractor submitted photos and a video of the work. Review it and approve the stage, or raise an issue.', 'samples', jsonb_build_array('1', 'P-2001'), 'button', 'Review the stage', 'path', 'project/P-2001')),
  jsonb_build_object('event', 'stage_released',
    'ar', jsonb_build_object('body', 'اعتمد صاحب المنزل المرحلة {{1}} من المشروع {{2}} في ترميم، وصُرفت دفعتها إلى محفظتك.', 'samples', jsonb_build_array('1', 'P-2001'), 'button', 'افتح المشروع', 'path', 'project/P-2001'),
    'en', jsonb_build_object('body', 'The homeowner approved stage {{1}} of project {{2}} on Tarmem; its payment is released to your wallet.', 'samples', jsonb_build_array('1', 'P-2001'), 'button', 'Open the project', 'path', 'project/P-2001')),
  jsonb_build_object('event', 'stage_disputed',
    'ar', jsonb_build_object('body', 'سجّل صاحب المنزل ملاحظة على المرحلة {{1}} من المشروع {{2}} في ترميم: {{3}}. راجع الملاحظة وردّ عليها من صفحة المشروع.', 'samples', jsonb_build_array('1', 'P-2001', 'الدهان غير مكتمل في الغرفة الثانية'), 'button', 'افتح المشروع', 'path', 'project/P-2001'),
    'en', jsonb_build_object('body', 'The homeowner raised an issue on stage {{1}} of project {{2}} on Tarmem: {{3}}. Review it and reply from the project page.', 'samples', jsonb_build_array('1', 'P-2001', 'The paint in the second room is not finished'), 'button', 'Open the project', 'path', 'project/P-2001')),
  jsonb_build_object('event', 'new_message', 'name', 'tarmem_new_message',
    'ar', jsonb_build_object('body', 'وصلتك رسالة بخصوص المشروع رقم {{1}} في ترميم من {{2}}: «{{3}}». الرد من صفحة المشروع.', 'samples', jsonb_build_array('P-2001', 'مؤسسة البناء المتقن', 'متى يمكن معاينة الموقع؟'), 'button', 'افتح المشروع', 'path', 'project/P-2001'),
    'en', jsonb_build_object('body', 'You have a message about project {{1}} on Tarmem from {{2}}: \"{{3}}\". Reply from the project page.', 'samples', jsonb_build_array('P-2001', 'Build Co', 'When can we visit the site?'), 'button', 'Open the project', 'path', 'project/P-2001')),
  jsonb_build_object('event', 'wa_test', 'name', 'tarmem_wa_test_2',
    'ar', jsonb_build_object('body', 'تم التحقق من رقم واتساب {{1}} المرتبط بحسابك في ترميم. تصلك عليه تحديثات مشاريعك من الآن. لا يلزمك الرد على هذه الرسالة.', 'samples', jsonb_build_array('+966 55 123 4567'), 'button', 'الإعدادات', 'path', 'settings'),
    'en', jsonb_build_object('body', 'The WhatsApp number {{1}} linked to your Tarmem account is confirmed. Your project updates will arrive here from now on. No reply is needed.', 'samples', jsonb_build_array('+966 55 123 4567'), 'button', 'Settings', 'path', 'settings'))
);
$$;

create or replace function public.notify_people() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  site constant text := 'https://www.tarmem.sa';
  who record; pr record; firm text; money text; n int; snippet text;
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
        select count(*) into n from public.bids b where b.project_id = new.project_id and b.status <> 'withdrawn';   -- this bid's number on the project
        if who.lang = 'en' then
          perform public.tell(who.email, who.mobile, 'en', 'New bid on your project ' || pr.code,
            array[coalesce(firm, 'A verified contractor') || ' bid SAR ' || money || ' for “' || pr.title || '”, ' || new.days || ' days.', 'Compare the bids side by side, and accept one when you are ready.'], 'project/' || pr.code, 'Compare the bids', 'new_bid',
            array[pr.code, greatest(n, 1)::text, coalesce(firm, 'A verified contractor'), money, new.days::text]);
        else
          perform public.tell(who.email, who.mobile, 'ar', 'عرض جديد على مشروعك ' || pr.code,
            array[coalesce(firm, 'مقاول موثّق') || ' قدّم عرضًا بقيمة ' || money || ' ريال على «' || pr.title || '» خلال ' || new.days || ' يوم.', 'قارن العروض جنبًا إلى جنب، واقبل ما يناسبك حين تكون جاهزًا.'], 'project/' || pr.code, 'قارن العروض', 'new_bid',
            array[pr.code, greatest(n, 1)::text, coalesce(firm, 'مقاول موثّق'), money, new.days::text]);
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

  elsif tg_table_name = 'project_messages' then
    -- a message inside a project tells the other party, with a snippet; the homeowner is named by first name only
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

drop trigger if exists notify_message on public.project_messages;
create trigger notify_message after insert on public.project_messages for each row execute function public.notify_people();

select public.wa_submit_templates(p_events := array['new_message']);
