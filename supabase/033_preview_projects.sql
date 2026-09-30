-- =======================================================================================
-- Tarmem — 033: example projects for the early-access launch
--
-- The owner's call (30 September 2026): while real homeowners are still arriving, a contractor who joins should see
-- what requests on Tarmem look like. This adds 30 example homeowner projects (14 invented homeowners, Riyadh, Jeddah
-- and the Eastern Province, 28 trades, 1,500 to 450,000 SAR). Every verified contractor sees them as open projects and
-- may bid and message as on any other; the site tells contractors, in small type under the early-access notice, that
-- some projects are examples while any is listed (web/src/launch/LaunchNotice.tsx). The console and the inbox mark them
-- «تجريبي». Nobody else sees them: homeowners read only their own projects, and visitors none.
--
-- The invented homeowners can never be reached or signed in to:
--   · email <key>@tarmem-preview — a domain with no dot, which send_email drops at its first line (031), so no mail is
--     ever sent or bounced; notifications off in prefs (new bid, message, stage) and email as the only channel;
--   · mobile +1 202 555 01xx, the range reserved for fiction: not a Saudi number, so send_whatsapp never sends;
--   · email and mobile marked as proven here (so their projects reach contractors, 031's can_interact), which also
--     means no "confirm your email" mail at creation; banned from signing in (for 100 years: Supabase Auth cannot read an
--     'infinity' ban), with a random unknown password.
-- The seed itself sends nothing: the team alert and the owner's "project posted" notice are held for these inserts only.
--
-- TO REMOVE THEM, in the SQL Editor (it deletes rather than withdraws, so no contractor who bid is emailed):
--   select public.preview_clear();          -- everything: the 30 projects, their bids and messages, the 14 accounts
--   select public.preview_clear('P-2105');  -- one example project, as real ones replace them
-- Withdrawing an example any other way (the console's "remove", erasing an invented homeowner) is refused, because a
-- withdrawal emails every contractor who bid on it. The P- numbers these projects used are not reused.
-- Clear them before switching mobile codes on (set_otp): the invented homeowners count as verified, real ones may not yet.
--
-- HOW TO RUN: Supabase → SQL Editor → paste this whole file → Run. Safe to run again: it adds the projects once, and
-- never again after preview_clear() (to bring them back on purpose: delete from public.platform_flags where
-- key = 'preview_cleared'; then run it). Needs 001–032.
-- =======================================================================================

-- 1. the mark, on the project and on the invented homeowner (the site's column grants — 001 — never include it)
alter table public.projects add column if not exists preview boolean not null default false;
alter table public.profiles add column if not exists preview boolean not null default false;

-- 2. the removal, for when real projects have replaced them: all at once, or one project at a time
drop function if exists public.preview_clear();
create or replace function public.preview_clear(p_code text default null) returns jsonb
language plpgsql set search_path = public as $$
declare people uuid[]; mobiles text[]; ids uuid[]; codes text[]; n_projects int; n_people int := 0; n_files int;
begin
  -- only the accounts this file made: an example homeowner, at the dotless address; never a real account that got the mark
  select coalesce(array_agg(p.id), '{}'), coalesce(array_agg(p.mobile), '{}') into people, mobiles
    from public.profiles p join auth.users u on u.id = p.id
   where p.preview and p.role = 'homeowner' and u.email like '%@tarmem-preview';
  if exists (select 1 from public.profiles where preview and not (id = any(people)))
     or exists (select 1 from public.projects where preview and not (owner_id = any(people))) then
    raise exception 'a real account or project carries the example mark: nothing removed';
  end if;
  select coalesce(array_agg(id), '{}'), coalesce(array_agg(code), '{}') into ids, codes
    from public.projects where owner_id = any(people) and (p_code is null or code = upper(btrim(p_code)));
  if p_code is not null and cardinality(ids) = 0 then raise exception 'no example project %', p_code; end if;
  -- deleted, not withdrawn: no table has a delete trigger, while a withdrawal emails every bidder
  delete from public.agreements where project_id = any(ids);   -- (an agreement's bid would otherwise hold its bid back)
  delete from public.projects where id = any(ids);             -- bids, messages, stages, reviews and change requests go with them
  get diagnostics n_projects = row_count;
  delete from public.events where (entity = 'project' and entity_id = any(codes))
     or (entity in ('project', 'agreement', 'stage', 'change') and entity_id = any(ids::text[]))
     or (p_code is null and actor_id = any(people));
  select count(*) into n_files from storage.objects
   where bucket_id = 'project-files' and split_part(name, '/', 2) = any(ids::text[]);
  if p_code is null then
    delete from public.email_log where recipient like '%@tarmem-preview' or recipient = any(mobiles);
    delete from auth.users where id = any(people);             -- their profiles go with them
    get diagnostics n_people = row_count;
    -- and a later run of this file does not bring them back
    insert into public.platform_flags (key, enabled) values ('preview_cleared', true) on conflict (key) do update set enabled = true;
  end if;
  return jsonb_build_object('projects_removed', n_projects, 'accounts_removed', n_people, 'files_to_remove_in_storage', n_files);
end $$;
revoke all on function public.preview_clear(text) from public, anon, authenticated, service_role;

-- an example is never withdrawn (which emails every contractor who bid): preview_clear removes it quietly instead
create or replace function public.preview_keep_quiet() returns trigger
language plpgsql set search_path = public as $$
begin
  raise exception 'example project %: remove it with select public.preview_clear(''%'') — a withdrawal would email everyone who bid', old.code, old.code
    using errcode = '42501';
end $$;
revoke all on function public.preview_keep_quiet() from public, anon, authenticated, service_role;
drop trigger if exists preview_keep_quiet on public.projects;
create trigger preview_keep_quiet before update of status on public.projects for each row
  when (old.preview and new.status = 'withdrawn' and old.status is distinct from 'withdrawn') execute function public.preview_keep_quiet();

-- 3. the 14 homeowners and their 30 projects, added once
do $seed$
declare
  owners jsonb := $json$[
 {
  "key": "h01",
  "full_name": "فهد العتيبي",
  "city": "riyadh",
  "lang": "ar",
  "mobile": "+1 202 555 0101"
 },
 {
  "key": "h02",
  "full_name": "نورة الشهري",
  "city": "riyadh",
  "lang": "ar",
  "mobile": "+1 202 555 0102"
 },
 {
  "key": "h03",
  "full_name": "خالد الدوسري",
  "city": "riyadh",
  "lang": "ar",
  "mobile": "+1 202 555 0103"
 },
 {
  "key": "h04",
  "full_name": "سلطان المطيري",
  "city": "riyadh",
  "lang": "ar",
  "mobile": "+1 202 555 0104"
 },
 {
  "key": "h05",
  "full_name": "منيرة القحطاني",
  "city": "riyadh",
  "lang": "ar",
  "mobile": "+1 202 555 0105"
 },
 {
  "key": "h06",
  "full_name": "عبدالرحمن السبيعي",
  "city": "riyadh",
  "lang": "ar",
  "mobile": "+1 202 555 0106"
 },
 {
  "key": "h07",
  "full_name": "رنا الجاسر",
  "city": "riyadh",
  "lang": "en",
  "mobile": "+1 202 555 0107"
 },
 {
  "key": "h08",
  "full_name": "ريم الزهراني",
  "city": "jeddah",
  "lang": "ar",
  "mobile": "+1 202 555 0108"
 },
 {
  "key": "h09",
  "full_name": "ماجد الغامدي",
  "city": "jeddah",
  "lang": "ar",
  "mobile": "+1 202 555 0109"
 },
 {
  "key": "h10",
  "full_name": "لمى باعشن",
  "city": "jeddah",
  "lang": "en",
  "mobile": "+1 202 555 0110"
 },
 {
  "key": "h11",
  "full_name": "تركي الحارثي",
  "city": "jeddah",
  "lang": "ar",
  "mobile": "+1 202 555 0111"
 },
 {
  "key": "h12",
  "full_name": "بندر الخالدي",
  "city": "eastern",
  "lang": "ar",
  "mobile": "+1 202 555 0112"
 },
 {
  "key": "h13",
  "full_name": "يوسف الملحم",
  "city": "eastern",
  "lang": "en",
  "mobile": "+1 202 555 0113"
 },
 {
  "key": "h14",
  "full_name": "هيفاء البوعينين",
  "city": "eastern",
  "lang": "ar",
  "mobile": "+1 202 555 0114"
 }
]$json$::jsonb;
  items jsonb := $json$[
 {
  "owner": "h01",
  "title": "ترميم شامل لفيلا دورين وملحق في الربوة",
  "trade": "full",
  "description": "فيلا دورين وملحق، مسطح البناء حوالي 380 م² وعمرها فوق 25 سنة. نبي نجددها بالكامل قبل ما نرجع نسكن فيها: تكسير الحمامات الخمسة والمطبخ، تغيير تمديدات الكهرباء والسباكة كلها، بورسلان بدل البلاط القديم، أسقف جبس وإنارة جديدة للمجالس والصالة، ودهان داخلي وخارجي. الشبابيك ألمنيوم قديم ويدخل منه الغبار ونبي نغيره. الهيكل الأساسي للفيلا سليم، أما ملحق السطح فننتظر فيه تقرير فحص هندسي. نفضّل مقاول يستلم المشروع كامل ومعه مهندس يتابع، مع جدول زمني واضح ودفعات على مراحل.",
  "city": "riyadh",
  "district": "الربوة",
  "budget_min": 280000,
  "budget_max": 450000,
  "timing": "month",
  "days_ago": 6
 },
 {
  "owner": "h01",
  "title": "فحص هندسي لشرخ في سقف ملحق السطح",
  "trade": "inspection",
  "description": "قبل ما نبدأ الترميم أبغى مهندس إنشائي يفحص ملحق السطح. فيه شرخ مائل في السقف طوله تقريبًا متر ونص، وبدأ يطلع صدأ من حديد التسليح عند طرفه. أحتاج تقرير مكتوب مع صور يوضح هل الملحق يحتاج تدعيم أو إزالة، وتقدير مبدئي للحل.",
  "city": "riyadh",
  "district": "الربوة",
  "budget_min": 1500,
  "budget_max": 3000,
  "timing": "asap",
  "days_ago": 11
 },
 {
  "owner": "h01",
  "title": "إنشاء مسبح 3×6 م في الحوش الخلفي",
  "trade": "pools",
  "description": "الحوش الخلفي تقريبًا 11×9 م، ونفكر نسوي فيه مسبح 3×6 بعمق متدرج من 1.2 إلى 1.6 م، مع غرفة مكائن صغيرة. نبي تشطيب موزاييك وإنارة داخل المسبح وممشى حوله. التنفيذ بعد ما يخلص ترميم الفيلا، فالموعد مرن، لكن نحب نشوف التصاميم والأسعار من الحين.",
  "city": "riyadh",
  "district": "الربوة",
  "budget_min": 50000,
  "budget_max": 80000,
  "timing": "flexible",
  "days_ago": 2
 },
 {
  "owner": "h02",
  "title": "تفصيل مطبخ جديد على شكل L لشقة",
  "trade": "kitchen",
  "description": "مطبخ الشقة مقاسه 3.5×4 م، والخزائن الحالية منتفخة تحت المغسلة من التسريب. أبغى خزائن علوية وسفلية جديدة على شكل حرف L، سطح كوارتز أو بديل قريب منه، ومكان لفرن بلت إن وغسالة صحون. البلاط الجداري والأرضية بحالة ممتازة وما أبغى أغيرها. الأجهزة علي.",
  "city": "riyadh",
  "district": "النرجس",
  "budget_min": 16000,
  "budget_max": 26000,
  "timing": "month",
  "days_ago": 1
 },
 {
  "owner": "h02",
  "title": "ستائر لسبع نوافذ في الشقة",
  "trade": "furnishings",
  "description": "- 7 نوافذ: الصالة (2)، المجلس (2)، وثلاث غرف نوم\n- مجموع العروض تقريبًا 22 متر طولي\n- المجلس والصالة: طبقتين (شيفون + بلاك أوت) مع سكة مخفية في الجبس\n- غرف النوم: بلاك أوت كامل\nأفضّل اللي يجيب عينات القماش للبيت ويأخذ المقاسات بنفسه.",
  "city": "riyadh",
  "district": "النرجس",
  "budget_min": 4500,
  "budget_max": 8500,
  "timing": "flexible",
  "days_ago": 0
 },
 {
  "owner": "h03",
  "title": "توريد وتركيب 6 مكيفات سبليت لفيلا جديدة",
  "trade": "hvac",
  "description": "استلمت فيلا جديدة في العارض، والتمديدات النحاسية موجودة من المطور لكن بدون مكيفات. أحتاج توريد وتركيب 6 مكيفات سبليت: 4 للغرف بقدرة 18 ألف وحدة، و2 للصالة والمجلس بقدرة 24 ألف. أبغى انفرتر وضمان على التركيب، مع اختبار ضغط للتمديدات قبل الربط.",
  "city": "riyadh",
  "district": "العارض",
  "budget_min": 14000,
  "budget_max": 24000,
  "timing": "asap",
  "days_ago": 4
 },
 {
  "owner": "h03",
  "title": "8 كاميرات مراقبة للفيلا مع تسجيل",
  "trade": "security",
  "description": "أبغى 8 كاميرات: 5 خارجية على السور والمدخل والمواقف، و3 في الحوش وعند باب المطبخ. تسجيل 30 يوم على الأقل ومشاهدة من الجوال.",
  "city": "riyadh",
  "district": "العارض",
  "budget_min": 3000,
  "budget_max": 5000,
  "timing": "month",
  "days_ago": 3
 },
 {
  "owner": "h04",
  "title": "تجديد حمامين وعلاج تسريب في الدور الأول",
  "trade": "bathroom",
  "description": "عندي حمامين في الدور الأول يحتاجون تجديد كامل، الأول 2.5×2 م والثاني 2×1.8 م. فيه تسريب من أرضية الحمام الكبير ظاهر على سقف المجلس تحت، فلازم عزل جديد. المطلوب: إزالة البلاط القديم، تغيير المواسير، كرسي معلق، شاور بدل البانيو في الكبير، ومغاسل جديدة. أقدر أوفر الأدوات الصحية بنفسي إذا كان أوفر.",
  "city": "riyadh",
  "district": "الصحافة",
  "budget_min": 15000,
  "budget_max": 25000,
  "timing": "asap",
  "days_ago": 7
 },
 {
  "owner": "h04",
  "title": "أسقف جبس بورد للمجلس والصالة",
  "trade": "gypsum",
  "description": "أبغى أسقف جبس بورد للمجلس (6×4 م) والصالة (7×5 م) بتصميم بسيط بمستويين، مع إنارة مخفية وسبوت لايت. الجبس الحالي قديم ومشقق ويحتاج إزالة. الدهان بعد الجبس مو ضمن الطلب.",
  "city": "riyadh",
  "district": "الصحافة",
  "budget_min": 4000,
  "budget_max": 8000,
  "timing": "month",
  "days_ago": 5
 },
 {
  "owner": "h04",
  "title": "دهان الدور الأرضي كامل (حوالي 200 م²)",
  "trade": "painting",
  "description": "دهان الدور الأرضي بعد ما نخلص أعمال الجبس: المساحة تقريبًا 200 م² (مجلس، مقلط، صالة، ممر، ومطبخ). الجدران فيها شروخ شعرية وآثار مسامير لوحات. أبغى معجون وصنفرة ووجهين دهان مطفي، والأسقف أبيض. الألوان أحددها بعد ما أشوف العينات.",
  "city": "riyadh",
  "district": "الصحافة",
  "budget_min": 12000,
  "budget_max": 20000,
  "timing": "flexible",
  "days_ago": 1
 },
 {
  "owner": "h05",
  "title": "مصعد منزلي وتهيئة البيت لوالدتي",
  "trade": "accessibility",
  "description": "والدتي كبرت بالسن وصار الدرج صعب عليها، وغرفتها في الدور الأول. نبحث عن مصعد منزلي صغير بوقفتين (الأرضي والأول) يتسع لكرسي متحرك، ويفضل يكون في فراغ الدرج أو زاوية الصالة. كذلك نحتاج منحدر عند المدخل الرئيسي بدل الثلاث درجات، ومقابض ثابتة في حمامها. نرجو زيارة للمعاينة وتوضيح الأعمال الإنشائية المطلوبة مع السعر.",
  "city": "riyadh",
  "district": "السليمانية",
  "budget_min": 65000,
  "budget_max": 110000,
  "timing": "month",
  "days_ago": 8
 },
 {
  "owner": "h06",
  "title": "نظام طاقة شمسية 10 كيلوواط على سطح الفيلا",
  "trade": "energy",
  "description": "أرغب في تركيب نظام طاقة شمسية مربوط بالشبكة بقدرة 10 كيلوواط تقريبًا. المساحة المتاحة في السطح حوالي 120 م² ولا يوجد عليها ظل. أحتاج في العرض: نوع الألواح والإنفرتر، مدة الضمان، التوفير المتوقع في الفاتورة، والموافقات المطلوبة ومن يتولاها.",
  "city": "riyadh",
  "district": "حطين",
  "budget_min": 40000,
  "budget_max": 58000,
  "timing": "flexible",
  "days_ago": 12
 },
 {
  "owner": "h06",
  "title": "عزل مائي وحراري لسطح 240 م²",
  "trade": "insulation",
  "description": "سطح الفيلا حوالي 240 م² والعزل عمره أكثر من 12 سنة. في أمطار الشتاء الماضي نزل ماء في غرفتين بالدور الأول. المطلوب إزالة العزل التالف، وعزل مائي وحراري جديد مع اختبار غمر، ويفضل الانتهاء قبل تركيب ألواح الطاقة الشمسية.",
  "city": "riyadh",
  "district": "حطين",
  "budget_min": 8000,
  "budget_max": 15000,
  "timing": "asap",
  "days_ago": 10
 },
 {
  "owner": "h07",
  "title": "Interior design and fit-out for a 145 m² apartment",
  "trade": "interior",
  "description": "We just received a 145 m² apartment (3 bedrooms, living room and majlis). Floors are porcelain and in good condition, so we're keeping them. We need a designer who can prepare 3D concepts and then carry out the work: gypsum ceilings with indirect lighting, a feature wall and TV unit in the living room, and built-in wardrobes in two bedrooms. Furniture is not included. Style: warm modern, with light wood, beige and a few black accents.",
  "city": "riyadh",
  "district": "Al Yasmin",
  "budget_min": 110000,
  "budget_max": 180000,
  "timing": "month",
  "days_ago": 4
 },
 {
  "owner": "h07",
  "title": "Network cabling and Wi-Fi access points",
  "trade": "networks",
  "description": "While the ceilings are open for the gypsum work, I'd like Cat6 cabling run to 8 data points (TV wall, desk, bedrooms) and 3 ceiling access points so Wi-Fi reaches every room. Everything should end in a small cabinet in the storage room. Please include the switch and access points in the price.",
  "city": "riyadh",
  "district": "Al Yasmin",
  "budget_min": 2000,
  "budget_max": 4000,
  "timing": "month",
  "days_ago": 0
 },
 {
  "owner": "h08",
  "title": "تغيير الخزان العلوي والمضخة وتركيب فلتر مركزي",
  "trade": "watersys",
  "description": "الخزان العلوي فايبر قديم وصار الماء يطلع مصفر، والمضخة صوتها عالي وتفصل كثير. أبغى خزان بولي إيثيلين 2000 لتر بداله، مضخة ضغط جديدة، وفلتر مركزي على خط الدخول. الخزان الأرضي سليم بس يحتاج تنظيف وتعقيم.",
  "city": "jeddah",
  "district": "السلامة",
  "budget_min": 5000,
  "budget_max": 9000,
  "timing": "asap",
  "days_ago": 2
 },
 {
  "owner": "h08",
  "title": "استبدال 9 شبابيك ألمنيوم بزجاج مزدوج",
  "trade": "aluminium",
  "description": "عندنا 9 شبابيك ألمنيوم سحاب قديمة، والرطوبة والغبار يدخلون منها حتى وهي مقفلة. أبغى ألمنيوم جديد بقطاع معزول حراريًا وزجاج دبل. أغلب المقاسات حوالي 150×150 سم، وشباكين المطبخ أصغر. السعر يشمل فك القديم وتشطيب الأطراف والسيليكون.",
  "city": "jeddah",
  "district": "السلامة",
  "budget_min": 8000,
  "budget_max": 14000,
  "timing": "month",
  "days_ago": 9
 },
 {
  "owner": "h08",
  "title": "تجديد بسيط لحمام الضيوف",
  "trade": "bathroom",
  "description": "حمام الضيوف 2×1.5 م، أبغى تغيير البلاط والمغسلة والكرسي والإنارة فقط، والسباكة سليمة.",
  "city": "jeddah",
  "district": "السلامة",
  "budget_min": 5000,
  "budget_max": 9000,
  "timing": "flexible",
  "days_ago": 16
 },
 {
  "owner": "h09",
  "title": "تجديد واجهة فيلا متضررة من الرطوبة والملوحة",
  "trade": "facades",
  "description": "الواجهة الأمامية والجانبية للفيلا حوالي 220 م²، والدهان الخارجي متقشر بسبب الرطوبة وملوحة الجو لقربنا من البحر. نبي تجديد بشكل عصري: حجر طبيعي عند المدخل، والباقي معالجة ودهان خارجي مقاوم للرطوبة، مع تغيير درابزين البلكونتين. نرجو إرفاق صور لأعمال سابقة في واجهات قريبة من البحر.",
  "city": "jeddah",
  "district": "أبحر الشمالية",
  "budget_min": 40000,
  "budget_max": 70000,
  "timing": "month",
  "days_ago": 14
 },
 {
  "owner": "h09",
  "title": "مظلة سيارتين وسواتر للسور الجانبي",
  "trade": "shades",
  "description": "أحتاج مظلة لسيارتين في الموقف الأمامي، المقاس تقريبًا 6×5 م، هيكل حديد وقماش PVC أو أي خامة أقوى تتحمل الشمس. وكذلك سواتر على السور الجانبي بطول 12 م وارتفاع مترين، لأن الجيران بنوا دور ثاني ويكشفون الحوش.",
  "city": "jeddah",
  "district": "أبحر الشمالية",
  "budget_min": 8000,
  "budget_max": 14000,
  "timing": "asap",
  "days_ago": 5
 },
 {
  "owner": "h10",
  "title": "Marble for the entrance hall and staircase",
  "trade": "stone",
  "description": "Our entrance hall (about 5×4 m) and the internal staircase (16 steps plus a landing) are still in old ceramic that is chipped in several places. We'd like marble instead, preferably a light colour with minimal veining; local or imported, whichever you recommend. Please include removing the old tiles, skirting, and a final polish. We live in the house, so dust control matters.",
  "city": "jeddah",
  "district": "Al Rawdah",
  "budget_min": 9000,
  "budget_max": 16000,
  "timing": "flexible",
  "days_ago": 13
 },
 {
  "owner": "h10",
  "title": "Smart home setup for a two-floor villa",
  "trade": "smarthome",
  "description": "Looking for a smart home setup:\n- Smart switches for around 30 lighting circuits\n- Motorised curtains for 4 windows (living room and master bedroom)\n- App control for 7 split AC units\n- Smart lock and video doorbell at the main door\nWe'd prefer a system that doesn't need rewiring and keeps working locally if the internet goes down.",
  "city": "jeddah",
  "district": "Al Rawdah",
  "budget_min": 15000,
  "budget_max": 28000,
  "timing": "flexible",
  "days_ago": 6
 },
 {
  "owner": "h11",
  "title": "ترميم شامل لشقة 170 م² قبل السكن",
  "trade": "full",
  "description": "شقة في الدور الثالث عمرها قرابة 30 سنة، مساحتها 170 م²: 4 غرف وصالة ومجلس ومطبخ و3 حمامات. اشتريتها وأبي أجددها كاملة قبل ما أسكن: تكسير الحمامات والمطبخ، تمديدات كهرباء وسباكة جديدة، بورسلان، جبس، دهان، وتغيير الأبواب. الشغل داخل الشقة فقط، والواجهة والعمارة ما لها علاقة. أحتاج أسكن خلال 4 شهور تقريبًا.",
  "city": "jeddah",
  "district": "الزهراء",
  "budget_min": 130000,
  "budget_max": 200000,
  "timing": "month",
  "days_ago": 3
 },
 {
  "owner": "h12",
  "title": "كشف تسريب وتغيير تمديدات المياه القديمة",
  "trade": "plumbing",
  "description": "فاتورة الماء ارتفعت فجأة، وسبّاك عاين البيت وقال فيه تسريب بعد العداد تحت البلاط. البيت عمره 20 سنة والتمديدات حديد مجلفن. أبغى كشف تسريب بالجهاز، ثم تغيير تمديدات المطبخ والحمامات الثلاثة إلى PPR بأقل تكسير ممكن، مع إرجاع البلاط.",
  "city": "eastern",
  "district": "الفيصلية، الدمام",
  "budget_min": 9000,
  "budget_max": 16000,
  "timing": "asap",
  "days_ago": 0
 },
 {
  "owner": "h12",
  "title": "طبلون كهرباء جديد وتغيير أسلاك 60 نقطة",
  "trade": "electrical",
  "description": "الطبلون الرئيسي فيه قواطع قديمة تفصل إذا اشتغلت المكيفات مع بعض، وبعض الأفياش تسخن. أحتاج فحص كامل للبيت، طبلون جديد بقواطع مناسبة للأحمال، وتغيير الأسلاك التالفة لحوالي 60 نقطة بين أفياش وإنارة. ويا ليت تقرير مكتوب بعد التنفيذ.",
  "city": "eastern",
  "district": "الفيصلية، الدمام",
  "budget_min": 7000,
  "budget_max": 13000,
  "timing": "month",
  "days_ago": 1
 },
 {
  "owner": "h12",
  "title": "عقد صيانة سنوي لبيت دورين",
  "trade": "maintenance",
  "description": "أبحث عن عقد صيانة سنوي يشمل: زيارة شهرية للكهرباء والسباكة، تنظيف 8 مكيفات سبليت مرتين في السنة، واستجابة للأعطال الطارئة خلال 24 ساعة. قطع الغيار تكون بفاتورة منفصلة.",
  "city": "eastern",
  "district": "الفيصلية، الدمام",
  "budget_min": 6000,
  "budget_max": 10000,
  "timing": "flexible",
  "days_ago": 18
 },
 {
  "owner": "h13",
  "title": "Low-maintenance backyard garden, about 110 m²",
  "trade": "landscape",
  "description": "Our backyard is roughly 11×10 m of bare sand with some broken paving along one side. We'd like a simple garden that doesn't need much care: artificial grass in the centre, a few palms and native shrubs along the wall, drip irrigation on a timer, and a paved seating corner with outdoor lighting. Open to your design ideas.",
  "city": "eastern",
  "district": "Al Rakah Al Shamaliyah, Khobar",
  "budget_min": 12000,
  "budget_max": 20000,
  "timing": "flexible",
  "days_ago": 7
 },
 {
  "owner": "h13",
  "title": "Home cinema in a 5×4 m ground-floor room",
  "trade": "av",
  "description": "We're turning a 5×4 m ground-floor room into a home cinema. Scope: acoustic wall panels, a 5.1.2 speaker setup, a projector with a 120-inch screen, dimmable lighting and full blackout. We'll buy the seating ourselves. Please include the design, cabling and final calibration.",
  "city": "eastern",
  "district": "Al Rakah Al Shamaliyah, Khobar",
  "budget_min": 35000,
  "budget_max": 60000,
  "timing": "month",
  "days_ago": 20
 },
 {
  "owner": "h14",
  "title": "استبدال الموكيت ببورسلان في الدور العلوي",
  "trade": "flooring",
  "description": "الدور العلوي فيه موكيت قديم في 4 غرف والصالة، المساحة تقريبًا 130 م². أبغى نشيله ونركب بورسلان مطفي 60×120 مع وزرة. تحت الموكيت أرضية أسمنتية قديمة وممكن تحتاج تسوية. نقل الأثاث علينا.",
  "city": "eastern",
  "district": "الدوحة الجنوبية، الظهران",
  "budget_min": 12000,
  "budget_max": 20000,
  "timing": "month",
  "days_ago": 2
 },
 {
  "owner": "h14",
  "title": "دواليب ملابس ثابتة من الأرض للسقف لثلاث غرف",
  "trade": "carpentry",
  "description": "أحتاج دواليب ملابس ثابتة لثلاث غرف: غرفة النوم الرئيسية على جدار 3.5 م، وغرفتين للبنات على جدار 2.5 م لكل غرفة، والارتفاع 2.7 م. أبواب سحاب في الرئيسية وأبواب مفصلات في الباقي، مع أدراج داخلية ومرآة طولية. أفضّل خشب مقاوم للرطوبة لأن الغرف قريبة من الحمامات.",
  "city": "eastern",
  "district": "الدوحة الجنوبية، الظهران",
  "budget_min": 11000,
  "budget_max": 18000,
  "timing": "flexible",
  "days_ago": 9
 }
]$json$::jsonb;
  o jsonb; p jsonb; who uuid; made uuid; since int; n int := 0; ids jsonb := '{}'::jsonb;
begin
  if exists (select 1 from public.profiles where preview)
     or exists (select 1 from public.platform_flags where key = 'preview_cleared' and enabled) then
    raise notice 'the example projects are already there, or were removed with preview_clear(): nothing added';
    return;
  end if;
  -- for these inserts only: no team alert per example project, no "project posted" notice to its invented owner
  alter table public.projects disable trigger alert_new_project;
  alter table public.projects disable trigger notify_project_posted;

  -- the homeowners first, while no session is set: 031 keeps a profile's email proof only when it is written from here
  for o in select value from jsonb_array_elements(owners) loop
    who := gen_random_uuid();
    select coalesce(max((x ->> 'days_ago')::int), 0) + 3 into since from jsonb_array_elements(items) x where x ->> 'owner' = o ->> 'key';
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token,
                            email_change_token_new, email_change, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, banned_until)
    values (who, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', (o ->> 'key') || '@tarmem-preview',
            md5(random()::text || clock_timestamp()::text), now() - make_interval(days => since), '', '', '', '',
            '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('lang', o ->> 'lang'),
            now() - make_interval(days => since), now(), now() + interval '100 years');
    insert into public.profiles (id, role, full_name, mobile, city, lang, prefs, email_verified_at, email_verified_email, mobile_verified_at, preview, created_at)
    values (who, 'homeowner', o ->> 'full_name', o ->> 'mobile', o ->> 'city', o ->> 'lang',
            '{"pBids":false,"pMsg":false,"pStages":false,"channel":"email"}'::jsonb,
            now(), (o ->> 'key') || '@tarmem-preview', now(), true, now() - make_interval(days => since));
    ids := ids || jsonb_build_object(o ->> 'key', who);
  end loop;

  -- each project as its homeowner posts it (projects_before_insert gives it its P- number), then dated as posted
  for p in select value from jsonb_array_elements(items) loop
    who := (ids ->> (p ->> 'owner'))::uuid; made := gen_random_uuid(); n := n + 1;
    perform set_config('request.jwt.claim.sub', who::text, true);
    perform set_config('request.jwt.claims', json_build_object('sub', who, 'role', 'authenticated')::text, true);
    insert into public.projects (id, title, trade, description, city, district, budget_min, budget_max, timing, preview)
    values (made, p ->> 'title', p ->> 'trade', p ->> 'description', p ->> 'city', p ->> 'district',
            (p ->> 'budget_min')::int, (p ->> 'budget_max')::int, p ->> 'timing', true);
    update public.projects set created_at = now() - make_interval(days => (p ->> 'days_ago')::int, hours => (n * 7) % 11, mins => (n * 17) % 60)
     where id = made;
  end loop;
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);

  alter table public.projects enable trigger alert_new_project;
  alter table public.projects enable trigger notify_project_posted;
end $seed$;

select 'example projects for early access (033): ready' as result,
  (select count(*) from public.profiles where preview) as example_homeowners,
  (select count(*) from public.projects where preview) as example_projects,
  (select count(*) from public.projects pr where pr.preview and pr.status = 'open' and public.can_interact(pr.owner_id)) as open_to_contractors,
  (select string_agg(p.proname, ', ' order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')) as visitors_may_call,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) c where c like 'search_path=%')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')) as no_search_path;
