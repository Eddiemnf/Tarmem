-- =======================================================================================
-- Tarmem — 020: a contractor's "profile performance", measured instead of typed in
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run. Safe to run more than once. Needs 001–019.
--
-- The design's contractor dashboard shows profile views, a bid win rate and a response time. The public site hid the
-- card because the figures were typed into the design. This measures two of them from real rows — views of the
-- contractor's public profile in the last 30 days (from the visit log, other people's visits only) and the share of
-- their bids that were chosen — and leaves response time honestly unmeasured until messages make it measurable.
-- =======================================================================================

create or replace function public.my_performance() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); views int := 0; total int := 0; won int := 0;
begin
  if me is null then return '{}'::jsonb; end if;
  -- the public profile lives at /firm/co-<first eight characters of the user id> (src/platform/bind.ts)
  select count(distinct session_id) into views from public.visits
    where path = '/firm/co-' || left(me::text, 8) and created_at > now() - interval '30 days' and (user_id is null or user_id <> me);
  select count(*), count(*) filter (where status = 'chosen') into total, won from public.bids where contractor_id = me and status <> 'withdrawn';
  return jsonb_build_object('views', views, 'bids', total, 'won', won);
end;
$$;
revoke all on function public.my_performance() from public, anon;
grant execute on function public.my_performance() to authenticated;
