-- =======================================================================================
-- Tarmem — 024: Supabase's own sign-in emails (reset password, confirmations, codes) sent by
-- the database, in Arabic or English, through Resend with the key already stored in app_secrets
--
-- HOW TO RUN: Supabase → SQL Editor → paste → Run. Safe to run again. Then switch it on in
-- Authentication → Auth Hooks → Send Email hook → Postgres → public.auth_send_email.
--
-- Without this, Supabase's built-in mailer sends those emails only to the project's team
-- addresses and at most two an hour, so a customer's "forgot password" never arrives.
-- The hook receives the user and the email's data, builds the verify link Supabase expects
-- (/auth/v1/verify?token=<hash>&type=<kind>&redirect_to=<page>), and sends it with
-- send_email() (010/018/022): same look, same log, reply-to support@tarmem.sa.
-- Supabase's security notices (*_notification) are skipped: 021 already emails "your password
-- was changed" from the database.
-- =======================================================================================

create or replace function public.url_encode(p text) returns text
language plpgsql immutable as $$
declare
  out text := ''; ch text; b bytea; i int; j int;
begin
  if p is null then return ''; end if;
  for i in 1 .. char_length(p) loop
    ch := substr(p, i, 1);
    if ch ~ '^[A-Za-z0-9._~-]$' then
      out := out || ch;
    else
      b := convert_to(ch, 'UTF8');
      for j in 0 .. length(b) - 1 loop
        out := out || '%' || upper(lpad(to_hex(get_byte(b, j)), 2, '0'));
      end loop;
    end if;
  end loop;
  return out;
end $$;

create or replace function public.auth_send_email(event jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  u jsonb := coalesce(event -> 'user', '{}'::jsonb);
  d jsonb := coalesce(event -> 'email_data', '{}'::jsonb);
  kind text := coalesce(d ->> 'email_action_type', '');
  to_addr text := u ->> 'email';
  lang text; who text; api text; back text; link text; code text;
  subj text; lines text[]; cta text; hello text;
begin
  if kind like '%\_notification' then return '{}'::jsonb; end if;   -- 021 sends the one that matters

  begin
    select p.lang, split_part(btrim(p.full_name), ' ', 1) into lang, who
      from public.profiles p where p.id = (u ->> 'id')::uuid;
  exception when others then lang := null; who := null;
  end;
  lang := coalesce(lang, u -> 'user_metadata' ->> 'lang', 'ar');
  if lang not in ('ar', 'en') then lang := 'ar'; end if;
  who := nullif(coalesce(who, split_part(btrim(coalesce(u -> 'user_metadata' ->> 'full_name', '')), ' ', 1)), '');

  api := coalesce((select value from public.app_secrets where key = 'supabase_url'), 'https://rdqlnsqdmaosghpxexup.supabase.co');
  back := coalesce(nullif(d ->> 'redirect_to', ''), nullif(d ->> 'site_url', ''), 'https://www.tarmem.sa');
  link := api || '/auth/v1/verify?token=' || public.url_encode(d ->> 'token_hash')
       || '&type=' || public.url_encode(kind) || '&redirect_to=' || public.url_encode(back);
  code := d ->> 'token';
  hello := case when lang = 'en' then 'Hello' || coalesce(' ' || who, '') || ','
                else 'مرحبًا' || coalesce(' ' || who, '') || '،' end;

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

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    execute 'grant usage on schema public to supabase_auth_admin';
    execute 'grant execute on function public.auth_send_email(jsonb) to supabase_auth_admin';
    execute 'grant execute on function public.url_encode(text) to supabase_auth_admin';
  end if;
end $$;
revoke execute on function public.auth_send_email(jsonb) from public, anon, authenticated;

select 'sign-in emails by the database: ready — switch on Authentication → Auth Hooks → Send Email → public.auth_send_email' as result;
