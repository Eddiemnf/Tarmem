-- =======================================================================================
-- Tarmem — 027: change requests are real
--
-- The project page's "change requests" tab (the design's crSubmit / crApprove) only changed the browser: the
-- other party never saw a request, and it vanished at the next refresh. Now a request is a row:
--   · either party of a signed project proposes it: what changes, the amount added or taken off, extra days;
--   · the other party is emailed, sees it on the project page, and approves it;
--   · once both have approved, the project's value moves by the amount (projects.amount, which the console and,
--     later, the payment use); the signed agreement stays as it was signed, and the days add to its duration.
-- A request cannot take the value below 100 riyals or above 1,000,000 (the project's own limits); ten may wait at once.
--
-- HOW TO RUN: Supabase → SQL Editor → paste → Run. Safe to run again.
-- =======================================================================================

create table if not exists public.change_requests (
  id           bigint generated always as identity primary key,
  project_id   uuid not null references public.projects (id) on delete cascade,
  code         text not null,                              -- CR-1, CR-2… within the project
  by_id        uuid references public.profiles (id) on delete set null,
  by_side      text not null check (by_side in ('ho', 'co')),
  description  text not null check (char_length(description) between 3 and 1000),
  amount       integer not null default 0 check (amount between -1000000 and 1000000),
  days         integer not null default 0 check (days between -365 and 365),
  ho_ok_at     timestamptz,
  co_ok_at     timestamptz,
  applied_at   timestamptz,
  created_at   timestamptz not null default now(),
  unique (project_id, code)
);
create index if not exists change_requests_project_id_fkey_idx on public.change_requests (project_id);
create index if not exists change_requests_by_id_fkey_idx on public.change_requests (by_id);
alter table public.change_requests enable row level security;
drop policy if exists "the two parties and admins read change requests" on public.change_requests;
create policy "the two parties and admins read change requests" on public.change_requests for select to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and (p.owner_id = (select auth.uid()) or p.contractor_id = (select auth.uid())))
         or (select public.is_admin()));
revoke all on public.change_requests from anon, authenticated;
grant select on public.change_requests to authenticated;          -- written only through the two functions below

-- the value a signed project stands at: what was signed, moved by every applied change
create or replace function public.change_total(p_project uuid) returns bigint
language sql stable security definer set search_path = public as $$
  select a.amount::bigint + coalesce((select sum(c.amount) from public.change_requests c where c.project_id = p_project and c.applied_at is not null), 0)
  from public.agreements a where a.project_id = p_project
$$;
revoke all on function public.change_total(uuid) from public, anon, authenticated;

create or replace function public.change_request_create(p_project uuid, p_desc text, p_amount integer default 0, p_days integer default 0) returns public.change_requests
language plpgsql security definer set search_path = public as $$
declare p public.projects; side text; total bigint; row public.change_requests; other public.profiles; d text := btrim(coalesce(p_desc, ''));
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
  perform public.send_email(other.email, coalesce(other.lang, 'ar'),
    case when other.lang = 'en' then 'A change request on project ' || p.code else 'طلب تغيير على المشروع ' || p.code end,
    case when other.lang = 'en' then array['A change was proposed on “' || p.title || '”: ' || row.description,
                                           'Amount: ' || case when row.amount >= 0 then '+' else '' end || row.amount || ' SAR · extra days: ' || row.days,
                                           'Nothing changes until you approve it on the project page.']
         else array['اقتُرح تغيير على «' || p.title || '»: ' || row.description,
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
    case when author.lang = 'en' then array['Both parties approved ' || c.code || ': ' || c.description, 'The project''s value is now ' || total || ' SAR.']
         else array['اعتمد الطرفان ' || c.code || ': ' || c.description, 'قيمة المشروع الآن ' || total || ' ريال.'] end,
    'https://www.tarmem.sa/project/' || p.code, case when author.lang = 'en' then 'Open the project' else 'افتح المشروع' end, 'change_applied');
  return c;
end $$;
revoke all on function public.change_request_approve(bigint) from public, anon;
grant execute on function public.change_request_approve(bigint) to authenticated;

select 'change requests: ready' as result;
