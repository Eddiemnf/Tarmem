-- =======================================================================================
-- Tarmem — 006: the agreement both sides sign
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run. ("Run without RLS" if asked.)
-- Safe to run more than once. Needs 001, 004 and 005 to have been run first.
--
-- Accepting a bid opens the agreement. The homeowner signs first; the contractor counter-signs;
-- only then is the project awarded (status "active", with its contractor and agreed amount).
--   * each signature is written by the database itself, with its time and the signer's name,
--     from a function that checks who is calling — the website cannot write a signature row;
--   * the agreement keeps a copy of the bid exactly as it stood when it was signed;
--   * only the two parties and Tarmem's admins can read an agreement;
--   * until the contractor signs, the homeowner may change their mind and sign another bid;
--     afterwards nothing about the agreement can change.
-- =======================================================================================

alter table public.projects add column if not exists contractor_id uuid references auth.users (id) on delete set null;
alter table public.projects add column if not exists amount integer check (amount is null or amount between 100 and 1000000);

create table if not exists public.agreements (
  project_id            uuid primary key references public.projects (id) on delete cascade,
  bid_id                uuid not null references public.bids (id) on delete restrict,
  homeowner_id          uuid not null references auth.users (id) on delete restrict,
  contractor_id         uuid not null references auth.users (id) on delete restrict,
  amount                integer not null,
  days                  integer not null,
  terms                 jsonb not null,
  homeowner_name        text not null,
  homeowner_signed_at   timestamptz not null default now(),
  contractor_name       text,
  contractor_signed_at  timestamptz
);

alter table public.agreements enable row level security;
drop policy if exists "an agreement is read by its two parties and admins" on public.agreements;
create policy "an agreement is read by its two parties and admins" on public.agreements
  for select to authenticated using (homeowner_id = auth.uid() or contractor_id = auth.uid() or public.is_admin());
revoke all on public.agreements from anon, authenticated;
grant select on public.agreements to authenticated;

create or replace function public.sign_agreement_homeowner(p_bid uuid) returns public.agreements
language plpgsql security definer set search_path = public as $$
declare
  b public.bids; p public.projects; signed public.agreements; who text;
begin
  select * into b from public.bids where id = p_bid;
  if not found or b.status = 'withdrawn' then raise exception 'this bid is not available' using errcode = '42501'; end if;
  select * into p from public.projects where id = b.project_id;
  if p.owner_id is distinct from auth.uid() then raise exception 'only the project''s owner accepts a bid' using errcode = '42501'; end if;
  if p.status <> 'open' then raise exception 'the project is no longer open' using errcode = '42501'; end if;
  if exists (select 1 from public.agreements a where a.project_id = p.id and a.contractor_signed_at is not null) then
    raise exception 'the agreement is already signed by both sides' using errcode = '42501';
  end if;
  select full_name into who from public.profiles where id = auth.uid();

  update public.bids set status = 'submitted' where project_id = p.id and status = 'chosen' and id <> b.id;
  update public.bids set status = 'chosen' where id = b.id and status <> 'chosen';
  insert into public.agreements (project_id, bid_id, homeowner_id, contractor_id, amount, days, terms, homeowner_name)
  values (p.id, b.id, auth.uid(), b.contractor_id, b.price, b.days, jsonb_build_object('note', b.note, 'details', b.details, 'project', jsonb_build_object('code', p.code, 'title', p.title)), who)
  on conflict (project_id) do update set bid_id = excluded.bid_id, contractor_id = excluded.contractor_id, amount = excluded.amount, days = excluded.days,
    terms = excluded.terms, homeowner_name = excluded.homeowner_name, homeowner_signed_at = now(), contractor_name = null, contractor_signed_at = null
  returning * into signed;
  insert into public.events (actor_id, entity, entity_id, action, detail) values (auth.uid(), 'agreement', p.id::text, 'homeowner_signed', jsonb_build_object('bid', b.id, 'amount', b.price));
  return signed;
end;
$$;

create or replace function public.sign_agreement_contractor(p_project uuid) returns public.agreements
language plpgsql security definer set search_path = public as $$
declare
  signed public.agreements; firm text;
begin
  select * into signed from public.agreements where project_id = p_project;
  if not found or signed.contractor_id is distinct from auth.uid() then raise exception 'there is no agreement here for you to sign' using errcode = '42501'; end if;
  if signed.contractor_signed_at is not null then return signed; end if;
  if not public.is_verified_contractor() then raise exception 'only a verified contractor signs' using errcode = '42501'; end if;
  if not public.project_is_open(p_project) then raise exception 'the project is no longer open' using errcode = '42501'; end if;
  select company into firm from public.contractor_applications where user_id = auth.uid() and status = 'verified' limit 1;

  update public.agreements set contractor_name = firm, contractor_signed_at = now() where project_id = p_project returning * into signed;
  update public.projects set status = 'active', contractor_id = auth.uid(), amount = signed.amount where id = p_project;
  insert into public.events (actor_id, entity, entity_id, action, detail) values (auth.uid(), 'agreement', p_project::text, 'contractor_signed', jsonb_build_object('amount', signed.amount));
  return signed;
end;
$$;

revoke all on function public.sign_agreement_homeowner(uuid), public.sign_agreement_contractor(uuid) from public, anon;
grant execute on function public.sign_agreement_homeowner(uuid), public.sign_agreement_contractor(uuid) to authenticated;
