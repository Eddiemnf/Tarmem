-- =======================================================================================
-- Tarmem — 025: the WhatsApp test sends the number its template expects, and the database
-- fixes Supabase's advisors asked for (security and speed)
--
-- HOW TO RUN: Supabase → SQL Editor → paste → Run. Safe to run again. The last line counts what
-- is left of each fix; every number should be 0.
--
-- 1. whatsapp_test() (023) sent tarmem_wa_test_2 without its one body value, the number, so Meta
--    would refuse every test with "(#132000) Number of parameters does not match" once the
--    account is unblocked. 016 had it right; 023 kept 014's empty list. Back to 016's value.
-- 2. Trigger functions can no longer be called through the API (a trigger runs whatever its
--    caller may execute), can_message() needs a signed-in caller, and every function in public
--    that had no fixed search_path gets one.
-- 3. Row rules read the signed-in person once per query instead of once per row:
--    (select auth.uid()) instead of auth.uid(). Same rules, faster as tables grow.
-- 4. Every foreign key gets an index, so joins and deletes stay fast as tables grow.
-- Left as they are, on purpose: verified_contractors and contractor_reviews run as their owner
-- (signed-in readers see a few public columns of rows they could not read directly);
-- is_admin(), my_role() and mobile_taken() stay callable before sign-in (row rules and the
-- sign-up form use them); the portfolio bucket stays listable (a contractor's profile lists their
-- photos from storage); pg_net stays in public (moving it means dropping it with its queue).
-- =======================================================================================

-- 1. the test message --------------------------------------------------------------------------
create or replace function public.whatsapp_test() returns text
language plpgsql security definer set search_path = public as $$
declare me public.profiles; num text; today int; allowance int;
begin
  if auth.uid() is null then raise exception 'sign in first' using errcode = '42501'; end if;
  if not coalesce((select enabled from public.platform_flags where key = 'whatsapp_live'), false) then
    raise exception 'WhatsApp updates are not switched on yet' using errcode = '42501';
  end if;
  select * into me from public.profiles where id = auth.uid();
  num := public.wa_number(me.mobile);
  if num is null then raise exception 'not a Saudi mobile number' using errcode = '22023'; end if;
  if public.is_admin() then perform public.wa_reconcile(); end if; -- the cron and the inbox do it for everyone else
  select count(*) into today from public.email_log
   where recipient = num and channel = 'whatsapp' and template = 'wa_test' and status = 'sent'
     and coalesce(answer_code, 200) < 400 and at > now() - interval '1 day';
  allowance := case when public.is_admin() then 10 else 3 end;
  if today >= allowance then raise exception 'test messages a day: % reached', allowance using errcode = '42501'; end if;
  -- the body of tarmem_wa_test_2 has one value, {{1}}: the number, written the way people read it
  perform public.send_whatsapp(me.mobile, case when me.lang = 'en' then 'en' else 'ar' end, 'wa_test',
    array['+' || substr(num, 1, 3) || ' ' || substr(num, 4, 2) || ' ' || substr(num, 6, 3) || ' ' || substr(num, 9)], 'settings');
  return num;
end;
$$;
revoke all on function public.whatsapp_test() from public, anon;
grant execute on function public.whatsapp_test() to authenticated;

-- 2. who may call what ---------------------------------------------------------------------------
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
             and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prokind = 'f'
             and not exists (select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) c where c like 'search_path=%')
             and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e') loop
    execute format('alter function %s set search_path = public, extensions', f.sig);
  end loop;
end $$;
revoke execute on function public.can_message(uuid, uuid) from public, anon;
grant execute on function public.can_message(uuid, uuid) to authenticated, service_role;

-- 3. row rules: the signed-in person once per query ----------------------------------------------
do $$
declare p record; bare constant text := '(?<!SELECT )auth\.(uid|jwt|role)\(\)';
begin
  for p in select schemaname, tablename, policyname, qual, with_check from pg_policies
           where schemaname = 'public' and (qual ~ bare or with_check ~ bare) loop
    if p.qual ~ bare then
      execute format('alter policy %I on %I.%I using (%s)', p.policyname, p.schemaname, p.tablename, regexp_replace(p.qual, bare, '(select auth.\1())', 'g'));
    end if;
    if p.with_check ~ bare then
      execute format('alter policy %I on %I.%I with check (%s)', p.policyname, p.schemaname, p.tablename, regexp_replace(p.with_check, bare, '(select auth.\1())', 'g'));
    end if;
  end loop;
end $$;

-- 4. an index under every foreign key -------------------------------------------------------------
do $$
declare k record;
begin
  for k in
    select c.conrelid::regclass as tbl, cl.relname, array_agg(a.attname::text order by u.ord) as cols
    from pg_constraint c
    join pg_class cl on cl.oid = c.conrelid
    join pg_namespace n on n.oid = cl.relnamespace
    cross join lateral unnest(c.conkey) with ordinality as u(attnum, ord)
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = u.attnum
    where c.contype = 'f' and n.nspname = 'public'
      and not exists (select 1 from pg_index i where i.indrelid = c.conrelid
                        and array_to_string((i.indkey::int2[])[0:array_length(c.conkey, 1) - 1], ',') = array_to_string(c.conkey, ','))
    group by c.oid, c.conrelid, cl.relname
  loop
    execute format('create index if not exists %I on %s (%s)', left(k.relname || '_' || array_to_string(k.cols, '_') || '_fkey_idx', 63), k.tbl,
                   (select string_agg(quote_ident(x), ', ') from unnest(k.cols) x));
  end loop;
end $$;

select 'WhatsApp test and advisor fixes: ready' as result,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prorettype = 'trigger'::regtype and has_function_privilege('anon', p.oid, 'execute')) as triggers_callable,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) c where c like 'search_path=%')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')) as no_search_path,
  (select count(*) from pg_policies where schemaname = 'public'
    and (qual ~ '(?<!SELECT )auth\.(uid|jwt|role)\(\)' or with_check ~ '(?<!SELECT )auth\.(uid|jwt|role)\(\)')) as per_row_rules,
  (select count(*) from pg_constraint c join pg_namespace n on n.oid = c.connamespace
    where c.contype = 'f' and n.nspname = 'public'
      and not exists (select 1 from pg_index i where i.indrelid = c.conrelid
                        and array_to_string((i.indkey::int2[])[0:array_length(c.conkey, 1) - 1], ',') = array_to_string(c.conkey, ','))) as unindexed_links;
