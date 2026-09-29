-- =======================================================================================
-- Tarmem — 030: the team hears about what matters, customers hear how things ended, and a project can
-- finish while payment on the site is still off
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run. Safe to run again. Needs 001–029.
-- Run it BEFORE deploying the site that calls the functions below, and before switching "Confirm email" on.
-- (Running 029 again afterwards is safe: 029 sees this file's notify_people and leaves it as it is.)
-- The last line lists what a visitor who is not signed in may call (still exactly is_admin, mobile_taken and
-- wa_webhook) and whether the daily summary is on the clock.
--
--  1. Team alerts (send_alert → alert_to): the homeowner signed an agreement; the contractor counter-signed and
--     the project is awarded (number, trade, value); a change request was proposed, and applied; a homeowner
--     withdrew their open project; one party, then both, confirmed a project complete. The agreement, change and
--     completion alerts and the daily summary are "priority" (029): the hourly cap on alerts never holds them back.
--  2. A daily summary at 07:00 Riyadh (pg_cron, 04:00 UTC) of what is waiting on the team: applications not
--     reviewed after a day, contact messages not handled after a day, agreements the contractor has not signed
--     after two days, projects awarded in the last day (arrange the start), change requests waiting over three
--     days, projects one party confirmed complete over three days ago while the other has not. Nothing is sent
--     when all six are zero.
--  3. Emails to customers, in fixed words (only the project number and the trade's fixed label, never words a
--     customer typed): an application received and an application declined, to the applicant; bidders told when
--     a project they bid on is withdrawn, and when it is awarded to another contractor. By email only: no
--     Meta-approved WhatsApp template fits these events, and none is invented here.
--  4. Finishing a project while payments are off. Completion is never one-sided: the homeowner and the contractor
--     each confirm the work is complete (homeowner_confirm_complete, contractor_confirm_complete), and the project
--     is completed when BOTH have — each step tells the other party and the team. The team can still complete,
--     cancel or remove a project from the console (admin_set_project_status). Completion opens the one review
--     (007) and lifts the erasure block (022); erasure keeps an awarded project's record either way (029).
--  5. Admins read the messages inside projects.
--  6. (Checked, unchanged) an applicant reads their own application, so the site can show "declined".
--  7. With "Confirm email" on, a contractor who signs up has no session until they confirm, so the application
--     goes in without an account; claim_my_application() links it once they are confirmed and signed in. The
--     "account verified" email to an application with no account yet now tells an unconfirmed applicant to
--     confirm their email and sign in, instead of "create your account". An application the team verified (or
--     contacted) BEFORE the account existed is linked too, when the address is the account's proven one and the
--     mobile number is the same.
--
-- =======================================================================================
-- CONTRACT (for the website)
-- =======================================================================================
-- New RPCs (all SECURITY DEFINER; none callable by a visitor who is not signed in):
--
-- A. admin_set_project_status(p_project uuid, p_status text, p_note text default null) → public.projects
--    Who: an admin (profiles.role = 'admin'). Anyone else: 'admins only'.
--    Moves: active → completed ("complete"), active → withdrawn ("cancel"), open → withdrawn ("remove", e.g. spam).
--    Returns the project row after the change. Writes an events row (entity 'project', entity_id = the code,
--    action 'completed' | 'cancelled' | 'removed', detail {by:'admin', from, to, note}); p_note (trimmed, first
--    500 characters) is kept only there and is never emailed.
--    Emails (fixed words, project number + trade): completed → the homeowner and the contractor (template
--    'project_completed'); cancelled → both ('project_cancelled'); removed → the owner ('project_removed'), and
--    every bidder whose bid was not withdrawn ('project_withdrawn_bidder', see D).
--    Errors (all SQLSTATE 42501 unless noted):
--      'admins only'
--      'unknown status: use completed or withdrawn'                                            (22023)
--      'no such project'                                                                        (22023)
--      'status_not_allowed: a project goes from active to completed or withdrawn, or from open to withdrawn'
--
-- B. homeowner_confirm_complete(p_project uuid) → public.projects
--    contractor_confirm_complete(p_project uuid) → public.projects
--    Who: the project's owner (homeowner_…) or its awarded contractor (contractor_…), while payment on the site is
--    OFF (platform_flags payments_live = false; with payments on, approving the last stage completes the project).
--    The project must be active and its agreement signed by both parties.
--    Each records that side's confirmation on the agreement (agreements.homeowner_done_at / contractor_done_at, read
--    with the agreement as before) and an events row (action 'confirmed_complete', detail {by:'homeowner'|'contractor'}).
--      - The first side to confirm: the project stays 'active'; the OTHER party is emailed (template
--        'completion_confirm': confirm it too on the project page, or message the other side if something is open);
--        a team alert. The row comes back unchanged (status 'active').
--      - The second side: the project becomes 'completed'; an events row (action 'completed', detail {by:'both'});
--        both parties are emailed ('project_completed'); a team alert. The row comes back with status 'completed'.
--    Pressed again by a side that has already confirmed, or on a completed project, by one of its parties: the row
--    comes back unchanged and nothing is sent.
--    Errors (SQLSTATE 42501):
--      'sign in first'
--      'only the project''s owner confirms completion'           (homeowner_…: not found, or not the owner)
--      'only the project''s contractor confirms completion'      (contractor_…: not found, or not its contractor)
--      'payments_on: with payment on the site, a project completes when its last stage is approved'
--      'not_active: only a project in progress can be confirmed complete'
--      'not_signed: the agreement is not signed by both parties'
--    After completion: the homeowner may insert the project's one review (007: insert into reviews (project_id,
--    contractor_id, stars, body)); delete_my_account / admin_delete_user no longer refuse with 'active_project'.
--
-- C. claim_my_application() → setof public.contractor_applications   (PostgREST: an array of 0 or 1 rows)
--    Who: a signed-in CONTRACTOR account whose email is confirmed (auth.users.email_confirmed_at is set).
--    Only an account that PROVED its address can claim (029's email_proven: it opened the link Supabase emailed;
--    an account confirmed automatically while "Confirm email" was off gets [] and nothing is linked).
--    If the account already has an application that is not 'new', returns it and changes nothing. Otherwise links
--    ONE application with user_id null and lower(email) = lower(the account's email), either
--      (a) sent at or after the account's creation (one minute of allowance for the auth server's clock) — only
--          when the account has no application yet; or
--      (b) of any age, whose status is 'verified' or 'contacted' (the team has already checked it) and whose mobile
--          is the account profile's mobile (mobile_key) — this also replaces the account's own 'new' application,
--          which is deleted, and deletes the account's other 'new' copies sent after it existed (the sign-up's own);
--    preferring verified, then contacted, then a matching mobile, then the newest; events row (entity
--    'application', action 'claimed', detail {status, replaced}). Returns the account's application after the call:
--    [] when there was nothing to claim (the site should then offer the application form, whose insert as a
--    signed-in contractor links itself as before).
--    Errors (SQLSTATE 42501):
--      'sign in first'
--      'confirm your email first'
--      'only a contractor account can claim an application'     (no profile yet, or not a contractor)
--    Order that makes it work: 1) supabase.auth.signUp(...) — with "Confirm email" on, data.session is null;
--    2) THEN, still without a session, insert the application exactly as today (company, person, mobile, email —
--    the SAME email as the sign-up —, city, trades, cr_number, note, lang; no user_id; do not .select() it back:
--    a visitor cannot read applications); 3) after the email link signs them in and the profile exists
--    (ensureProfile), if no application is found by user_id — or the one found is still 'new' — call
--    claim_my_application().
--    The visitor's insert is the same one as today's public form: allowed with user_id null, rate-limited by 029
--    ('too many: five in an hour from the same address or number', 'too many: ten in an hour from the same
--    network', 'too many right now: please try again in a few minutes'), and it now emails the applicant
--    'application_received' (at most one receipt a day per address, whichever form, and 40 an hour in all: 029).
--
-- D. Emails sent by the database on its own (email_log.template), fixed words only:
--      application_received      on an application insert, to its email (029's receipt limits)
--      application_declined      on status → 'declined', to the linked account's email, else the application's
--      project_withdrawn_bidder  on a project open → withdrawn (by its owner, the team, or an erasure), to each
--                                bidder whose bid was not withdrawn
--      bid_not_chosen            on the contractor's counter-signature, to every other bidder still 'submitted'
--      completion_confirm        from B, to the party that has not confirmed yet
--      project_completed / project_cancelled / project_removed   from A and B
--    Team alerts (alert_log.what = the subject): homeowner signed, awarded, change proposed, change applied,
--    confirmed complete by one side, completed, and the daily summary — all priority (never held by 029's cap of
--    30 an hour) — and withdrawn by its owner (an ordinary one). The daily summary: ops_daily_digest(), pg_cron job
--    'tarmem-daily-digest', '0 4 * * *' UTC = 07:00 Riyadh; it returns sent = true only when alert_log shows the
--    email as sent.
--
-- E. Row rules:
--      project_messages: admins read every message ("admins read project messages"); the parties as before.
--      contractor_applications: an applicant reads their own row, status included (004, unchanged), so
--      supabase.from('contractor_applications').select('*').eq('user_id', me) shows 'declined'.
--
-- F. Email confirmation ("Confirm email" ON) — what the Send Email hook (024, as changed by 029:
--    public.auth_send_email) sends for a sign-up:
--      https://rdqlnsqdmaosghpxexup.supabase.co/auth/v1/verify?token=<token_hash>&type=signup&redirect_to=<R>
--    (host: app_secrets 'supabase_url' if set), where <R> is URL-encoded and is, in order: the emailRedirectTo
--    given to signUp (Supabase keeps it only if it matches Authentication → URL Configuration → Redirect URLs,
--    e.g. https://www.tarmem.sa/**), else the Site URL, else https://www.tarmem.sa. Subject 'أكّد بريدك
--    الإلكتروني في ترميم' / 'Confirm your email for Tarmem', in the lang of user_metadata (the sign-up form
--    passes it), template 'auth_signup'. supabase.auth.resend({ type: 'signup', email, options:
--    { emailRedirectTo } }) sends the same email again.
--    Opening it: Supabase confirms the address and redirects (303) to
--      <R>#access_token=…&expires_at=…&expires_in=3600&refresh_token=…&token_type=bearer&type=signup
--    The site's client uses the implicit flow (supabase-js default; detectSessionInUrl on), so on that page load
--    supabase-js stores the session, clears the fragment and emits SIGNED_IN; initSession()'s getSession()
--    returns it, on whichever device opened the link. A used or expired link redirects to
--      <R>#error=access_denied&error_code=otp_expired&error_description=…
--    which supabase-js reports but does not clear: read error_code from location.hash and offer "send the link
--    again" (resend above). Signing in before confirming fails with the auth error code 'email_not_confirmed'.
--    Email change (the site does not offer it; if it ever does, with "Secure email change" on): two emails,
--    both type=email_change — the new address gets token_hash, the current address gets token_hash_new.
-- =======================================================================================

-- ---------------------------------------------------------------------------------------
-- 0. Where each side's "the work is complete" is kept (4), and one helper: the same email in the person's language
-- ---------------------------------------------------------------------------------------
-- written only by project_confirm_done() below (the site reads agreements; 006 lets nobody write them)
alter table public.agreements add column if not exists homeowner_done_at timestamptz;
alter table public.agreements add column if not exists contractor_done_at timestamptz;

create or replace function public.send_email_bilingual(p_to text, p_lang text, p_template text, p_path text,
  p_subject_en text, p_lines_en text[], p_cta_en text, p_subject_ar text, p_lines_ar text[], p_cta_ar text) returns void
language plpgsql security definer set search_path = public as $$
declare url text := case when p_path is null then null else 'https://www.tarmem.sa/' || ltrim(p_path, '/') end;
begin
  if p_lang = 'en' then
    perform public.send_email(p_to, 'en', p_subject_en, p_lines_en, url, p_cta_en, p_template);
  else
    perform public.send_email(p_to, 'ar', p_subject_ar, p_lines_ar, url, p_cta_ar, p_template);
  end if;
end $$;
revoke all on function public.send_email_bilingual(text, text, text, text, text, text[], text, text, text[], text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------
-- 1 + 3. What happens on its own: team alerts and customers' emails
-- ---------------------------------------------------------------------------------------
create or replace function public.ops_events() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  pr record; b record; who record; firm text; money text; ar text; en text; n int; to_addr text; to_lang text;
begin
  if tg_table_name = 'agreements' then
    select p.id, p.code, p.trade, p.title into pr from public.projects p where p.id = new.project_id;
    if coalesce(pr.title, '') like 'RLS TEST%' then return new; end if;
    money := to_char(new.amount, 'FM999,999,999');
    ar := public.trade_label(pr.trade, 'ar');
    if new.contractor_signed_at is null then
      -- the homeowner signed (or re-signed, or moved to another bid): the contractor has not yet
      if tg_op = 'INSERT' then n := 1;
      elsif old.bid_id is distinct from new.bid_id or old.homeowner_signed_at is distinct from new.homeowner_signed_at then n := 1;
      else n := 0;
      end if;
      if n = 1 then
        select company into firm from public.contractor_applications where user_id = new.contractor_id and status = 'verified' limit 1;
        perform public.send_alert('وقّع صاحب المنزل اتفاقية ' || pr.code || ' — بانتظار توقيع المقاول',
          array['المشروع: ' || pr.code || ' (' || ar || ')', 'المقاول: ' || coalesce(firm, '—'), 'القيمة: ' || money || ' ريال · المدة: ' || new.days || ' يوم'], true);
      end if;
    elsif tg_op = 'UPDATE' and old.contractor_signed_at is null then
      -- the contractor counter-signed: the project is awarded
      perform public.send_alert('أُسند المشروع ' || pr.code || ': ' || ar || ' بقيمة ' || money || ' ريال',
        array['المقاول: ' || coalesce(new.contractor_name, '—'), 'المدة: ' || new.days || ' يوم', 'الخطوة التالية: تواصلوا مع الطرفين لتحديد موعد البدء.'], true);
      -- every other bidder still waiting: told, in fixed words, that it went to someone else
      en := public.trade_label(pr.trade, 'en');
      for b in select pf.email, pf.lang from public.bids bi join public.profiles pf on pf.id = bi.contractor_id
               where bi.project_id = new.project_id and bi.status = 'submitted' and bi.contractor_id <> new.contractor_id loop
        perform public.send_email_bilingual(b.email, b.lang, 'bid_not_chosen', 'projects',
          'Project ' || pr.code || ' was awarded to another contractor',
          array['Thank you for your bid on project ' || pr.code || ' (' || en || '). The homeowner chose another bid, and the project is now awarded.',
                'Your bid is closed and nothing is needed from you. Other open projects are waiting for your bids.'],
          'Browse open projects',
          'أُسند المشروع ' || pr.code || ' إلى مقاول آخر',
          array['شكرًا لعرضك على المشروع ' || pr.code || ' (' || ar || '). اختار صاحب المنزل عرضًا آخر، وأُسند المشروع.',
                'أُغلق عرضك ولا يلزمك أي إجراء. مشاريع أخرى مفتوحة بانتظار عروضك.'],
          'تصفّح المشاريع المفتوحة');
      end loop;
    end if;

  elsif tg_table_name = 'projects' then
    if tg_op = 'UPDATE' and old.status = 'open' and new.status = 'withdrawn' and coalesce(new.title, '') not like 'RLS TEST%' then
      ar := public.trade_label(new.trade, 'ar');
      en := public.trade_label(new.trade, 'en');
      select count(*) into n from public.bids where project_id = new.id and status <> 'withdrawn';
      -- the team hears when the homeowner did it themselves (the console's own removals and erasures by the team they know about)
      if auth.uid() is not null and auth.uid() = new.owner_id then
        perform public.send_alert(
          case when exists (select 1 from public.profiles where id = new.owner_id and deleted_at is not null)
               then 'سُحب المشروع ' || new.code || ': حذف صاحب المنزل حسابه'
               else 'سحب صاحب المنزل المشروع ' || new.code end,
          array['المشروع: ' || new.code || ' (' || ar || ')',
                'العروض القائمة عليه: ' || n || case when n > 0 then ' — أُبلغ أصحابها بالبريد' else '' end]);
      end if;
      for b in select pf.email, pf.lang from public.bids bi join public.profiles pf on pf.id = bi.contractor_id
               where bi.project_id = new.id and bi.status <> 'withdrawn' loop
        perform public.send_email_bilingual(b.email, b.lang, 'project_withdrawn_bidder', 'projects',
          'Project ' || new.code || ' is no longer open',
          array['Project ' || new.code || ' (' || en || '), which you bid on, was withdrawn and no longer takes bids.',
                'Your bid is closed and nothing is needed from you. Other open projects are waiting for your bids.'],
          'Browse open projects',
          'المشروع ' || new.code || ' لم يعد مفتوحًا',
          array['سُحب المشروع ' || new.code || ' (' || ar || ') الذي قدّمت عليه عرضك، ولم يعد يستقبل العروض.',
                'أُغلق عرضك ولا يلزمك أي إجراء. مشاريع أخرى مفتوحة بانتظار عروضك.'],
          'تصفّح المشاريع المفتوحة');
      end loop;
    end if;

  elsif tg_table_name = 'change_requests' then
    select p.code, p.trade into pr from public.projects p where p.id = new.project_id;
    if tg_op = 'INSERT' then
      perform public.send_alert('طلب تغيير ' || new.code || ' على المشروع ' || pr.code,
        array['اقترحه: ' || case when new.by_side = 'ho' then 'صاحب المنزل' else 'المقاول' end,
              'المبلغ: ' || case when new.amount >= 0 then '+' else '' end || to_char(new.amount, 'FM999,999,999') || ' ريال · أيام إضافية: ' || new.days,
              'الوصف: ' || left(new.description, 300)], true);
    elsif tg_op = 'UPDATE' and old.applied_at is null and new.applied_at is not null then
      perform public.send_alert('اعتُمد طلب التغيير ' || new.code || ' على المشروع ' || pr.code,
        array['المبلغ: ' || case when new.amount >= 0 then '+' else '' end || to_char(new.amount, 'FM999,999,999') || ' ريال · أيام إضافية: ' || new.days,
              -- (this runs before change_request_approve moves projects.amount: the value is the signed amount plus every applied change)
              'قيمة المشروع الآن: ' || coalesce(to_char(public.change_total(new.project_id), 'FM999,999,999'), '—') || ' ريال'], true);
    end if;

  elsif tg_table_name = 'contractor_applications' then
    if coalesce(new.company, '') = 'RLS TEST' then return new; end if;
    if tg_op = 'INSERT' then
      -- to the address typed on the form, which may not be the sender's: fixed words, and 029's receipt limits (one a
      -- day per address whichever form, 40 an hour in all)
      if new.email is not null and public.receipt_allowed(new.email, 'application_received') then
        perform public.send_email_bilingual(new.email, new.lang, 'application_received', null,
          'We received your application to join Tarmem',
          array['Thank you. Your application to join Tarmem as a contractor reached our team.',
                'We review every contractor before they can bid, and contact you on the mobile number you gave to complete verification. You get an email the moment your account is verified.'],
          null,
          'وصلنا طلب انضمامك إلى ترميم',
          array['شكرًا لك. وصل طلب انضمامك إلى ترميم كمقاول، ويراجعه فريقنا.',
                'نراجع كل مقاول قبل أن يقدّم عروضه، ونتواصل معك على الجوال الذي أدخلته لاستكمال التوثيق. وتصلك رسالة فور توثيق حسابك.'],
          null);
      end if;
    elsif tg_op = 'UPDATE' and new.status = 'declined' and old.status is distinct from 'declined' then
      select email, lang into who from public.profiles where id = new.user_id and deleted_at is null;
      to_addr := coalesce(who.email, new.email);
      to_lang := coalesce(who.lang, new.lang);
      perform public.send_email_bilingual(to_addr, to_lang, 'application_declined', 'contact',
        'About your application to join Tarmem',
        array['Thank you for applying to join Tarmem as a contractor. After reviewing your application, we could not verify it at this time.',
              'If you think this is a mistake, or your details have changed, write to us at support@tarmem.sa.'],
        'Contact Tarmem',
        'بخصوص طلب انضمامك إلى ترميم',
        array['شكرًا لاهتمامك بالانضمام إلى ترميم كمقاول. بعد مراجعة طلبك، تعذّر توثيقه في الوقت الحالي.',
              'إن رأيت أن في ذلك خطأ، أو تغيّرت بياناتك، راسلنا على support@tarmem.sa.'],
        'تواصل مع ترميم');
    end if;
  end if;
  return new;
exception when others then
  -- a notice that cannot be sent never blocks what caused it
  insert into public.email_log (recipient, template, status, detail) values ('?', 'ops ' || tg_table_name || ' ' || tg_op, 'failed', left(sqlerrm, 300));
  return new;
end $$;
revoke all on function public.ops_events() from public, anon, authenticated;

drop trigger if exists ops_agreement on public.agreements;
create trigger ops_agreement after insert or update on public.agreements for each row execute function public.ops_events();
drop trigger if exists ops_project_status on public.projects;
create trigger ops_project_status after update of status on public.projects for each row
  when (old.status is distinct from new.status) execute function public.ops_events();
drop trigger if exists ops_change_request on public.change_requests;
create trigger ops_change_request after insert or update of applied_at on public.change_requests for each row execute function public.ops_events();
drop trigger if exists ops_application on public.contractor_applications;
create trigger ops_application after insert or update of status on public.contractor_applications for each row execute function public.ops_events();

-- ---------------------------------------------------------------------------------------
-- 7 (part). "Your account is verified" (029's notify_people), for an application that has no account yet:
-- with "Confirm email" on, the applicant usually has one already — tell them to confirm and sign in, not to
-- create another; with none, to create it with the same email and mobile (claim_my_application then links it).
-- Every other branch is 029's, unchanged. The "(030)" marker above tells 029 (if it is run again) to leave this
-- version in place.
-- ---------------------------------------------------------------------------------------
create or replace function public.notify_people() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  site constant text := 'https://www.tarmem.sa';
  who record; pr record; firm text; money text; n int; snippet text; label text; acct record; step_en text; step_ar text; dest text; cta_en text; cta_ar text;
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
      if new.user_id is not null then
        dest := 'signin'; cta_en := 'Sign in'; cta_ar := 'سجّل دخولك';
        step_en := 'Sign in to browse open projects and send your bids.';
        step_ar := 'سجّل دخولك لتصفّح المشاريع المفتوحة وتقديم عروضك.';
      else
        -- (030) no account linked yet: is there one with this address, still unconfirmed or not yet signed in?
        select u.email_confirmed_at into acct from auth.users u
         where new.email is not null and lower(u.email) = lower(new.email) order by u.created_at desc limit 1;
        if found then
          dest := 'signin'; cta_en := 'Sign in'; cta_ar := 'سجّل دخولك';
          if acct.email_confirmed_at is null then
            step_en := 'Confirm your email from the message we sent when you created your account, then sign in to browse open projects and send your bids.';
            step_ar := 'أكّد بريدك من الرسالة التي أرسلناها عند إنشاء حسابك، ثم سجّل دخولك لتصفّح المشاريع المفتوحة وتقديم عروضك.';
          else
            step_en := 'Sign in with the email and password you created to browse open projects and send your bids.';
            step_ar := 'سجّل دخولك بالبريد وكلمة المرور اللذين أنشأتهما لتصفّح المشاريع المفتوحة وتقديم عروضك.';
          end if;
        else
          -- (claim_my_application links this application once that account confirms its email, when its mobile is this one)
          dest := 'join'; cta_en := 'Create your account'; cta_ar := 'أنشئ حسابك';
          step_en := 'Create your account on the contractor page with this email and the same mobile number to start.';
          step_ar := 'أنشئ حسابك من صفحة انضمام المقاولين بهذا البريد ورقم الجوال نفسه لتبدأ.';
        end if;
      end if;
      if who.lang = 'en' then
        perform public.tell(who.email, who.mobile, 'en', 'Your Tarmem account is verified',
          array['“' || new.company || '” is verified and ready to use.', step_en], dest, cta_en, 'application_verified', array[new.company]);
      else
        perform public.tell(who.email, who.mobile, 'ar', 'تم توثيق حسابك في ترميم',
          array['حساب «' || new.company || '» موثّق وجاهز للاستخدام.', step_ar], dest, cta_ar, 'application_verified', array[new.company]);
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
$$;

-- ---------------------------------------------------------------------------------------
-- 2. The daily summary
-- ---------------------------------------------------------------------------------------
create or replace function public.ops_daily_digest() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  apps int; apps_list text; msgs int; unsigned int; unsigned_list text; awarded int; awarded_list text; changes int; changes_list text;
  halfdone int; halfdone_list text; lines text[] := '{}'; total int; before_id bigint; sent boolean := false;
begin
  select count(*)::int, array_to_string((array_agg(a.company order by a.created_at))[1:10], '، ') into apps, apps_list
    from public.contractor_applications a
   where a.status = 'new' and a.created_at < now() - interval '1 day' and a.company <> 'RLS TEST';
  select count(*)::int into msgs
    from public.contact_messages m
   where not m.handled and m.created_at < now() - interval '1 day' and m.name <> 'RLS TEST';
  select count(*)::int, array_to_string((array_agg(p.code order by a.homeowner_signed_at))[1:10], '، ') into unsigned, unsigned_list
    from public.agreements a join public.projects p on p.id = a.project_id
   where a.contractor_signed_at is null and a.homeowner_signed_at < now() - interval '2 days' and p.status = 'open';
  select count(*)::int, array_to_string((array_agg(p.code || ' (' || public.trade_label(p.trade, 'ar') || ')' order by a.contractor_signed_at))[1:10], '، ') into awarded, awarded_list
    from public.agreements a join public.projects p on p.id = a.project_id
   where a.contractor_signed_at > now() - interval '1 day' and p.status = 'active';
  select count(*)::int, array_to_string((array_agg(p.code || ' ' || c.code order by c.created_at))[1:10], '، ') into changes, changes_list
    from public.change_requests c join public.projects p on p.id = c.project_id
   where c.applied_at is null and c.created_at < now() - interval '3 days' and p.status = 'active';
  -- one side confirmed the work complete, the other has not, for over three days: the team follows up (or completes it)
  select count(*)::int, array_to_string((array_agg(p.code || ' (' || case when a.homeowner_done_at is not null then 'بانتظار المقاول' else 'بانتظار صاحب المنزل' end || ')'
                                         order by coalesce(a.homeowner_done_at, a.contractor_done_at)))[1:10], '، ') into halfdone, halfdone_list
    from public.agreements a join public.projects p on p.id = a.project_id
   where p.status = 'active' and (a.homeowner_done_at is null) <> (a.contractor_done_at is null)
     and coalesce(a.homeowner_done_at, a.contractor_done_at) < now() - interval '3 days';

  total := apps + msgs + unsigned + awarded + changes + halfdone;
  if total > 0 then
    lines := array['التاريخ: ' || to_char(now() at time zone 'Asia/Riyadh', 'YYYY-MM-DD')];
    if apps > 0 then lines := lines || ('طلبات انضمام مقاولين لم تُراجع منذ أكثر من يوم: ' || apps || ' — ' || apps_list || case when apps > 10 then '، …' else '' end); end if;
    if msgs > 0 then lines := lines || ('رسائل تواصل لم تُعالج منذ أكثر من يوم: ' || msgs); end if;
    if unsigned > 0 then lines := lines || ('اتفاقيات وقّعها صاحب المنزل ولم يوقّعها المقاول منذ أكثر من يومين: ' || unsigned || ' — ' || unsigned_list || case when unsigned > 10 then '، …' else '' end); end if;
    if awarded > 0 then lines := lines || ('مشاريع أُسندت خلال آخر يوم (رتّبوا موعد البدء مع الطرفين): ' || awarded || ' — ' || awarded_list || case when awarded > 10 then '، …' else '' end); end if;
    if changes > 0 then lines := lines || ('طلبات تغيير تنتظر الاعتماد منذ أكثر من ثلاثة أيام: ' || changes || ' — ' || changes_list || case when changes > 10 then '، …' else '' end); end if;
    if halfdone > 0 then lines := lines || ('مشاريع أكّد أحد طرفيها اكتمالها ولم يؤكده الآخر منذ أكثر من ثلاثة أيام: ' || halfdone || ' — ' || halfdone_list || case when halfdone > 10 then '، …' else '' end); end if;
    -- priority (029): the hourly cap on alerts never holds the summary back; "sent" is what the alert log says happened
    select coalesce(max(id), 0) into before_id from public.alert_log;
    perform public.send_alert('ملخص اليوم في ترميم — ما يحتاج متابعة الفريق (' || total || ')', lines, true);
    sent := exists (select 1 from public.alert_log where id > before_id and status = 'sent');
  end if;
  return jsonb_build_object('sent', sent, 'applications', apps, 'contact_messages', msgs, 'unsigned_agreements', unsigned,
                            'awarded', awarded, 'change_requests', changes, 'completion_waiting', halfdone);
end $$;
revoke all on function public.ops_daily_digest() from public, anon, authenticated;

-- 07:00 in Riyadh is 04:00 UTC, the clock pg_cron keeps (Saudi Arabia has no daylight saving)
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('tarmem-daily-digest', '0 4 * * *', 'select public.ops_daily_digest()');
exception when others then
  raise notice 'pg_cron is not available here (%). The daily summary can be sent from the SQL editor: select public.ops_daily_digest();', sqlerrm;
end;
$$;

-- ---------------------------------------------------------------------------------------
-- 4. Finishing a project while payment on the site is off
-- ---------------------------------------------------------------------------------------
create or replace function public.admin_set_project_status(p_project uuid, p_status text, p_note text default null) returns public.projects
language plpgsql security definer set search_path = public as $$
declare
  p public.projects; before text; act text; note text := nullif(left(btrim(coalesce(p_note, '')), 500), '');
  ho record; co record; ar text; en text;
begin
  if not public.is_admin() then raise exception 'admins only' using errcode = '42501'; end if;
  if p_status is null or p_status not in ('completed', 'withdrawn') then raise exception 'unknown status: use completed or withdrawn' using errcode = '22023'; end if;
  select * into p from public.projects where id = p_project for update;
  if not found then raise exception 'no such project' using errcode = '22023'; end if;
  before := p.status;
  if not ((before = 'active' and p_status in ('completed', 'withdrawn')) or (before = 'open' and p_status = 'withdrawn')) then
    raise exception 'status_not_allowed: a project goes from active to completed or withdrawn, or from open to withdrawn' using errcode = '42501';
  end if;
  act := case when p_status = 'completed' then 'completed' when before = 'active' then 'cancelled' else 'removed' end;

  update public.projects set status = p_status where id = p_project returning * into p;
  insert into public.events (actor_id, entity, entity_id, action, detail)
  values (auth.uid(), 'project', p.code, act, jsonb_build_object('by', 'admin', 'from', before, 'to', p_status, 'note', note));

  ar := public.trade_label(p.trade, 'ar');
  en := public.trade_label(p.trade, 'en');
  select email, lang into ho from public.profiles where id = p.owner_id;
  select email, lang into co from public.profiles where id = p.contractor_id;
  if act = 'completed' then
    perform public.send_email_bilingual(ho.email, ho.lang, 'project_completed', 'project/' || p.code,
      'Project ' || p.code || ' is complete',
      array['The Tarmem team marked your project ' || p.code || ' (' || en || ') as complete.',
            'You can now rate the contractor from the project page. If something is not finished, write to support@tarmem.sa.'],
      'Open the project',
      'اكتمل المشروع ' || p.code,
      array['سجّل فريق ترميم مشروعك ' || p.code || ' (' || ar || ') مكتملًا.',
            'يمكنك الآن تقييم المقاول من صفحة المشروع. وإن بقي شيء لم يُنجز فراسلنا على support@tarmem.sa.'],
      'افتح المشروع');
    perform public.send_email_bilingual(co.email, co.lang, 'project_completed', 'project/' || p.code,
      'Project ' || p.code || ' is complete',
      array['The Tarmem team marked project ' || p.code || ' (' || en || ') as complete.',
            'Thank you for your work. The project stays on your record. If you have a question, write to support@tarmem.sa.'],
      'Open the project',
      'اكتمل المشروع ' || p.code,
      array['سجّل فريق ترميم المشروع ' || p.code || ' (' || ar || ') مكتملًا.',
            'شكرًا لعملك. يبقى المشروع في سجلك. ولأي استفسار راسلنا على support@tarmem.sa.'],
      'افتح المشروع');
  elsif act = 'cancelled' then
    perform public.send_email_bilingual(ho.email, ho.lang, 'project_cancelled', 'project/' || p.code,
      'Project ' || p.code || ' is cancelled',
      array['The Tarmem team cancelled project ' || p.code || ' (' || en || ').',
            'The signed agreement stays on record. If you have a question, write to support@tarmem.sa.'],
      'Open the project',
      'أُلغي المشروع ' || p.code,
      array['ألغى فريق ترميم المشروع ' || p.code || ' (' || ar || ').',
            'تبقى الاتفاقية الموقّعة محفوظة في السجل. ولأي استفسار راسلنا على support@tarmem.sa.'],
      'افتح المشروع');
    perform public.send_email_bilingual(co.email, co.lang, 'project_cancelled', 'project/' || p.code,
      'Project ' || p.code || ' is cancelled',
      array['The Tarmem team cancelled project ' || p.code || ' (' || en || ').',
            'The signed agreement stays on record. If you have a question, write to support@tarmem.sa.'],
      'Open the project',
      'أُلغي المشروع ' || p.code,
      array['ألغى فريق ترميم المشروع ' || p.code || ' (' || ar || ').',
            'تبقى الاتفاقية الموقّعة محفوظة في السجل. ولأي استفسار راسلنا على support@tarmem.sa.'],
      'افتح المشروع');
  else
    -- removed while open: the owner is told; its bidders hear from ops_events like any other withdrawal
    perform public.send_email_bilingual(ho.email, ho.lang, 'project_removed', 'contact',
      'Your project ' || p.code || ' was removed',
      array['The Tarmem team removed your project ' || p.code || ' (' || en || ') from the site, so it no longer takes bids.',
            'If you think this is a mistake, write to support@tarmem.sa.'],
      'Contact Tarmem',
      'أُزيل مشروعك ' || p.code,
      array['أزال فريق ترميم مشروعك ' || p.code || ' (' || ar || ') من الموقع، فلم يعد يستقبل العروض.',
            'إن رأيت أن في ذلك خطأ، راسلنا على support@tarmem.sa.'],
      'تواصل مع ترميم');
  end if;
  return p;
end $$;
revoke all on function public.admin_set_project_status(uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_set_project_status(uuid, text, text) to authenticated;

-- Completion needs both parties: each confirms the work is complete; the project completes on the second
-- confirmation. One side alone never ends a project (and with it the erasure block and the record's protection).
create or replace function public.project_confirm_done(p_project uuid, p_side text) returns public.projects
language plpgsql security definer set search_path = public as $$
declare
  p public.projects; a public.agreements; ho record; co record; ar text; en text; facts text[];
begin
  if auth.uid() is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if p_side not in ('ho', 'co') then raise exception 'unknown side' using errcode = '22023'; end if;
  select * into p from public.projects where id = p_project for update;
  if p_side = 'ho' and (not found or p.owner_id is distinct from auth.uid()) then
    raise exception 'only the project''s owner confirms completion' using errcode = '42501';
  end if;
  if p_side = 'co' and (not found or p.contractor_id is distinct from auth.uid()) then
    raise exception 'only the project''s contractor confirms completion' using errcode = '42501';
  end if;
  if p.status = 'completed' then return p; end if;   -- already complete: nothing more to do
  if coalesce((select enabled from public.platform_flags where key = 'payments_live'), false) then
    raise exception 'payments_on: with payment on the site, a project completes when its last stage is approved' using errcode = '42501';
  end if;
  if p.status <> 'active' then raise exception 'not_active: only a project in progress can be confirmed complete' using errcode = '42501'; end if;
  select * into a from public.agreements where project_id = p_project for update;
  if not found or a.homeowner_signed_at is null or a.contractor_signed_at is null or a.contractor_id is distinct from p.contractor_id then
    raise exception 'not_signed: the agreement is not signed by both parties' using errcode = '42501';
  end if;
  -- pressed again before the other side has confirmed: nothing more
  if (p_side = 'ho' and a.homeowner_done_at is not null) or (p_side = 'co' and a.contractor_done_at is not null) then return p; end if;

  if p_side = 'ho' then
    update public.agreements set homeowner_done_at = now() where project_id = p_project returning * into a;
  else
    update public.agreements set contractor_done_at = now() where project_id = p_project returning * into a;
  end if;
  insert into public.events (actor_id, entity, entity_id, action, detail)
  values (auth.uid(), 'project', p.code, 'confirmed_complete', jsonb_build_object('by', case when p_side = 'ho' then 'homeowner' else 'contractor' end));

  ar := public.trade_label(p.trade, 'ar');
  en := public.trade_label(p.trade, 'en');
  select email, lang into ho from public.profiles where id = p.owner_id;
  select email, lang into co from public.profiles where id = p.contractor_id;
  facts := array['المشروع: ' || p.code || ' (' || ar || ')', 'المقاول: ' || coalesce(a.contractor_name, '—'),
                 'القيمة: ' || coalesce(to_char(p.amount, 'FM999,999,999'), '—') || ' ريال'];

  if a.homeowner_done_at is not null and a.contractor_done_at is not null then
    -- the second confirmation: the project is complete
    update public.projects set status = 'completed' where id = p_project returning * into p;
    insert into public.events (actor_id, entity, entity_id, action, detail)
    values (auth.uid(), 'project', p.code, 'completed', jsonb_build_object('by', 'both', 'from', 'active', 'to', 'completed'));
    perform public.send_email_bilingual(ho.email, ho.lang, 'project_completed', 'project/' || p.code,
      'Project ' || p.code || ' is complete',
      array['Both parties confirmed that project ' || p.code || ' (' || en || ') is complete.',
            'You can now rate the contractor from the project page.'],
      'Open the project',
      'اكتمل المشروع ' || p.code,
      array['أكّد الطرفان اكتمال المشروع ' || p.code || ' (' || ar || ').',
            'يمكنك الآن تقييم المقاول من صفحة المشروع.'],
      'افتح المشروع');
    perform public.send_email_bilingual(co.email, co.lang, 'project_completed', 'project/' || p.code,
      'Project ' || p.code || ' is complete',
      array['Both parties confirmed that project ' || p.code || ' (' || en || ') is complete.',
            'Thank you for your work. The project stays on your record, and the homeowner can now leave a review.'],
      'Open the project',
      'اكتمل المشروع ' || p.code,
      array['أكّد الطرفان اكتمال المشروع ' || p.code || ' (' || ar || ').',
            'شكرًا لعملك. يبقى المشروع في سجلك، ويمكن لصاحب المنزل الآن أن يكتب تقييمه.'],
      'افتح المشروع');
    perform public.send_alert('اكتمل المشروع ' || p.code || ' — أكّده الطرفان', facts, true);
  elsif p_side = 'ho' then
    -- the homeowner first: the contractor is asked to confirm too
    perform public.send_email_bilingual(co.email, co.lang, 'completion_confirm', 'project/' || p.code,
      'The homeowner confirmed project ' || p.code || ' is complete',
      array['The homeowner confirmed that the work on project ' || p.code || ' (' || en || ') is complete.',
            'If it is, confirm it on the project page too: the project is then recorded complete. If something is still open, message the homeowner from the project page.'],
      'Confirm on the project page',
      'أكّد صاحب المنزل اكتمال المشروع ' || p.code,
      array['أكّد صاحب المنزل أن العمل في المشروع ' || p.code || ' (' || ar || ') اكتمل.',
            'إن كان كذلك فأكّده أنت أيضًا من صفحة المشروع، فيُسجَّل المشروع مكتملًا. وإن بقي شيء مفتوح فراسل صاحب المنزل من صفحة المشروع.'],
      'أكّد من صفحة المشروع');
    perform public.send_alert('أكّد صاحب المنزل اكتمال المشروع ' || p.code || ' — بانتظار تأكيد المقاول', facts, true);
  else
    -- the contractor first: the homeowner checks the work and confirms (or raises what is left)
    perform public.send_email_bilingual(ho.email, ho.lang, 'completion_confirm', 'project/' || p.code,
      'The contractor says project ' || p.code || ' is complete',
      array['The contractor confirmed that the work on your project ' || p.code || ' (' || en || ') is complete.',
            'Check the work. If it is complete, confirm it on the project page: the project is then recorded complete and you can rate the contractor. If something is not finished, message the contractor from the project page.'],
      'Review and confirm',
      'أكّد المقاول اكتمال المشروع ' || p.code,
      array['أكّد المقاول أن العمل في مشروعك ' || p.code || ' (' || ar || ') اكتمل.',
            'راجع العمل؛ فإن كان مكتملًا فأكّد ذلك من صفحة المشروع، فيُسجَّل المشروع مكتملًا ويمكنك تقييم المقاول. وإن بقي شيء لم يُنجز فراسل المقاول من صفحة المشروع.'],
      'راجع وأكّد');
    perform public.send_alert('أكّد المقاول اكتمال المشروع ' || p.code || ' — بانتظار تأكيد صاحب المنزل', facts, true);
  end if;
  return p;
end $$;
revoke all on function public.project_confirm_done(uuid, text) from public, anon, authenticated;

create or replace function public.homeowner_confirm_complete(p_project uuid) returns public.projects
language sql security definer set search_path = public as $$
  select * from public.project_confirm_done(p_project, 'ho')
$$;
revoke all on function public.homeowner_confirm_complete(uuid) from public, anon, authenticated;
grant execute on function public.homeowner_confirm_complete(uuid) to authenticated;

create or replace function public.contractor_confirm_complete(p_project uuid) returns public.projects
language sql security definer set search_path = public as $$
  select * from public.project_confirm_done(p_project, 'co')
$$;
revoke all on function public.contractor_confirm_complete(uuid) from public, anon, authenticated;
grant execute on function public.contractor_confirm_complete(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------
-- 5. Admins read the messages inside projects
-- ---------------------------------------------------------------------------------------
drop policy if exists "admins read project messages" on public.project_messages;
create policy "admins read project messages" on public.project_messages for select to authenticated using ((select public.is_admin()));

-- 6. An applicant reads their own application, status included: 004's "applicants read their own application"
--    (select to authenticated using user_id = auth.uid()) stands as it is.

-- ---------------------------------------------------------------------------------------
-- 7. An application sent before the email was confirmed (or verified before the account existed), linked to its account
-- ---------------------------------------------------------------------------------------
create or replace function public.claim_my_application() returns setof public.contractor_applications
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); u record; me record; mine record; pick record;
begin
  if uid is null then raise exception 'sign in first' using errcode = '42501'; end if;
  select email, email_confirmed_at, created_at into u from auth.users where id = uid;
  if u.email is null or u.email_confirmed_at is null then raise exception 'confirm your email first' using errcode = '42501'; end if;
  select role, mobile into me from public.profiles where id = uid and deleted_at is null;
  if me.role is distinct from 'contractor' then raise exception 'only a contractor account can claim an application' using errcode = '42501'; end if;
  select a.id, a.status into mine from public.contractor_applications a where a.user_id = uid;
  -- anyone can type somebody else's address on the public form: only an account that proved the address (it opened
  -- the link Supabase emailed) links what was sent with it; one confirmed automatically, with "Confirm email" off,
  -- links nothing
  if (mine.id is null or mine.status = 'new') and public.email_proven(uid) then
    select a.id, a.status into pick from public.contractor_applications a
     where a.user_id is null and a.email is not null and lower(a.email) = lower(u.email)
       and (   -- (a) sent after this account existed (a minute's allowance for the auth server's clock), when it has none yet
               (mine.id is null and a.created_at >= u.created_at - interval '1 minute')
               -- (b) already checked by the team, of any age, with this account's mobile number
            or (a.status in ('verified', 'contacted') and public.mobile_key(a.mobile) = public.mobile_key(me.mobile)))
     order by (a.status = 'verified') desc, (a.status = 'contacted') desc,
              coalesce(public.mobile_key(a.mobile) = public.mobile_key(me.mobile), false) desc, a.created_at desc, a.id desc
     limit 1
     for update;
    if pick.id is not null and (mine.id is null or pick.status in ('verified', 'contacted')) then
      begin
        -- the account's own application, still 'new', gives way to the one the team has already checked
        if mine.id is not null then delete from public.contractor_applications where id = mine.id and user_id = uid and status = 'new'; end if;
        update public.contractor_applications set user_id = uid where id = pick.id and user_id is null;
        if found then
          insert into public.events (actor_id, entity, entity_id, action, detail)
          values (uid, 'application', pick.id::text, 'claimed', jsonb_build_object('status', pick.status, 'replaced', mine.id));
          -- the sign-up's own copies sent after the account existed, still 'new', would only wait in the team's queue
          if pick.status in ('verified', 'contacted') then
            delete from public.contractor_applications
             where user_id is null and status = 'new' and email is not null and lower(email) = lower(u.email) and created_at >= u.created_at - interval '1 minute';
          end if;
        end if;
      exception when unique_violation then null;   -- another call linked one a moment ago
      end;
    end if;
  end if;
  return query select * from public.contractor_applications where user_id = uid;
end $$;
revoke all on function public.claim_my_application() from public, anon, authenticated;
grant execute on function public.claim_my_application() to authenticated;

-- ---------------------------------------------------------------------------------------
-- As 025/029: trigger functions are callable by nobody through the API, and every function keeps a fixed search_path
-- ---------------------------------------------------------------------------------------
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
             and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

select 'operations and project lifecycle (030): ready' as result,
  (select string_agg(p.proname, ', ' order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')) as visitors_may_call,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) c where c like 'search_path=%')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')) as no_search_path,
  to_regclass('cron.job') is not null as pg_cron_installed;
