-- =======================================================================================
-- Tarmem — 034: open projects for visitors, without the homeowner
--
-- The owner's call (30 September 2026): someone who has not registered may browse the open projects (what is wanted,
-- the trade, the city, the budget, when, and when it was posted) but learns nothing about the homeowner: no name, no
-- neighbourhood, no way to reach them. Bidding, messaging and saving still need an account (005, 019, 031 are unchanged).
--
-- The projects table stays closed to visitors (001: no grant to anon). Instead ONE function answers, the same for
-- everyone who asks — a visitor, a homeowner, a contractor, or an admin who wants to see the list as the public does:
--   public_projects()           the open projects, newest first, at most 300
--   public_projects('P-2105')   one of them (nothing at all when the code is not open: no hint that it exists)
-- It lists exactly the projects a verified contractor is shown (open, and the owner can deal: 031's can_interact),
-- and returns only: code, title, trade, description, city, budget_min, budget_max, timing, created_at, preview.
-- Never the owner's id, name, mobile or email, the district, the photos, the bids, or the awarded contractor.
-- In the title and the description, what would let a visitor reach the homeowner or find the house is replaced by •••:
-- the owner's own mobile number however it is written, other phone numbers (Saudi mobiles with up to three separators of
-- any kind between digits, any other run of 9 digits or more with up to two), email addresses, links, @handles and handles
-- named by their app, map coordinates, National Address short codes, the project's district (and its parts and usual
-- spellings) and its owner's name and family name. Best effort: words spelled out, or clues like «behind the mosque», are not.
-- Example projects (033) are included, with their mark: the page says some are examples, as it does for contractors.
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run. Safe to run again. Needs 001–033.
-- Run it BEFORE deploying the site that calls public_projects() (from that site on, /projects is public).
-- =======================================================================================

-- 1. the masking: text in, text out, nothing read from any table (callable by nobody through the API)

-- a word to hide, as a pattern that also finds its usual other spellings: ا أ إ آ as one letter, ى with ا or ي, ة ه, and a space, a dash
-- or nothing between its parts (so «Al Yasmin», «Al-Yasmin» and «AlYasmin» are one word)
create or replace function public.public_mask_word(p_word text) returns text
language plpgsql immutable set search_path = public as $$
declare w text := regexp_replace(btrim(coalesce(p_word, '')), '\s+', ' ', 'g'); pat text := ''; c text; i int;
begin
  for i in 1 .. char_length(w) loop
    c := substr(w, i, 1);
    pat := pat || case
      when c in ('ا', 'أ', 'إ', 'آ') then '[اأإآى]'
      when c = 'ى' then '[ىيا]'
      when c = 'ي' then '[يى]'
      when c in ('ة', 'ه') then '[ةه]'
      when c in (' ', '-', '_', 'ـ') then '[\s_ـ-]*'
      when position(c in '[]\.+*?^$(){}|/') > 0 then '\' || c
      else c end;
  end loop;
  return pat;
end $$;
revoke all on function public.public_mask_word(text) from public, anon, authenticated, service_role;

drop function if exists public.public_mask(text, text[]);
create or replace function public.public_mask(p_text text, p_hide text[] default '{}', p_mobile text default null) returns text
language plpgsql immutable set search_path = public as $$
declare
  t text := coalesce(p_text, '');
  digit constant text := '[0-9٠-٩۰-۹]';     -- 0-9, and the Arabic-Indic and Persian digits
  letter constant text := 'A-Za-zء-ي';                  -- what counts as inside a word (Latin and Arabic letters)
  -- what people type between the digits of a number: spaces (also the no-break and thin ones phones insert when a number is
  -- copied), invisible direction marks, the Arabic tatweel, dashes of every kind, dots, brackets, slashes
  sep constant text := '[\s   - ‎‏‪-‮⁦-⁩ـ‐-―./()_-]';
  sep_sa constant text := '[\s   - ‎‏‪-‮⁦-⁩ـ‐-―./()_,،-]';
  w text; m text; pat text; d int; i int;
begin
  -- the homeowner's own mobile number first, however it was written: its last nine digits, with up to three characters
  -- that are not digits between any two of them (and whatever country code or 0 came before)
  m := right(regexp_replace(coalesce(p_mobile, ''), '[^0-9]', '', 'g'), 9);
  if char_length(m) = 9 then
    pat := '(?:(?:\+|00)?[9٩۹][6٦۶][6٦۶][^0-9٠-٩۰-۹]{0,3}|[0٠۰][^0-9٠-٩۰-۹]{0,3})?';
    for i in 1 .. 9 loop
      d := substr(m, i, 1)::int;
      pat := pat || case when i > 1 then '[^0-9٠-٩۰-۹]{0,3}' else '' end || '[' || d || chr(1632 + d) || chr(1776 + d) || ']';
    end loop;
    t := regexp_replace(t, pat, '•••', 'g');
  end if;
  -- email addresses (their dots and digits would otherwise be half-eaten by the rules below), also with a space around the dot
  t := regexp_replace(t, '[A-Za-z0-9._%+-]*\s*[@＠]\s*[A-Za-z0-9-]+\s*\.\s*(com|net|org|sa|edu|gov)(\s*\.\s*sa)?(?![A-Za-z])', '•••', 'gi');
  t := regexp_replace(t, '[A-Za-z0-9._%+-]+\s*[@＠]\s*[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+', '•••', 'g');
  -- links: with a scheme or www., bare addresses on the usual endings (wa.me/…, instagram.com/…, x.sa), any host with a path
  t := regexp_replace(t, '(https?://|www\.)[^\s]+', '•••', 'gi');
  t := regexp_replace(t, '[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.(com|net|org|sa|me|io|co|app|ly|gl|link|info|biz|store|online|site)(?![A-Za-z0-9])(/[^\s]*)?', '•••', 'gi');
  t := regexp_replace(t, '[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+/[^\s]+', '•••', 'g');
  -- @handles, and handles named by their app without the @ («سناب fahad_99», «snap: fahad_99»)
  t := regexp_replace(t, '@[A-Za-z0-9_.]{3,}', '•••', 'g');
  t := regexp_replace(t, '(^|[^' || letter || '])((?:سنابي|سناب شات|سناب|انستقرام|انستغرام|انستا|تويتر|تيك ?توك|تلجرام|تليجرام|تيليجرام|snapchat|snap|instagram|insta|twitter|tiktok|telegram)\s*[:：]?\s*)[A-Za-z0-9_.]{3,}',
                      '\1\2•••', 'gi');
  -- map coordinates, and the National Address's short code (four capital letters and four digits: one building)
  t := regexp_replace(t, '-?[0-9]{1,3}\.[0-9]{3,}\s*[,،]\s*-?[0-9]{1,3}\.[0-9]{3,}', '•••', 'g');
  t := regexp_replace(t, '(^|[^A-Za-z0-9])[A-Z]{4}\s?[0-9٠-٩]{4}(?![0-9٠-٩A-Za-z])', '\1•••', 'g');
  -- Saudi mobile numbers, with up to three separators between two digits (so «055 - 123 - 4567» too), then any number of 9 digits
  -- or more with up to two (a budget written «280000 - 450000» has three, and stays)
  t := regexp_replace(t, '(?:(?:\+|00)?[9٩۹][6٦۶][6٦۶]|[0٠۰])' || sep_sa || '{0,3}[5٥۵](?:' || sep_sa || '{0,3}' || digit || '){8}', '•••', 'g');
  t := regexp_replace(t, '\+?' || digit || '(?:' || sep || '{0,2}' || digit || '){8,}', '•••', 'g');
  -- the words this project must not show (its district and its parts, its owner's name and family name): whole words only,
  -- after an optional و ف ب ل ك stuck to the front, so a name inside a longer word is left alone
  -- (longest first: a full name before the family name inside it)
  foreach w in array coalesce((select array_agg(x order by char_length(x) desc) from unnest(p_hide) x), '{}') loop
    w := btrim(coalesce(w, ''));
    continue when char_length(w) < 3;
    t := regexp_replace(t, '(^|[^' || letter || '])([وفبلك]?)' || public.public_mask_word(w) || '(?=[^' || letter || ']|$)', '\1\2•••', 'gi');
  end loop;
  return t;
end $$;
revoke all on function public.public_mask(text, text[], text) from public, anon, authenticated, service_role;

-- 2. the list, and one project by its code
drop function if exists public.public_projects(text);
create or replace function public.public_projects(p_code text default null)
returns table (code text, title text, trade text, description text, city text, budget_min integer, budget_max integer,
               timing text, created_at timestamptz, preview boolean)
language sql stable security definer set search_path = public as $$
  with open_projects as (
    select pr.code, pr.owner_id, pr.title, pr.trade, pr.description, pr.city, pr.district, pr.budget_min, pr.budget_max,
           pr.timing, pr.created_at, pr.preview
      from public.projects pr
     where pr.status = 'open' and (p_code is null or pr.code = upper(btrim(p_code)))
  ), owners as (
    -- 031's rule, once per homeowner rather than once per project: a project reaches anyone only once its owner can deal
    select o.owner_id, regexp_replace(btrim(pf.full_name), '\s+', ' ', 'g') as full_name, pf.mobile
      from (select distinct owner_id from open_projects) o join public.profiles pf on pf.id = o.owner_id
     where public.can_interact(o.owner_id)
  )
  select lp.code,
         public.public_mask(lp.title, hide.words, lp.mobile),
         lp.trade,
         public.public_mask(lp.description, hide.words, lp.mobile),
         lp.city, lp.budget_min, lp.budget_max, lp.timing, lp.created_at, lp.preview
    from (select op.*, ow.full_name, ow.mobile
            from open_projects op join owners ow on ow.owner_id = op.owner_id
           order by op.created_at desc
           limit 300) lp                                   -- the newest 300 first, then only those are masked
    cross join lateral (
      -- the words to hide: the district, each part of it (split at commas, slashes and dashes) with and without a leading
      -- «حي» or «Al», the owner's full name, and their family name when it has four letters or more
      select coalesce(array_agg(distinct x) filter (where char_length(x) >= 3), '{}') as words from (
        select btrim(lp.district) as x
        union all select btrim(lp.full_name)
        union all select btrim(v) from unnest(regexp_split_to_array(coalesce(lp.district, ''), '\s*[,،/–-]\s*')) v
        union all select btrim(regexp_replace(btrim(v), '^(حي|حى|district|al)\s+', '', 'i'))
                    from unnest(regexp_split_to_array(coalesce(lp.district, ''), '\s*[,،/–-]\s*')) v
        union all select nm[array_length(nm, 1)] from (select regexp_split_to_array(btrim(lp.full_name), ' ') nm) f
                   where array_length(nm, 1) > 1 and char_length(nm[array_length(nm, 1)]) >= 4
      ) parts where x is not null
    ) hide
   order by lp.created_at desc
$$;
revoke all on function public.public_projects(text) from public, anon, authenticated;
grant execute on function public.public_projects(text) to anon, authenticated;

-- 3. two of the example projects (033) named their own district in their text, which the public page would show as •••:
--    reworded, on the examples only (a real homeowner's words are never changed)
update public.projects set title = 'ترميم شامل لفيلا دورين وملحق'
 where preview and title = 'ترميم شامل لفيلا دورين وملحق في الربوة';
update public.projects set description = replace(description, 'استلمت فيلا جديدة في العارض،', 'استلمت فيلا جديدة،')
 where preview and description like 'استلمت فيلا جديدة في العارض،%';

select 'open projects for visitors (034): ready' as result,
  (select count(*) from public.public_projects()) as visitors_see,
  (select count(*) from public.projects pr where pr.status = 'open' and public.can_interact(pr.owner_id)) as contractors_see,
  (select count(*) from public.public_projects() x join public.projects p on p.code = x.code
    where p.preview and (x.title <> p.title or x.description <> p.description)) as examples_masked,
  (select string_agg(p.proname, ', ' order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')) as visitors_may_call,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) c where c like 'search_path=%')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')) as no_search_path;
