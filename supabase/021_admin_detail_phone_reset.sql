-- =======================================================================================
-- Tarmem — 021: one account per mobile number, a "your password was changed" email, and what
-- the console shows when the team opens a person or a support case
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run. Safe to run again.
--
-- 1. Mobile numbers. Two accounts could sign up with the same number (emails were already
--    unique). mobile_key() reduces every way of writing a Saudi number to one form
--    ("+966 55 123 4567", "0551234567", "551234567" → 966551234567); a trigger refuses a
--    profile whose number belongs to another account, and mobile_taken() lets the sign-up
--    form say so before the account is created. Accounts that already share a number keep
--    working; only new sign-ups and number changes are checked.
-- 2. Password changes. Supabase Auth changes the password; nothing told the person. Now a
--    trigger on auth.users emails "your password was changed" through send_email (010/018),
--    in the person's language. It never blocks the change.
-- 3. The console. admin_user_detail(id) returns everything the team may need about one
--    account: the profile, the login record's dates, their projects (with bid counts), their
--    bids, their contractor application, portfolio and review counts. A support case can be
--    answered from the console: admin_reply_case(id, text) emails the sender when they left an
--    email (logged in email_log like every other message), keeps the reply in case_replies,
--    and stamps the case answered_at. Admins only, checked inside the functions.
-- =======================================================================================

-- ---------------------------------------------------------------------------------------
-- 1. One account per mobile number
-- ---------------------------------------------------------------------------------------
create or replace function public.mobile_key(p text) returns text
language sql immutable as $$
  select case
    when d = '' then null
    when d like '00%' then substr(d, 3)
    when d like '0%' then '966' || substr(d, 2)
    when length(d) = 9 and d like '5%' then '966' || d
    else d
  end
  from (select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') as d) x
$$;

create index if not exists profiles_mobile_key_idx on public.profiles (public.mobile_key(mobile));

create or replace function public.profiles_mobile_unique() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.mobile is null or public.mobile_key(new.mobile) is null then return new; end if;
  if exists (select 1 from public.profiles p
             where p.id <> new.id and public.mobile_key(p.mobile) = public.mobile_key(new.mobile)) then
    raise exception 'mobile_taken: this mobile number belongs to another account' using errcode = '23505';
  end if;
  return new;
end $$;

drop trigger if exists profiles_mobile_unique on public.profiles;
create trigger profiles_mobile_unique before insert or update of mobile on public.profiles
  for each row execute function public.profiles_mobile_unique();

-- The sign-up form asks this before creating the account. It answers only yes or no.
create or replace function public.mobile_taken(p_mobile text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.mobile_key(p_mobile) is not null
     and exists (select 1 from public.profiles where public.mobile_key(mobile) = public.mobile_key(p_mobile));
$$;
revoke all on function public.mobile_taken(text) from public;
grant execute on function public.mobile_taken(text) to anon, authenticated;

-- ---------------------------------------------------------------------------------------
-- 2. "Your password was changed"
-- ---------------------------------------------------------------------------------------
create or replace function public.notify_password_changed() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  lang text; who text; site text;
begin
  if old.encrypted_password is null or new.encrypted_password is not distinct from old.encrypted_password then return new; end if;
  if new.email is null then return new; end if;
  select p.lang, split_part(btrim(p.full_name), ' ', 1) into lang, who from public.profiles p where p.id = new.id;
  lang := coalesce(lang, 'ar');
  site := coalesce((select value from public.app_secrets where key = 'site_url'), 'https://www.tarmem.sa');
  if lang = 'en' then
    perform public.send_email(new.email, 'en', 'Your Tarmem password was changed',
      array['Hello ' || coalesce(who, '') || ',',
            'The password of your Tarmem account was changed just now.',
            'If that was you, there is nothing to do.',
            'If it was not you, reset your password right away from the sign-in page and write to support@tarmem.sa.'],
      site || '/signin', 'Open the sign-in page', 'password_changed');
  else
    perform public.send_email(new.email, 'ar', 'تم تغيير كلمة مرور حسابك في ترميم',
      array['مرحبًا ' || coalesce(who, '') || '،',
            'تم تغيير كلمة مرور حسابك في ترميم قبل قليل.',
            'إذا كنت أنت من غيّرها فلا يلزمك شيء.',
            'وإن لم تكن أنت، فأعد تعيين كلمة المرور فورًا من صفحة تسجيل الدخول وراسلنا على support@tarmem.sa.'],
      site || '/signin', 'فتح صفحة تسجيل الدخول', 'password_changed');
  end if;
  return new;
exception when others then
  return new; -- the change itself must never fail because a notice could not be sent
end $$;

drop trigger if exists notify_password_changed on auth.users;
create trigger notify_password_changed after update of encrypted_password on auth.users
  for each row execute function public.notify_password_changed();

-- ---------------------------------------------------------------------------------------
-- 3. The console: one person in full, and answering a support case
-- ---------------------------------------------------------------------------------------
alter table public.contact_messages add column if not exists answered_at timestamptz;

create table if not exists public.case_replies (
  id            bigint generated always as identity primary key,
  case_id       bigint not null references public.contact_messages (id) on delete cascade,
  admin_id      uuid references auth.users (id) on delete set null,
  body          text not null check (char_length(btrim(body)) between 2 and 4000),
  sent_by_email boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists case_replies_case_idx on public.case_replies (case_id, created_at);
alter table public.case_replies enable row level security;
revoke all on public.case_replies from anon, authenticated;
grant select on public.case_replies to authenticated;
drop policy if exists "admins read replies" on public.case_replies;
create policy "admins read replies" on public.case_replies for select to authenticated using (public.is_admin());
-- rows are written only through admin_reply_case

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
        array['Hello ' || c.name || ',', btrim(p_body), 'To continue the conversation, write to support@tarmem.sa.'],
        site || '/contact', 'Contact Tarmem', 'case_reply');
    else
      perform public.send_email(c.email, 'ar', 'رد فريق ترميم على رسالتك',
        array['مرحبًا ' || c.name || '،', btrim(p_body), 'لمتابعة الحديث، راسلنا على support@tarmem.sa.'],
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
    'messages', (select count(*) from public.contact_messages m where u.email is not null and lower(m.email) = lower(u.email)),
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

select 'one account per mobile, password-change email, console details: ready' as result;
