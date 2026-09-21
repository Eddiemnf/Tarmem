// @ts-nocheck — the design's own logic class, carried over verbatim; see tools/convert-template.py.
/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py — do not edit by hand.
   Behaviour changes belong in the design file. The deliberate differences from the
   prototype are the LOGIC_PATCHES listed in the converter. */
/* oxlint-disable */
import * as D from '../data/tarmem-data';
import { DCLogic, aiErrorText, claude } from './designRuntime';
import { STORAGE_KEY } from '../launch/mode';
import { runtimeData } from '../platform/data';

const fmt = n => { const v=Number(n)||0;
  return v%1===0 ? v.toLocaleString('en-US') : v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); };
const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const EN_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const EN_MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const AR_DAYS = {Mon:'الاثنين',Tue:'الثلاثاء',Wed:'الأربعاء',Thu:'الخميس',Fri:'الجمعة',Sat:'السبت',Sun:'الأحد'};
// seeded message times read 'Mon 09:40'; the Arabic interface gets the Arabic weekday
const localTime = (str, ar) => ar ? String(str||'').replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/, d => AR_DAYS[d]) : str;
// '14 Aug' / 'Aug 14' -> '14 أغسطس 2026' (ar) or '14 August 2026' (en)
const dateLong = (str, ar, year) => {
  const s = String(str||'').trim(); if(!s) return s;
  // ISO dates come from <input type="date"> and from new Date(): '2026-10-05' -> '5 أكتوبر 2026' / '5 October 2026'
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(iso){ const k = +iso[2]-1; return `${+iso[3]} ${(ar ? AR_MONTHS : EN_MONTHS_FULL)[k] || iso[2]} ${iso[1]}`; }
  const dm = s.match(/(\d{1,2})/), mm = s.match(/[A-Za-z]{3,}/);
  if(!dm || !mm) return s;
  const mi = EN_MONTHS.findIndex(m=>mm[0].toLowerCase().startsWith(m.toLowerCase()));
  if(mi<0) return s;
  const y = year || 2026;
  return ar ? `${dm[1]} ${AR_MONTHS[mi]} ${y}` : `${dm[1]} ${mm[0]} ${y}`;
};
let __AR = false;
const mny = v => __AR ? fmt(v)+' ريال' : 'SAR '+fmt(v);
const mnyR = (lo,hi) => __AR ? fmt(lo)+' – '+fmt(hi)+' ريال' : 'SAR '+fmt(lo)+' – '+fmt(hi);
// the ten trades shown as picture tiles on the home page, in grid order
const HIRE_CATS = ['interior','full','kitchen','architectural','pm','landscape','extensions','carpentry','inspection','stone'];
const arNumerals = (v) => String(v);
// Count-up for the hero stat figures: keeps any prefix/suffix ("+", "%") and re-adds thousands separators.
const countStat = (v, t) => {
  const s = String(v ?? ''); const m = s.match(/[\d,]+/); if(!m) return s;
  const n = Number(m[0].replace(/,/g,'')); if(!isFinite(n)) return s;
  const cur = t >= 1 ? n : Math.round(n * t);
  return s.slice(0, m.index) + cur.toLocaleString('en-US') + s.slice(m.index + m[0].length);
};
const STATUS_TAG = {open:'tag-a', active:'tag-n', completed:'tag-g', funding:'tag-w'};
const MS_TAG = {pending:'tag-n', submitted:'tag-w', released:'tag-g', disputed:'tag-a'};

const HOW_ICONS = {
  ho: ['<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><path d="M14 3v6h6M8 13h8M8 17h5"></path></svg>',
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 11V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v6M3 11h18l-1.5 9H4.5z"></path><path d="M9 15h6"></path></svg>',
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M8 12.5l2.5 2.5L16 9.5"></path></svg>'],
  co: ['<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.4 7.8-8 9-4.6-1.2-8-4.5-8-9V6z"></path><path d="M9 12l2 2 4-4"></path></svg>',
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6.5"></circle><path d="M20 20l-4-4M8.5 11h5M11 8.5v5"></path></svg>',
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0 5 5L21 9.9A6 6 0 1 1 14.1 3z"></path><path d="M3 21l8.5-8.5"></path></svg>',
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"></rect><circle cx="12" cy="12" r="2.5"></circle><path d="M6 12h.01M18 12h.01"></path></svg>']
};
class Component extends DCLogic {
  state = { ready:false, lang:'ar', route:'home', curId:null, tab:'overview', atab:'overview', user:null,
    auth:{mode:'signin', step:1, role:'homeowner', f:{mobile:'',otp:'',name:'',city:'riyadh',company:'',trades:'',licence:'',tc:false}, otpCode:'', error:'', naf:'idle', nafCode:null, manual:false},
    post:{step:1, f:{title:'',trade:'kitchen',desc:'',city:'riyadh',address:'',min:'',max:'',timing:'month'}, files:[], error:'', pledge:false}, pendingPost:false,
    menuOpen:false, navOpen:false, topped:false, heroIdx:0, heroLock:null, howTab:'ho', agr:null, heroOn:true, aiText:'', aiFiles:[], scrolled:false,
    plan:{msgs:[], brief:{type:'',city:'',space:'',scope:'',budget:'',timing:''}, touched:[], q:'', busy:false, error:'', question:'', done:false, matches:[], matching:false}, revF:{stars:0,text:'',error:''}, reviews:[], setg:{mobile:'0555 000 000', email:'', prefs:{pBids:true,pStages:true,pPay:true,pMsg:true,pNews:false}, notice:''}, bfilt:{city:'',trade:'',min:''}, withdrawAsk:false, notifRead:[], notifOpen:false, edit:null, hedit:null, hoProfile:null, wl:{amount:'', method:'mada', error:'', notice:''}, txns:[], payout:{bank:'', holder:'', iban:'', saved:false, editing:false, error:'', draft:null}, filt:{q:'',city:'',trade:'',verified:false,sort:'rating'}, page:1, openShown:3, prole:'homeowner', contact:{name:'',email:'',phone:'',topic:'',msg:'',sent:false,error:''}, calcRaw:80000, calcDraft:'80000', calcFirst:true, saved:['c4'], openFaq:0,
    bidF:{price:'',days:'',note:'',incl:'',excl:'',brands:'',start:'',warranty:'',valid:'',ms1:'30',ms2:'40',ms3:'30',vatReg:true,visit:false,step:'edit',error:''}, msgDraft:'', pay:'card', contractors:[], projects:[], cases:[], rejected:[] };

  async componentDidMount(){
    const m = runtimeData();
    this.D = m; this.heroStart();
    this.seedSig = (str => { let k = 5381; for (let i = 0; i < str.length; i++) k = ((k * 33) ^ str.charCodeAt(i)) >>> 0; return String(k); })(JSON.stringify([m.PROJECTS, m.CONTRACTORS, m.CASES, m.TRADES, m.CITIES]));
    this.watchScroll(); this.watchPointer(); this.kickVideo(); this.startLive();
    const onlTick = () => { this.setState(s => { const c = s.onlineNow ?? 312; const r = Math.random(); let d = r < .55 ? (Math.random()<.5?-1:1) : r < .85 ? (Math.random()<.5?-2:2) : Math.round((Math.random()-.5)*8); if (c > 500 && d > 0 && Math.random() < .6) d = -d; return {onlineNow: Math.min(3000, Math.max(1, c + d))}; });
      this._onl = setTimeout(onlTick, 2500 + Math.random()*5500); };
    this._onl = setTimeout(onlTick, 3000);
    const saved = (()=>{ try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null'); } catch(e){ return null; } })();
    // Session keys always restore; seed-derived collections only while the seed data is unchanged,
    // so editing tarmem-i18n.js can never be masked by a stale cache.
    const SESSION = ['lang','route','curId','tab','atab','user','saved','page','openShown','pay','payout','txns','hoProfile','gaId','anRange','promos','affiliates','gift','strikes','refunds'];
    const restore = {};
    if(saved){
      for(const k of SESSION) if(saved[k] !== undefined) restore[k] = saved[k];
      if(saved.seedSig === this.seedSig) for(const k of ['contractors','projects','cases','rejected']) if(saved[k] !== undefined) restore[k] = saved[k];
      // names live in the seed data, so never let a cached display name outlive an edit to it
      if(restore.user?.role === 'homeowner') restore.user = {...restore.user, name: m.USERS.h1[saved.lang||'en'] || restore.user.name};
      if(restore.user?.role === 'contractor') restore.user = {...restore.user, name: m.CONTRACTORS[0].name[saved.lang||'en'] || restore.user.name};
    }
    try { localStorage.removeItem('tarmem-state'); localStorage.removeItem('tarmem-state-v2'); } catch(e){}
    const pr = this.props.startRole; const pl = this.props.startLang;
    const seed = { ready:true, contractors:m.CONTRACTORS, projects:m.PROJECTS, cases:m.CASES, promos:this._seedPromos(), affiliates:this._seedAff(), strikes:this._seedStrikes(), refunds:this._seedRefunds(), ...restore };
    if(pl && restore.lang === undefined) seed.lang = pl;
    if(pr && pr!=='guest' && restore.route === undefined){ const names={homeowner:m.USERS.h1[pl||'en'],contractor:m.CONTRACTORS[0].name[pl||'en'],admin:'Operations'}; seed.user={role:pr,name:names[pr]}; seed.route = pr==='homeowner'?'hdash':pr==='contractor'?'cdash':'admin'; }
    this.setState(seed);
    if(!window.matchMedia('(prefers-reduced-motion:reduce)').matches) window.addEventListener('pointermove', this.heroParallax, {passive:true});
    if(seed.route === undefined || seed.route === 'home') this.startStats();
  }
  scrollToCard(id){
    const el = document.getElementById(id); if(!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 84; // clears the sticky header
    window.scrollTo({top, behavior:'smooth'});
  }
  hireTrade = e => {
    const trade = e.currentTarget.dataset.trade || '';
    this.setState(st => ({filt:{...st.filt, trade, q:'', city:''}, page:1}));
    this.nav('contractors');
  };
  qaToProjects = () => this.scrollToCard('hdash-projects');
  qaToWork = () => this.scrollToCard('cdash-work');
  startStats(){
    cancelAnimationFrame(this._statRaf); clearTimeout(this._statLead);
    if(window.matchMedia('(prefers-reduced-motion:reduce)').matches){ this.setState({statT:1}); return; }
    this.setState({statT:0});
    // lead-in matches the card's own entrance animation (1.1s) so the count is visible, not over before the card lands
    this._statLead = setTimeout(() => {
      const DUR = 1800, t0 = performance.now();
      const tick = now => {
        const p = Math.min(1, (now - t0) / DUR);
        this.setState({statT: 1 - Math.pow(1 - p, 3)});
        if(p < 1) this._statRaf = requestAnimationFrame(tick);
      };
      this._statRaf = requestAnimationFrame(tick);
    }, 1000);
    this.armStatObserver();
  }
  armStatObserver(){
    if(this._statIO) this._statIO.disconnect();
    const attach = () => {
      const el = document.querySelector('.ai2-stats');
      if(!el){ this._statRetry = setTimeout(attach, 200); return; }
      this._statIO = new IntersectionObserver(es => {
        es.forEach(e => { if(e.isIntersecting && (this.state.statT ?? 1) >= 1) this.startStats(); });
      }, {threshold:.5});
      this._statIO.observe(el);
    };
    clearTimeout(this._statRetry); attach();
  }
  heroParallax = e => {
    const el = document.querySelector('.hero-par'); if(!el) return;
    const x = (e.clientX/window.innerWidth - .5), y = (e.clientY/window.innerHeight - .5);
    el.style.transform = `perspective(1200px) rotateY(${x*4}deg) rotateX(${-y*3}deg) translate3d(${x*-26}px,${y*-16}px,0)`;
  };
  componentDidUpdate(){
    if(!this.state.ready) return;
    const {lang,route,curId,tab,atab,user,saved,payout,txns,hoProfile,contractors,projects,cases,rejected,pay,page,openShown,gaId,anRange,promos,affiliates,gift,strikes,refunds} = this.state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({seedSig:this.seedSig,lang,route,curId,tab,atab,user,saved,payout,txns,hoProfile,contractors,projects,cases,rejected,pay,page,openShown,gaId,anRange,promos,affiliates,gift,strikes,refunds}));
    if(route === 'home' && this._lastRoute !== 'home') this.startStats();
    this._lastRoute = route;
  }
  kickVideo(){
    const tryPlay = () => { const v = document.querySelector('.ph-vid'); if(!v) return false; v.muted = true; const p = v.play(); if(p && p.catch) p.catch(()=>{}); return !v.paused; };
    if(tryPlay()) return;
    let n = 0;
    this._vidT = setInterval(() => { if(tryPlay() || ++n > 25) clearInterval(this._vidT); }, 200);
    this._vidKick = () => { if(tryPlay()) document.removeEventListener('pointerdown', this._vidKick); };
    document.addEventListener('pointerdown', this._vidKick, {passive:true});
  }
  fitAi(el){ if(!el) return; el.style.minHeight = '0px'; el.style.minHeight = Math.max(64, el.scrollHeight) + 'px'; }
  // ---- deadlines, strike meter, whatsapp, help, invoices ----
  msDue(pr, i, m, t, lang){
    // once evidence is submitted the clock stops: the stage is waiting on the homeowner, not the contractor
    if(m === 'released' || m === 'submitted' || !pr.funded) return {l:'', cls:'', diff:99};
    const base = ['2026-09-05','2026-09-12','2026-09-26','2026-10-10','2026-10-24'];
    const dueISO = base[i] || '2026-11-01';
    const today = new Date(2026, 8, 16), d = new Date(dueISO); const diff = Math.round((d - today) / 86400000);
    const S = t.strikes;
    if(diff < 0) return {l: S.overdue + ' ' + arNumerals(String(-diff), lang) + ' ' + S.days, cls:'due-late', diff};
    if(diff === 0) return {l: S.today, cls:'due-soon', diff};
    return {l: S.dueIn + ' ' + arNumerals(String(diff), lang) + ' ' + S.days, cls: diff <= 3 ? 'due-soon' : 'due-ok', diff};
  }
  _strikeCount(s, pid){ const ks = (s.strikes||[]).filter(k => k.pid === pid && k.status !== 'waived'); return ks.length ? Math.max(...ks.map(k => k.n)) : 0; }
  strikeMeter(s, t, lang, role){
    const S = t.strikes; if(role !== 'contractor') return {n:'0', title:S.none, sub:'', d1:'', d2:'', d3:'', hasDue:false, hasProject:false};
    const mine = s.projects.filter(p => p.contractorId === 'c1' && p.status === 'active');
    let worst = null, worstN = 0;
    mine.forEach(p => { const n = this._strikeCount(s, p.id); if(n > worstN){ worstN = n; worst = p; } });
    const p = worst || mine[0];
    let due = {l:'', cls:''};
    if(p){ const i = p.ms.findIndex(m => m !== 'released'); if(i >= 0) due = this.msDue(p, i, p.ms[i], t, lang); }
    const titles = ['', S.one, S.two, S.three], subs = [S.none, S.sub1, S.sub2, S.sub3];
    const lateTxt = this._lateTxt(p, t, lang);
    const subN = worstN ? (lateTxt ? String(subs[worstN]).replace('{d}', lateTxt) : (S.subWaiting || '')) : (p ? S.reset : '');
    return { n:String(worstN), title: worstN ? titles[worstN] : S.none, sub: subN, d1: worstN>=1?'on':'', d2: worstN>=2?'on':'', d3: worstN>=3?'on':'',
      hasDue: !!due.l, dueL: (p ? S.nextDue + ' · ' : '') + due.l, dueCls: due.cls, hasProject: !!p, pid: p ? p.id : '', pTitle: p ? this.L(p.title) : '' };
  }
  _lateTxt(pr, t, lang){
    if(!pr) return '';
    const i = pr.ms.findIndex(m => m !== 'released'); if(i < 0) return '';
    const d = this.msDue(pr, i, pr.ms[i], t, lang); const n = d && d.diff < 0 ? -d.diff : 0;
    if(!n) return '';
    return lang==='ar' ? (n===1?'يومًا واحدًا':n===2?'يومين':n+' أيام') : n+' days';
  }
  bidView(s, t, lang, pr){
    const b = s.bidF, W = t.ws, fmt = n => Number(n||0).toLocaleString('en-US');
    const r2 = n => Math.round(n*100)/100;
    const net = +b.price || 0;
    const vat = b.vatReg ? r2(net*0.15) : 0;
    const fee = r2(net*0.09), feeVat = r2(fee*0.15);
    const shares = [+b.ms1||0, +b.ms2||0, +b.ms3||0];
    const total = shares.reduce((a,c)=>a+c, 0);
    const warrantyOpts = W.wUnits || [], validOpts = W.vUnits || [];
    const dash = lang==='ar' ? 'لم يُحدَّد' : 'Not set';
    const summary = [
      {k: W.price, v: fmt(net) + (lang==='ar' ? ' ريال' : ' SAR')},
      b.vatReg ? {k: W.bidVatOn, v: fmt(vat) + (lang==='ar' ? ' ريال' : ' SAR')} : null,
      {k: W.bidGross, v: fmt(net + vat) + (lang==='ar' ? ' ريال' : ' SAR')},
      {k: W.days, v: b.days ? b.days + (lang==='ar' ? ' يومًا' : ' days') : dash},
      {k: W.fStart, v: b.start ? dateLong(b.start, lang==='ar') : dash},
      {k: W.fValid, v: b.valid || dash},
      {k: W.fWarranty, v: b.warranty || dash},
      {k: W.fMs, v: shares.join(' · ') + '%'},
      {k: W.fIncl, v: b.incl || dash},
      {k: W.fExcl, v: b.excl || dash},
      {k: W.fBrands, v: b.brands || dash},
      b.visit ? {k: W.fVisit, v: lang==='ar' ? 'نعم' : 'Yes'} : null
    ].filter(Boolean);
    return { ...b, summary, editing: b.step !== 'review', reviewing: b.step === 'review',
      net: fmt(net), vat: fmt(vat), gross: fmt(net + vat), noVat: !b.vatReg,
      overBudget: !!(pr && pr.max && net > pr.max),
      expectedNet: fmt(r2(net - fee - feeVat)),
      warrantyOpts, validOpts,
      msRows: [1,2,3].map(i => ({name:'ms'+i, value: b['ms'+i], label: (t.ws.ms && t.ws.ms[i-1] ? t.ws.ms[i-1].n : (lang==='ar'?'المرحلة '+i:'Stage '+i))})),
      msNote: total === 100 ? W.fMsNote : (lang==='ar' ? 'المجموع الحالي ' + total + '%. يجب أن يساوي 100%.' : 'Currently ' + total + '%. It must total 100%.'),
      msColor: total === 100 ? '#7A7994' : '#D9401F' };
  }
  projStrike(s, t, lang, role, pr){
    if(!pr || role !== 'contractor') return {show:false};
    const n = this._strikeCount(s, pr.id); if(!n) return {show:false};
    const S = t.strikes; const titles = ['', S.one, S.two, S.three], subs = ['', S.fee1, S.fee2, S.sub3];
    const lateNow = this._lateTxt(pr, t, lang);
    return {show:true, n:String(n), title:titles[n], sub: lateNow ? String(subs[n]||'').replace('{d}', lateNow) : (S.subWaiting || '')};
  }
  waView(s, t, lang, role){
    const W = t.wa, SG = s.setg || {};
    const ch = SG.channel || 'wa';
    const msgs = lang === 'ar'
      ? ['ترميم: وصل عرض جديد على «تجديد مطبخ، 18 م²» بقيمة 48٬000 ريال من مقاول موثّق. اضغط للمقارنة.', 'ترميم: مرحلة «الأعمال الأساسية» بانتظار اعتمادك. إن لم تتخذ إجراءً خلال 5 أيام تُحال للمراجعة.', 'ترميم: تذكير — موعد مرحلة «الأعمال الأساسية» خلال 48 ساعة. ارفع الإثبات لتجنّب غرامة 500 ريال.']
      : ['Tarmem: New bid on “Kitchen renovation, 18 m²” for SAR 48,000 from a verified contractor. Tap to compare.', 'Tarmem: Stage “Core works” is awaiting your approval. With no action in 5 days it goes to review.', 'Tarmem: Reminder — “Core works” is due in 48 hours. Submit evidence to avoid a SAR 500 late fee.'];
    const preview = role === 'contractor' ? msgs[2] : msgs[0];
    const log = [{text: msgs[1], st: W.read, cls:'tag-g'}, {text: msgs[0], st: W.delivered, cls:'tag-n'}, {text: msgs[2], st: W.queued, cls:'tag-p'}];
    return { on: !!SG.waVerified, number: SG.waNumber || SG.mobile || '', sentTo: SG.waSent || '', quiet: SG.prefs ? SG.prefs.quiet !== false : true,
      channels: [['wa', W.channels[0]], ['sms', W.channels[1]], ['email', W.channels[2]]].map(([id,l]) => ({id, l, on: ch === id ? 'true' : 'false'})),
      previewMsg: preview, previewTime: '10:42', log };
  }
  helpView(s, t, lang){
    const H = t.help, q = String(s.hcQ || '').trim().toLowerCase(), cat = s.hcCat || '';
    const arts = H.articles.filter(a => (!cat || a.c === cat) && (!q || (a.q + ' ' + a.a).toLowerCase().includes(q)));
    const catT = H.cats.find(c => c.id === cat);
    return { q: s.hcQ || '', cats: H.cats.map(c => ({...c, on: cat === c.id ? 'true' : 'false'})), articles: arts, empty: !arts.length, listTitle: catT ? catT.t : H.popular };
  }
  invView(s, t, lang, pr){
    const sel = s.invOpen; if(!sel || !pr) return {open:false};
    const ar = lang==='ar';
    const L = pr.ledger||[];
    const r2 = n => Math.round(n*100)/100;
    const money = n => fmt(n);
    const owner = this.D.USERS[pr.ownerId];
    const coName = this.con(pr.contractorId)?.name?.[lang] || '';
    const project = this.L(pr.title) + ' · ' + pr.id;
    const V = t.vat, W = t.ws;

    // legacy call sites still pass a bare invoice id
    if(typeof sel === 'string'){
      const fee = L.find(l => l.inv === sel && (l.label==='fee'||l.label==='commission')) || L.find(l => l.label === 'fee');
      if(!fee) return {open:false};
      const isComm = fee.label==='commission';
      const net = fee.amount, vat = r2(net*0.15);
      return { open:true, kind:'tax', title:V.invoice, no:sel, date: dateLong(fee.date, ar),
        buyer: isComm ? coName : (owner ? owner[lang] : ''), project,
        item: isComm ? W.ledgerComm : W.ledgerFee,
        net: money(net), vat: money(vat), total: money(net+vat), showVat:true, issuer:V.sellerName };
    }

    const l = L[sel.li]; if(!l) return {open:false};
    const msName = l.ms!=null && W.ms[l.ms] ? W.ms[l.ms].n : '';
    const entry = l.label==='fund' ? W.ledgerFund
      : l.label==='fee' ? W.ledgerFee
      : l.label==='vat' ? t.wallet.types.vat
      : l.label==='commission' ? W.ledgerComm
      : l.label==='commvat' ? W.ledgerCommVat
      : String(W.ledgerRelease).replace('{n}', msName);
    const date = dateLong(l.date, ar);
    const ref = l.inv || ('TRM-' + pr.id.replace(/\D/g,'') + '-' + String(sel.li+1).padStart(2,'0'));

    // 1. Payment receipt — issued by the payment provider, no VAT line
    if(sel.kind === 'receipt'){
      const amt = l.label==='vat' ? r2((L.find(x=>x.label==='fee'&&x.ms===l.ms)||{}).amount*0.15)
        : l.label==='commvat' ? r2((L.find(x=>x.label==='commission'&&x.ms===l.ms)||{}).amount*0.15)
        : l.amount;
      return { open:true, kind:'receipt', title:W.rcTitle, no:ref, date,
        buyer: owner ? owner[lang] : '', project, item: entry,
        net: money(amt), vat:'', total: money(amt), showVat:false, issuer:W.rcIssuer };
    }

    // 2. Contractor work invoice — issued by the contractor, for the milestone work
    if(sel.kind === 'work'){
      return { open:true, kind:'work', title:W.lgWorkInv, no:ref, date,
        buyer: owner ? owner[lang] : '', project,
        item: String(W.ledgerRelease).replace('{n}', msName),
        net: money(l.amount), vat:'', total: money(l.amount), showVat:false, issuer: coName || W.rcIssuer,
        note: W.workInvNote };
    }

    // 3. Tarmem tax invoice — issued by Tarmem, for its own fee only
    const base = ['vat'].includes(l.label) ? (L.find(x=>x.label==='fee'&&x.ms===l.ms)||{}).amount
      : ['commvat'].includes(l.label) ? (L.find(x=>x.label==='commission'&&x.ms===l.ms)||{}).amount
      : l.amount;
    const isComm = ['commission','commvat'].includes(l.label);
    const net = base||0, vat = r2(net*0.15);
    return { open:true, kind:'tax', title:V.invoice, no:(l.inv||ref), date,
      buyer: isComm ? coName : (owner ? owner[lang] : ''), project,
      item: isComm ? W.ledgerComm : W.ledgerFee,
      net: money(net), vat: money(vat), total: money(net+vat), showVat:true, issuer:V.sellerName };
  }
  // ---- late delivery & refunds ----
  _seedStrikes(){ return [
    {id:'k1', pid:'P-1041', cid:'c1', ms:2, late:4, n:1, fee:500, status:'charged', date:'2026-09-02'},
    {id:'k2', pid:'P-1041', cid:'c1', ms:2, late:6, n:2, fee:1500, status:'charged', date:'2026-09-09'},
    {id:'k3', pid:'P-1041', cid:'c1', ms:2, late:3, n:3, fee:0, status:'awaiting', date:'2026-09-15'},
    {id:'k4', pid:'P-0987', cid:'c5', ms:1, late:3, n:1, fee:500, status:'charged', date:'2026-05-21'}]; }
  _seedRefunds(){ return [
    {id:'R-3102', pid:'P-1058', by:'ho', amount:8500, reason:'cancelBefore', status:'requested', age:1},
    {id:'R-3097', pid:'P-1052', by:'ho', amount:1200, reason:'dup', status:'review', age:3},
    {id:'R-3081', pid:'P-0987', by:'ho', amount:250, reason:'fee', status:'approved', age:6},
    {id:'R-3064', pid:'P-0987', by:'co', amount:6000, reason:'prorata', status:'paid', age:19},
    {id:'R-3050', pid:'P-1041', by:'ho', amount:16000, reason:'notStarted', status:'declined', age:31}]; }
  lateView(s, t, lang){
    const A = t.admin.lr, fmt = n => Number(n).toLocaleString('en-US'), L = o => this.L(o);
    const strikes = s.strikes || [], refunds = s.refunds || [];
    const pTitle = pid => { const p = this.proj(pid); return p ? L(p.title) : pid; };
    const coName = cid => { const c = this.con(cid); return c ? c.name[lang] : ''; };
    const stCls = {charged:'tag-g', pending:'tag-n', awaiting:'tag-a', continued:'tag-n', cancelled:'tag-x', waived:'tag-x'};
    const rows = strikes.slice().sort((a,b) => a.date < b.date ? 1 : a.date > b.date ? -1 : b.n - a.n).map(k => ({ id:k.id, pid:k.pid, title:pTitle(k.pid), co:coName(k.cid), ms:t.ws.ms[k.ms] ? t.ws.ms[k.ms].n : '', late:arNumerals(String(k.late), lang) + ' ' + A.dayShort + ' · ' + k.date.slice(5).replace('-', '/'),
      n:arNumerals(String(k.n), lang), d1: k.n>=1?'on':'', d2: k.n>=2?'on':'', d3: k.n>=3?'on':'', fee: k.n===3 ? '—' : mny(k.fee), stL:A.st[k.status], stCls:stCls[k.status],
      canRemind: k.status==='awaiting', remindL: k.reminded ? A.reminded : A.remind, canWaive: k.status==='pending' || k.status==='charged' }));
    const rst = {requested:'tag-a', review:'tag-p', approved:'tag-g', paid:'tag-g', declined:'tag-x'};
    const rrows = refunds.map(r => ({ id:r.id, pid:r.pid, title:pTitle(r.pid), by: r.by==='sys' ? A.sys : r.by==='co' ? A.co : A.ho, age: arNumerals(String(r.age), lang) + ' ' + A.daysAgo, amount:fmt(r.amount), reason:A.reasons[r.reason] || r.reason, stL:A.rst[r.status], stCls:rst[r.status],
      canReview: r.status==='requested', canDecide: r.status==='review', canPay: r.status==='approved' }));
    const month = strikes.filter(k => k.date >= '2026-09-01');
    const kpis = [
      {v:arNumerals(String(month.length), lang), l:A.kStrikes, c:'#1B1464'},
      {v:arNumerals(fmt(month.filter(k=>k.status==='charged').reduce((a,k)=>a+k.fee,0)), lang), l:A.kFees, c:'#1B7A3E'},
      {v:arNumerals(String(strikes.filter(k=>k.status==='awaiting').length), lang), l:A.kDecisions, c:'#D9401F'},
      {v:arNumerals(fmt(refunds.filter(r=>['requested','review','approved'].includes(r.status)).reduce((a,r)=>a+r.amount,0)), lang), l:A.kRefunds, c:'#1B1464'},
      {v:arNumerals(fmt(refunds.filter(r=>r.status==='paid' && r.age <= 30).reduce((a,r)=>a+r.amount,0)), lang), l:A.kRefunded, c:'#1B1464'}];
    return { kpis, strikes: rows, refunds: rrows };
  }
  lateCaseVals(s, t, lang, pr, role){
    if(!pr || role !== 'homeowner') return { lateCase:false };
    const k = (s.strikes||[]).find(x => x.pid === pr.id && x.n === 3 && ['awaiting','continued','cancelled'].includes(x.status));
    if(!k) return { lateCase:false };
    const fmt = n => Number(n).toLocaleString('en-US');
    const rel = pr.ledger.filter(l=>l.label==='release').reduce((a,l)=>a+l.amount,0);
    const escrow = Math.max(0, (pr.amount||0) - rel);
    const c = this.con(k.cid); const pick = s.latePick || '';
    const P = t.pen; const refund = (s.refunds||[]).find(r => r.pid === pr.id && r.reason === 'thirdStrike');
    const stCls = {awaiting:'tag-a', continued:'tag-n', cancelled:'tag-x'};
    return { lateCase:true, lateOpen: k.status==='awaiting', lateDone: k.status!=='awaiting', lateCo: c ? c.name[lang] : '', lateEscrow: fmt(escrow), lateStL: (k.status==='awaiting' ? t.pen.stAwait : t.admin.lr.st[k.status]), lateStCls: stCls[k.status],
      latePickCont: pick==='continue' ? 'true' : 'false', latePickCancel: pick==='cancel' ? 'true' : 'false', lateNoPick: !pick,
      lateDoneText: k.status==='continued' ? P.hoDoneCont : (P.hoDoneCancel + ' ' + (refund ? refund.id : '') + ' ' + P.hoDoneCancel2),
      latePick: e => this.setState({latePick:e.currentTarget.dataset.d}),
      lateConfirm: () => { if(!pick) return;
        const strikes = (s.strikes||[]).map(x => x.id===k.id ? {...x, status: pick==='continue' ? 'continued' : 'cancelled'} : x);
        let refunds = s.refunds || [];
        if(pick==='cancel'){ refunds = [{id:'R-' + (3100 + refunds.length + 3), pid:pr.id, by:'sys', amount:escrow, reason:'thirdStrike', status:'approved', age:0}, ...refunds]; }
        this.setState({strikes, refunds, latePick:''}); } };
  }
  // ---- promo codes & affiliates ----
  _genCode(){ const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c='TR'; for(let k=0;k<6;k++) c+=A[Math.floor(Math.random()*A.length)]; return c; }
  _copy(text){ try{ navigator.clipboard && navigator.clipboard.writeText(text); }catch(e){} }
  _seedPromos(){ return [
    {id:'pm0', code:'GIFT500', type:'fix', value:500, applies:'ho', min:0, max:null, per:1, start:'2026-09-16', end:'2026-12-16', note:'Auto-applied welcome gift · first-time homeowners', uses:0, saved:0, paused:false, archived:false},
    {id:'pm1', code:'WELCOME10', type:'pct', value:10, applies:'ho', min:0, max:500, per:1, start:'2026-08-01', end:'2026-12-31', note:'First project · onboarding email', uses:212, saved:38400, paused:false, archived:false},
    {id:'pm2', code:'RIYADH250', type:'fix', value:250, applies:'ho', min:20000, max:200, per:1, start:'2026-09-01', end:'2026-09-30', note:'Riyadh outdoor campaign', uses:74, saved:18500, paused:false, archived:false},
    {id:'pm3', code:'PROFEE5', type:'pct', value:5, applies:'co', min:50000, max:null, per:3, start:'2026-09-15', end:null, note:'Verified contractors · retention', uses:9, saved:6200, paused:false, archived:false},
    {id:'pm4', code:'EID2026', type:'pct', value:15, applies:'both', min:0, max:1000, per:1, start:'2026-05-20', end:'2026-06-10', note:'Eid al-Adha promotion', uses:1000, saved:91000, paused:false, archived:false},
    {id:'pm5', code:'LAUNCH20', type:'pct', value:20, applies:'ho', min:0, max:300, per:1, start:'2026-03-01', end:'2026-04-30', note:'Launch month', uses:288, saved:52300, paused:true, archived:false}]; }
  _seedAff(){ return [
    {id:'af1', name:'Studio Noor', type:'designer', rate:25, code:'NOOR', contact:'hello@studionoor.sa', clicks:1840, signups:126, projects:31, earned:42300, owed:6800, paused:false},
    {id:'af2', name:'Bayt Talks', type:'creator', rate:20, code:'BAYT', contact:'@bayttalks', clicks:6210, signups:402, projects:58, earned:61900, owed:11250, paused:false},
    {id:'af3', name:'Dar Al-Sakan Realty', type:'agency', rate:15, code:'DARSAKAN', contact:'partners@daralsakan.sa', clicks:920, signups:64, projects:19, earned:18700, owed:0, paused:false},
    {id:'af4', name:'Al-Otaibi Contracting', type:'contractor', rate:10, code:'OTAIBI', contact:'+966 55 000 0000', clicks:310, signups:22, projects:6, earned:4100, owed:1400, paused:true}]; }
  promoView(s, t, lang){
    const P = t.admin.pm, today = '2026-09-16', fmt = n => Number(n).toLocaleString('en-US');
    const list = s.promos || [], d = s.pmDraft;
    const appliesL = {ho:P.applies[0], co:P.applies[1], both:P.applies[2]};
    const status = p => p.archived ? 'archived' : p.paused ? 'paused' : (p.end && p.end < today) ? 'expired' : (p.start > today) ? 'scheduled' : (p.max && p.uses >= p.max) ? 'exhausted' : 'active';
    const stCls = {active:'tag-g', scheduled:'tag-n', paused:'tag-p', expired:'tag-x', exhausted:'tag-x', archived:'tag-x'};
    const dateL = iso => { const [y,m,dd] = iso.split('-'); return arNumerals(Number(dd) + ' ' + t.admin.an.months[Number(m)-1], lang); };
    const rows = list.filter(p=>!p.archived).map(p => { const st = status(p); return {
      id:p.id, code:p.code, note:p.note, disc: p.type==='pct' ? p.value + P.pct : fmt(p.value) + ' ' + P.off, minL: p.min ? P.minShort + ' ' + fmt(p.min) : '',
      appliesL: appliesL[p.applies], usesL: fmt(p.uses) + ' / ' + (p.max ? fmt(p.max) : P.unlimited), usePct: p.max ? Math.min(100, Math.round(p.uses/p.max*100)) : (p.uses ? 12 : 0),
      window: dateL(p.start) + ' – ' + (p.end ? dateL(p.end) : P.noEnd), stL: P.st[st], stCls: stCls[st],
      copyL: s.copied===p.code ? P.copied : P.copy, canToggle: st==='active' || st==='paused' || st==='scheduled', toggleL: p.paused ? P.resume : P.pause, canArchive: st!=='active' }; });
    const active = list.filter(p=>status(p)==='active').length;
    const monthShare = {pm1:61, pm2:74, pm3:9};
    const monthUses = list.filter(p=>!p.archived).reduce((a,p)=>a + (monthShare[p.id] ?? p.uses), 0);
    const saved = list.filter(p=>!p.archived).reduce((a,p)=>a+p.saved,0);
    return { open: !!d, closed: !d, d: d || {}, err: d && d.err, unit: d && d.type==='fix' ? 'SAR' : '%',
      types: [{id:'pct', l:P.types[0], on: d && d.type==='pct' ? 'true' : 'false'}, {id:'fix', l:P.types[1], on: d && d.type==='fix' ? 'true' : 'false'}],
      appliesOpts: [{id:'ho', l:P.applies[0]}, {id:'co', l:P.applies[1]}, {id:'both', l:P.applies[2]}],
      kpis: [{v:arNumerals(String(active), lang), l:P.kActive}, {v:arNumerals(fmt(monthUses), lang), l:P.kRedeemed}, {v:arNumerals(fmt(saved), lang), l:P.kDiscounted}, {v:arNumerals(fmt(46800), lang), l:P.kAov}],
      rows };
  }
  affView(s, t, lang){
    const A = t.admin.af, fmt = n => Number(n).toLocaleString('en-US');
    const list = s.affiliates || [], d = s.afDraft;
    const typeIds = ['contractor','creator','agency','designer','other'];
    const typeL = id => A.types[Math.max(0, typeIds.indexOf(id))];
    const rows = list.map(a => ({ id:a.id, name:a.name, typeL:typeL(a.type), rate:a.rate, link:A.linkBase + a.code, clicks:fmt(a.clicks), signups:fmt(a.signups), projects:fmt(a.projects), earned:fmt(a.earned), owed:fmt(a.owed), owedC: a.owed ? '#D9401F' : '#7A7994',
      stL: a.paused ? A.st.paused : A.st.active, stCls: a.paused ? 'tag-p' : 'tag-g', copyL: s.copied===A.linkBase + a.code ? A.copied : A.copyLink, canPay: a.owed > 0, toggleL: a.paused ? A.resume : A.pause }));
    const sum = k => list.filter(a=>!a.paused).reduce((x,a)=>x+a[k],0);
    return { open: !!d, closed: !d, d: d || {}, err: d && d.err,
      typeOpts: typeIds.map(id=>({id, l:typeL(id)})),
      kpis: [{v:arNumerals(String(list.filter(a=>!a.paused).length), lang), l:A.kPartners, c:'#1B1464'}, {v:arNumerals(fmt(sum('clicks')), lang), l:A.kClicks, c:'#1B1464'}, {v:arNumerals(fmt(sum('signups')), lang), l:A.kSignups, c:'#1B1464'}, {v:arNumerals(fmt(sum('projects')), lang), l:A.kProjects, c:'#1B7A3E'}, {v:arNumerals(fmt(list.reduce((x,a)=>x+a.owed,0)), lang), l:A.kOwed, c:'#D9401F'}],
      rows, terms: A.termsL.map(([k,v])=>({k,v})) };
  }
  // ---- analytics (simulated; swap for GA4 Data API responses later) ----
  _rng(seed){ let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
  _series(range){
    const n = range==='week' ? 7 : range==='month' ? 30 : 12;
    const r = this._rng(range==='week' ? 11 : range==='month' ? 23 : 37);
    const out = []; for(let k = 0; k < n; k++){
      const wk = range==='year' ? 1 : (k % 7 === 5 || k % 7 === 6 ? .78 : 1);
      const base = range==='year' ? 7800 + k * 520 : 340 + k * (range==='week' ? 9 : 2.4);
      out.push(Math.round(base * wk * (0.86 + r() * .3)));
    } return out;
  }
  analytics(s, t, lang){
    const A = t.admin.an, range = s.anRange || 'week';
    const fmt = n => arNumerals(Number(n).toLocaleString('en-US'), lang);
    const vals = this._series(range), prev = this._series(range).map(v => Math.round(v * .91));
    const total = vals.reduce((a,b)=>a+b,0), ptotal = prev.reduce((a,b)=>a+b,0);
    const W = 640, H = 200, top = 12, bot = 190, max = Math.max(...vals) * 1.08, min = 0;
    const X = k => vals.length === 1 ? W/2 : Math.round((k / (vals.length - 1)) * (W - 16) + 8);
    const Y = v => Math.round(bot - ((v - min) / (max - min)) * (bot - top));
    const pts = vals.map((v,k)=>[X(k), Y(v)]);
    const line = pts.map((p,k)=>(k?'L':'M') + p[0] + ' ' + p[1]).join(' ');
    const area = line + ' L' + pts[pts.length-1][0] + ' ' + bot + ' L' + pts[0][0] + ' ' + bot + ' Z';
    const today = new Date(2026, 8, 16);
    let labels;
    if(range==='week'){ labels = vals.map((_,k)=>{ const d = new Date(today); d.setDate(d.getDate() - (6 - k)); return A.days[d.getDay()]; }); }
    else if(range==='month'){ labels = vals.map((_,k)=>{ const d = new Date(today); d.setDate(d.getDate() - (29 - k)); return (k % 5 === 4 || k === 0) ? arNumerals(String(d.getDate()), lang) + ' ' + A.months[d.getMonth()] : ''; }).filter(Boolean); }
    else { labels = vals.map((_,k)=> A.months[(today.getMonth() + 1 + k) % 12]); }
    const delta = (a, b) => { const d = b ? Math.round(((a - b) / b) * 100) : 0; return {d:(d >= 0 ? '+' : '−') + arNumerals(String(Math.abs(d)), lang) + '%', cls: d >= 0 ? 'an-up' : 'an-down'}; };
    const tdl = delta(total, ptotal);
    const share = (labelsArr, weights, unit) => { const sum = weights.reduce((a,b)=>a+b,0); const mx = Math.max(...weights); return labelsArr.map((l,k)=>({l, v: unit==='%' ? arNumerals(String(Math.round(weights[k]/sum*100)), lang) + '%' : fmt(weights[k]), pct: Math.round(weights[k]/mx*100)})); };
    const tv = 412, py = 1873, su = 23, po = 9;
    const todayRows = [
      {v:fmt(tv), l:A.kVisitors, ...delta(tv, 371)}, {v:fmt(py), l:A.kViews, ...delta(py, 1690)},
      {v:fmt(su), l:A.kSignups, ...delta(su, 17)}, {v:fmt(po), l:A.kPosts, ...delta(po, 11)},
      {v:arNumerals('4:12', lang) + ' ' + A.min, l:A.kAvg, ...delta(252, 236)}, {v:arNumerals('38', lang) + '%', l:A.kBounce, ...delta(38, 41)}];
    return {
      total: fmt(total), totalDelta: tdl.d, totalCls: tdl.cls,
      ranges: ['week','month','year'].map((id,k)=>({id, l:A.ranges[k], on: range===id ? 'true' : 'false'})),
      line, area, labels, dots: range==='month' ? [] : pts.slice(0,-1).map(p=>({x:p[0], y:p[1]})), lastX: pts[pts.length-1][0], lastY: pts[pts.length-1][1],
      today: todayRows,
      topPages: share(A.pages, [5210, 2840, 2310, 1620, 1180, 760, 540], 'n'),
      sources: share(A.srcs, [38, 27, 14, 9, 7, 5], '%'),
      cities: share(A.citiesL, [41, 22, 13, 9, 8, 7], '%'),
      gaOn: !!s.gaId, gaOff: !s.gaId, gaId: s.gaId || '', gaDraft: s.gaDraft || '', gaErr: !!s.gaErr,
      srcLabel: s.gaId ? 'GA4 · ' + s.gaId : A.simulated, srcCls: s.gaId ? 'tag-g' : 'tag-n'
    };
  }
  liveView(s, t, lang){
    const A = t.admin.an, tick = s.liveTick || 0;
    const r = this._rng(9001 + tick);
    const now = 34 + Math.round(9 * Math.sin(tick / 4)) + Math.round(r() * 5);
    const pw = [0.36, 0.17, 0.15, 0.11, 0.09, 0.07, 0.05].map((w,k)=> Math.max(0, w + (r() - .5) * .04));
    const psum = pw.reduce((a,b)=>a+b,0); let acc = 0;
    const counts = pw.map((w,k)=>{ const c = k === pw.length - 1 ? now - acc : Math.round(now * w / psum); acc += c; return c; });
    const cmax = Math.max(...counts);
    const dv = [58, 37, 5].map((p,k)=> Math.max(1, Math.round(p + (k===0 ? 1 : -1) * Math.round(3 * Math.sin(tick / 5)))));
    const feed = (s.liveFeed || []).map(f => ({ city: A.citiesL[f.c], what: A.ev[f.e], when: f.age === 0 ? A.now : f.age < 60 ? arNumerals(String(f.age), lang) + ' ' + A.secAgo : arNumerals(String(Math.round(f.age/60)), lang) + ' ' + A.minAgo }));
    return { now: arNumerals(String(now), lang),
      devices: A.dev.map((l,k)=>({l, pct: dv[k]})),
      pages: A.pages.slice(0,5).map((l,k)=>({l, v: arNumerals(String(counts[k]), lang), pct: Math.round(counts[k]/cmax*100)})),
      feed };
  }
  startLive(){ if(this._live) return;
    const seedFeed = [{c:0,e:0,age:4},{c:1,e:4,age:19},{c:0,e:5,age:41},{c:2,e:3,age:76},{c:3,e:1,age:130},{c:0,e:2,age:205}];
    if(!this.state.liveFeed) this.setState({liveFeed: seedFeed});
    this._live = setInterval(() => { const s = this.state; if(s.route !== 'admin' || s.atab !== 'analytics') return;
      const tick = (s.liveTick || 0) + 1, r = this._rng(777 + tick);
      let feed = (s.liveFeed || []).map(f => ({...f, age: f.age + 3}));
      if(tick % 3 === 0) feed = [{c: Math.floor(r() * 6), e: Math.floor(r() * 7), age: 0}, ...feed].slice(0, 6);
      this.setState({liveTick: tick, liveFeed: feed}); }, 3000); }
  heroStart(){ clearInterval(this._rot); }
  _unmountTimers(){ clearInterval(this._live); clearInterval(this._vidT); if(this._vidKick) document.removeEventListener('pointerdown', this._vidKick); window.removeEventListener('pointermove', this.heroParallax); clearInterval(this._rot); clearTimeout(this._resume); cancelAnimationFrame(this._statRaf); clearTimeout(this._statLead); clearTimeout(this._statRetry); if(this._statIO) this._statIO.disconnect(); }
  _authFinish(rl){ const s=this.state, f=s.auth.f, lang=s.lang; clearTimeout(this._naf);
    const fb = rl==='homeowner' ? (this.D.USERS['h1']?.[lang]) : (this.D.CONTRACTORS[0]?.name?.[lang]);
    const name = f.name || fb || '';
    this.setState({user:{role:rl,name:rl==='contractor'?(f.company||name):name,nafath:false}, auth:{...s.auth,step:1,error:'',naf:'idle',nafCode:null,f:{...s.auth.f,otp:''}}});
    const firstTime = rl==='homeowner' && s.auth.mode==='signup' && !s.gift;
    if(firstTime) this.setState({gift:{code:'GIFT500-' + this._genCode().slice(2,6), used:false, seen:false}});
    if(s.pendingPost&&rl==='homeowner'){ this.publishPost(); return; }
    this.nav(rl==='homeowner'?'hdash':'cdash');
    if(firstTime) setTimeout(() => this.setState(st => ({gift:{...st.gift, open:true}})), 650); }
  scrub(txt){ const H=this.D.T[this.state.lang].ws.msgHidden;
    return String(txt).replace(/(\+?\d[\d\s\-()]{6,}\d)/g,H).replace(/[\w.+-]+@[\w-]+\.[\w.]+/g,H).replace(/((https?:\/\/|www\.)\S+)/gi,H).replace(/(واتس\S*|whats\s?app|تيليجرام|تلي?جرام|تلغرام|telegram)/gi,H); }
  L(o){ return o && typeof o==='object' && !Array.isArray(o) && (o.en!==undefined) ? (o[this.state.lang] ?? o.en) : o; }
  watchScroll(){ if(this._sc) return;
    let raf=0; this._sc=()=>{ if(raf) return; raf=requestAnimationFrame(()=>{ raf=0;
      const on = window.scrollY > 640, tp = window.scrollY > 24, u = {};
      if(on !== this.state.scrolled) u.scrolled = on;
      if(tp !== this.state.topped) u.topped = tp;
      if(Object.keys(u).length) this.setState(u); }); };
    window.addEventListener('scroll', this._sc, {passive:true}); }
  componentWillUnmount(){ this._unmountTimers(); clearTimeout(this._onl); if(this._sc) window.removeEventListener('scroll', this._sc); if(this._pm) window.removeEventListener('pointermove', this._pm); }
  watchPointer(){ if(this._pm) return;
    let tx=0,ty=0,cx=0,cy=0,raf=0,el=null;
    const get=()=>{ if(!el||!el.isConnected) el=document.querySelector('.v-stage'); return el; };
    const clamp=v=>Math.max(-1,Math.min(1,v));
    const loop=()=>{ cx+=(tx-cx)*0.075; cy+=(ty-cy)*0.075; const e=get();
      if(e){ e.style.setProperty('--px', cx.toFixed(4)); e.style.setProperty('--py', cy.toFixed(4)); }
      raf = (Math.abs(tx-cx)>0.0015 || Math.abs(ty-cy)>0.0015) ? requestAnimationFrame(loop) : 0; };
    this._pm = ev => { const e=get(); if(!e) return; const r=e.getBoundingClientRect(); if(!r.width) return;
      tx=clamp(((ev.clientX-r.left)/r.width-0.5)*2); ty=clamp(((ev.clientY-r.top)/r.height-0.5)*2);
      if(!raf) raf=requestAnimationFrame(loop); };
    window.addEventListener('pointermove', this._pm, {passive:true}); }
  bKeys(){ return ['type','city','space','scope','budget','timing']; }
  async askAssistant(){
    const st=this.state, lang=st.lang, T=this.D.T[lang];
    const convo = st.plan.msgs.map(m=>({role: m.role==='user'?'user':'assistant', content:m.text}));
    if(!convo.length || convo[0].role!=='user') return;
    const sys = `You are the brief assistant for Tarmem, a Saudi home-renovation marketplace connecting homeowners with verified contractors.
Read the homeowner's messages and extract a renovation brief.
Reply with JSON only — no prose, no code fences — in exactly this shape:
{"type":"","city":"","space":"","scope":"","budget":"","timing":"","missing":[],"question":"","done":false}
Rules:
- Write every value in ${lang==='ar'?'Arabic':'English'}.
- "city" must be one of: ${lang==='ar'?'الرياض، جدة، الشرقية':'Riyadh, Jeddah, Eastern Province'}. Leave it empty if the homeowner named no city or a different one.
- Leave a field as "" when the homeowner has not stated it. Never invent, estimate or assume — especially budget.
- "missing" lists the field names that are still empty and worth asking about.
- "question": ask about at most two missing fields in one short sentence. When nothing important is missing set "done" to true and make "question" one confirming sentence.
- Never give prices, cost ranges, or feasibility advice.`;
    this.setState(p=>({plan:{...p.plan, busy:true, error:''}}));
    try{
      const raw = await claude.complete({model:'claude-haiku-4-5', max_tokens:700, system:sys, messages:convo});
      const j = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}')+1));
      this.setState(p=>{
        const pl=p.plan, nb={...pl.brief};
        this.bKeys().forEach(k=>{ if(!pl.touched.includes(k) && !nb[k] && j[k]) nb[k]=String(j[k]).trim(); });
        const q=String(j.question||'').trim();
        return {plan:{...pl, brief:nb, busy:false, done:!!j.done, question:q, msgs: q ? [...pl.msgs,{role:'ai',text:q}] : pl.msgs}};
      });
    }catch(e){ this.setState(p=>({plan:{...p.plan, busy:false, error:aiErrorText(e, this.state.lang, T.ai.err)}})); }
  }
  async runMatchAI(){
    const st=this.state, lang=st.lang, T=this.D.T[lang], b=st.plan.brief;
    const cityRec = this.D.CITIES.find(c=>c.ar===b.city||c.en===b.city||c.id===b.city);
    const verified = st.contractors.filter(c=>c.verified);
    const pool = cityRec ? verified.filter(c=>c.city===cityRec.id) : verified;
    const cands = (pool.length?pool:verified).map(c=>({id:c.id, name:c.name[lang],
      city:(this.D.CITIES.find(x=>x.id===c.city)||{})[lang],
      specialities:c.trades.map(id=>{const x=this.D.TRADES.find(y=>y.id===id); return x?x[lang]:id;}),
      rating:c.rating, reviews:c.reviews, completedProjects:c.done, onTimePercent:c.onTime, responseHours:c.response, activeSince:c.since}));
    this.setState(p=>({plan:{...p.plan, matching:true, matches:[], error:''}}));
    try{
      const sys = `You rank contractors for a renovation brief on Tarmem. Reply with JSON only: {"matches":[{"id":"c1","why":"..."}]}
Rules:
- At most 4 contractors, best first, ids taken only from the provided records.
- "why" is one sentence in ${lang==='ar'?'Arabic':'English'} citing only facts present in that contractor's record (speciality, city, completed projects, rating, on-time percentage, response hours, years active).
- Never invent facts, prices, availability, or promises.`;
      const raw = await claude.complete({model:'claude-haiku-4-5', max_tokens:800, system:sys,
        messages:[{role:'user', content:'Brief: '+JSON.stringify(b)+String.fromCharCode(10,10)+'Contractor records: '+JSON.stringify(cands)}]});
      const j = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}')+1));
      const list=(j.matches||[]).filter(m=>cands.some(c=>c.id===m.id)).slice(0,4);
      this.setState(p=>({plan:{...p.plan, matching:false, matches:list}}));
    }catch(e){ this.setState(p=>({plan:{...p.plan, matching:false, error:aiErrorText(e, this.state.lang, T.ai.err)}})); }
  }
  nav(route, extra={}){ this.setState(s=>{
      const here = {route:s.route, curId:s.curId, tab:s.tab};
      const hist = (route===s.route && (extra.curId||s.curId)===s.curId) ? (s.hist||[]) : [...(s.hist||[]), here].slice(-20);
      return {route, hist, ...extra};
    }); window.scrollTo(0,0); }
  goBack(){ this.setState(s=>{
      const hist=[...(s.hist||[])]; const prev=hist.pop(); if(!prev) return {};
      return {route:prev.route, curId:prev.curId, tab:prev.tab, hist, menuOpen:false, navOpen:false};
    }); window.scrollTo(0,0); }
  proj(id){ return this.state.projects.find(p=>p.id===id); }
  con(id){ return this.state.contractors.find(c=>c.id===id); }
  updProj(id, fn){ this.setState(s=>({projects:s.projects.map(p=>p.id===id?fn({...p}):p)})); }
  ev(p,i){ return (p.ev && p.ev[i]) || {p:false,v:false,o:false}; }
  setEv(pid,i,key){ this.updProj(pid, p=>{ const ev=(p.ev||p.ms.map(()=>({p:false,v:false,o:false}))).map((x,j)=> j===i ? {...x,[key]:true} : x); return {...p,ev}; }); }
  msAmounts(p){ const t=this.D.T[this.state.lang].ws.ms; return t.map(m=>Math.round(p.amount*m.p)); }
  feeOf(a){ const r2=n=>Math.round(n*100)/100; const fee=Math.round(a*0.01), feeVat=r2(fee*0.15), comm=Math.round(a*0.09), commVat=r2(comm*0.15); return {fee, feeVat, hoTotal:a+fee+feeVat, comm, commVat, coGross:a-comm, coNet:a-comm-commVat}; }
  coNet(a){ return this.feeOf(a).coNet; }
  pct(p){ if(!p.ms.length) return 0;
    const ws=this.D.T[this.state.lang].ws.ms||[];
    const tot=p.ms.reduce((a,m,i)=>a+(ws[i]?.p||0),0);
    if(!tot) return Math.round(p.ms.filter(s=>s==='released').length/p.ms.length*100);
    const done=p.ms.reduce((a,m,i)=>a+(m==='released'?(ws[i]?.p||0):0),0);
    return Math.round(done/tot*100); }
  statusOf(p){ if(p.status==='active' && !p.funded) return 'funding'; return p.status; }

  // Suggested budget: a published Saudi unit rate (PRICE_GUIDE) × the size the homeowner described, or a typical size when they gave none.
  sugFor(f){
    const G=(this.D.PRICE_GUIDE||{})[f.trade];
    if(!G){ const B=(this.D.BUDGETS||{})[f.trade]; return B ? {lo:B[0], hi:B[1], q:0, u:'job', typ:true, c:'l'} : null; }
    const txt=(String(f.title||'')+' '+String(f.desc||'')).replace(/[٠-٩]/g, d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/٫/g,'.');
    const num=v=>parseFloat(String(v).replace(',','.'));
    const dm=txt.match(/(\d+(?:[.,]\d+)?)\s*(?:م|m|متر)?\s*(?:[x×*]|في)\s*(\d+(?:[.,]\d+)?)/i);
    const sq=txt.match(/(\d+(?:[.,]\d+)?)\s*(?:م²|م2|م\s*مربع|متر\s*مربع|مترًا\s*مربعًا|مترا\s*مربعا|m²|m2|sqm|sq\.?\s*m|square\s*met)/i);
    const loose=!sq && !dm && txt.match(/(\d{2,4})\s*(?:مترًا|مترا|متر|م)(?!\s*(?:طولي|ط))(?![\u0600-\u06FF²2])/);
    const a=dm?num(dm[1]):0, b=dm?num(dm[2]):0, dims = a>=1&&a<=60&&b>=1&&b<=60;
    let area = sq ? num(sq[1]) : dims ? a*b : loose ? num(loose[1]) : 0; if(!(area>=2&&area<=5000)) area=0;
    const COUNT={bath:/(\d+)\s*(?:حمام|دورات?\s*مياه|bath)/i, wet:/(\d+)\s*(?:حمام|دورات?\s*مياه|مطبخ|مطابخ|bath|kitchen)/i, door:/(\d+)\s*(?:باب|[أا]بواب|door)/i, ac:/(\d+)\s*(?:مكيف|وحد|unit|split)/i, heater:/(\d+)\s*(?:سخان|heater)/i, camera:/(\d+)\s*(?:كامير|camera)/i};
    let q=0;
    if(G.u==='m2'){ if(area && G.k) q=area*G.k; }
    else if(G.u==='lm'){ const m=txt.match(/(\d+(?:[.,]\d+)?)\s*(?:متر\s*طولي|م\.?\s*ط(?![\u0600-\u06FF])|lm\b|linear)/i);
      if(m) q=num(m[1]);
      // a kitchen's cabinets run along two walls (an L), and the market counts upper and lower cabinets separately
      else if(f.trade==='kitchen' && (dims||area)) q=2*Math.min(14, Math.max(3, dims ? a+b-1 : 2*Math.sqrt(area)-1)); }
    else if(G.u==='point'){ const m=txt.match(/(\d+)\s*(?:نقطة|نقاط|point)/i); if(m) q=+m[1]; else if(area&&G.p) q=Math.round(area*G.p); }
    else if(G.u==='kw'){ const m=txt.match(/(\d+(?:[.,]\d+)?)\s*(?:كيلو\s*واط|kw|kilowatt)/i); if(m) q=num(m[1]); }
    else if(G.u==='unit' && G.n){ const m=txt.match(COUNT[G.n]); if(m) q=+m[1];
      else if(G.n==='bath'||G.n==='wet'){ if(/حمامين|حمامان/.test(txt)) q=2; else if(G.n==='bath' && /حمام(?!ات)|bathroom(?!s)/i.test(txt)) q=1; } }
    const typ=!(q>0); if(typ) q=G.q||1;
    const step=v=>v>=50000?1000:500, rnd=v=>Math.max(step(v), Math.round(v/step(v))*step(v));
    const floor=Math.max(1000, rnd(G.lo*(G.q||1)*0.1)); // unit rates do not scale down to very small jobs
    let lo=Math.max(floor, rnd(G.lo*q)), hi=Math.max(lo+step(lo), rnd(G.hi*q));
    if(hi>1000000){ hi=1000000; lo=Math.min(lo, 900000); } // the platform's ceiling for one project
    return {lo, hi, q:Math.round(q*10)/10, u:G.u, typ, c:G.c};
  }

  publishPost(){
    const {post} = this.state; const f=post.f;
    const id = 'P-'+(1060+this.state.projects.filter(p=>p.ownerId==='h1').length);
    const np = {id, title:{en:f.title,ar:f.title}, desc:{en:f.desc,ar:f.desc}, trade:f.trade, city:f.city, min:+f.min, max:+f.max, timing:f.timing, status:'open', ownerId:'h1', contractorId:null, amount:0, funded:false, posted:{en:this.D.T.en.ws.today,ar:this.D.T.ar.ws.today}, bids:[], ms:[], msgs:[], files:post.files.map(n=>({name:n,by:'h',date:{en:this.D.T.en.ws.today,ar:this.D.T.ar.ws.today}})), ledger:[]};
    this.setState(s=>({projects:[np,...s.projects], post:{step:1,f:{title:'',trade:'kitchen',desc:'',city:'riyadh',address:'',min:'',max:'',timing:'month'},files:[],error:''}, pendingPost:false}));
    this.nav('project', {curId:id, tab:'overview'});
  }

  renderVals(){
    const s=this.state; if(!s.ready || !this.D) return { dir: s.lang==='ar'?'rtl':'ltr' };
    const T=this.D.T[s.lang], t=T, L=o=>this.L(o), lang=s.lang;
    const role = s.user?.role || null;
    const r = {}; r[s.route]=true;
    const cur = {}; cur[s.route]='page';
    __AR = lang==='ar';
    const curPre = __AR ? '' : 'SAR ', curPost = __AR ? ' ريال' : '', curLbl = __AR ? 'ريال' : 'SAR';
    const cityL = id => { const c=this.D.CITIES.find(c=>c.id===id); return c ? c[lang] : this.D.CITIES[0][lang]; };
    const tradeL = id => { const x=this.D.TRADES.find(c=>c.id===id); return x?x[lang]:id; };
    const cName = id => { const c=this.con(id); return c?c.name[lang]:t.ws.unassigned; };
    const uName = id => this.D.USERS[id]?.[lang] || id;
    const decorateC = c => ({...c, name:c.name[lang], city:cityL(c.city), imgId:'img-'+c.id, tradeLabels:c.trades.map(tradeL), tradeLine:c.trades.map(tradeL).join(' · '), top:c.rating>=4.8, vNoteOpen:s.vNote===c.id, saveLabel:s.saved.includes(c.id)?t.search.saved:t.search.save, savedFlag:s.saved.includes(c.id)?'true':'false', pending:!c.verified, bio:c.bio[lang]});
    const AUTO_DAYS = 7;
    const daysN = n => { if(lang!=='ar') return n+(n===1?' day':' days');
      if(n===1) return 'يوم واحد'; if(n===2) return 'يومان';
      return n<=10 ? n+' أيام' : n+' يومًا'; };
    const revsN = n => { if(lang!=='ar') return n+(n===1?' review':' reviews');
      if(n===1) return 'تقييم واحد'; if(n===2) return 'تقييمان';
      return n<=10 ? n+' تقييمات' : n+' تقييمًا'; };
    const bidsN = n => { if(!n) return t.browse.noBids;
      if(lang!=='ar') return n+' '+(n===1?'bid':'bids');
      if(n===1) return 'عرض واحد'; if(n===2) return 'عرضان';
      return n<=10 ? n+' عروض' : n+' عرضًا'; };
    const maskName = full => { const parts=String(full||'').trim().split(/\s+/); if(parts.length<2) return full||'';
      const last=parts[parts.length-1].replace(/^ال/, ''); return parts[0]+' '+(last||parts[parts.length-1]).charAt(0)+'.'; };
    const decorateP = p => { const st=this.statusOf(p); const oFull=this.D.USERS[p.ownerId]?.[lang] || p.ownerId;
      const oHidden = role==='contractor' && !(p.contractorId==='c1' && p.status!=='open');
      return {...p, title:L(p.title), desc:L(p.desc), ownerName: oHidden ? maskName(oFull) : oFull, cityLabel:cityL(p.city), bidsLabel: bidsN(p.bids.length), tradeLabel:tradeL(p.trade), budgetLabel:mnyR(p.min,p.max), budgetFull:(lang==='ar'?'من '+fmt(p.min)+' إلى '+fmt(p.max)+' ريال':'SAR '+fmt(p.min)+' – '+fmt(p.max)),
      budgetSentence: (lang==='ar' ? t.browse.budgetPre+' '+fmt(p.min)+' '+t.browse.budgetTo+' '+fmt(p.max)+' ريال' : t.browse.budgetPre+' SAR '+fmt(p.min)+' '+t.browse.budgetTo+' '+fmt(p.max)),
      postedLabel: (L(p.posted)===t.ws.today ? L(p.posted) : t.browse.postedOn+' '+dateLong(L(p.posted), lang==='ar')), statusLabel:t.ws.st[st], tagClass:STATUS_TAG[st], bidCount:p.bids.length, pct:this.pct(p), amount:fmt(p.amount||0), contractorName:cName(p.contractorId), ownerName:uName(p.ownerId), timingLabel:t.post[p.timing], posted:L(p.posted)}; };

    // search
    let results = s.contractors.filter(c => c.verified && (!s.filt.city||c.city===s.filt.city) && (!s.filt.trade||c.trades.includes(s.filt.trade)) && (!s.filt.q || (c.name.en+c.name.ar+c.trades.map(tradeL).join(' ')).toLowerCase().includes(s.filt.q.toLowerCase())));
    results = results.sort((a,b)=> s.filt.sort==='done'? b.done-a.done : b.rating-a.rating).map(decorateC);
    const featured = s.contractors.filter(c=>c.verified).sort((a,b)=>b.rating-a.rating).slice(0,3).map(decorateC);
    const PER = 4;
    const totalPages = Math.max(1, Math.ceil(results.length / PER));
    const page = Math.min(s.page, totalPages);
    const pageItems = results.slice((page-1)*PER, page*PER);
    const pageNums = (() => {
      if(totalPages <= 7) return Array.from({length:totalPages},(_,i)=>i+1);
      const out = [1];
      if(page > 3) out.push('…');
      for(let n=Math.max(2,page-1); n<=Math.min(totalPages-1,page+1); n++) out.push(n);
      if(page < totalPages-2) out.push('…');
      out.push(totalPages);
      return out;
    })();
    const pg = { items: pageNums.map(n => ({n: n==='…'?page:n, label:n==='…'?'…':String(n), gap:n==='…', cur: n===page ? 'true':'false'})),
      prev: Math.max(1,page-1), next: Math.min(totalPages,page+1), firstDisabled: page===1, lastDisabled: page===totalPages };

    // homeowner profile
    const hoId = (s.curId && this.D.USERS[s.curId]) ? s.curId : 'h1';
    const hu = this.D.USERS[hoId];
    const cNameOf = id => this.D.CONTRACTORS.find(c=>c.id===id)?.name?.[lang] || id;
    const hoLiveRaw = s.reviews.filter(x => x.by==='contractor' && s.projects.some(p=>p.id===x.pid && p.ownerId===hoId));
    const hoLive = hoLiveRaw.map(x=>({ who: cNameOf(s.projects.find(p=>p.id===x.pid)?.contractorId || 'c1'), stars:'★★★★★'.slice(0,x.stars), text:x.text, when:x.date }));
    const hoAvg = (() => { const n=hu.reviews + hoLiveRaw.length; if(!n) return String(hu.rating);
      return ((hu.rating*hu.reviews + hoLiveRaw.reduce((a,r)=>a+r.stars,0)) / n).toFixed(1); })();
    // a contractor sees the homeowner's full name only once they hold the awarded agreement
    const hoFullName = (role==='homeowner' && hoId==='h1' && s.user?.name) || hu[lang];
    const hoAwarded = role==='contractor' && s.projects.some(p => p.ownerId===hoId && p.contractorId==='c1' && p.status!=='open');
    const hoMasked = role==='contractor' && !hoAwarded;
    const shortName = (full => { const parts=String(full||'').trim().split(/\s+/);
      return parts.length<2 ? (full||'') : parts[0] + ' ' + parts[parts.length-1].charAt(0) + '.'; })(hoFullName);
    const hp = {
      hoMasked, hoMaskNote: t.hprofile.maskedNote,
      name: hoMasked ? shortName : hoFullName, city: cityL((hoId==='h1' && s.hoProfile?.city) || hu.city), joined: hu.joined[lang], nafath: hu.nafath, isMine: role==='homeowner',
      rating: arNumerals(hu.rating, lang), reviews: arNumerals(hu.reviews, lang), done: arNumerals(hu.done, lang),
      about: (hoId==='h1' && s.hoProfile?.about?.[lang]) || hu.about[lang], noRevs: !hu.revs.length,
      backRoute: role==='contractor' ? 'cdash' : (role==='homeowner' ? 'hdash' : 'home'),
      backLabel: role ? t.hprofile.backDash : t.nav.how,
      stats: [
        {v: arNumerals(hu.done, lang), l: t.hprofile.sDone},
        {v: hu.onTimeApproval, l: t.hprofile.sApproval},
        {v: hu.avgApproval[lang], l: t.hprofile.sAvg},
        hu.disputes ? {v: arNumerals(hu.disputes, lang), l: t.hprofile.sDisputes} : null
      ].filter(Boolean),
      revs: hoLive.concat(hu.revs.map(rv=>({who: cNameOf(rv.by), stars:'★★★★★'.slice(0, rv.stars), text: rv.text[lang], when: rv.when[lang]}))).map(r=>({...r, badge:t.hprofile.revBadge}))
    };
    hp.reviews = revsN(hu.reviews + hoLiveRaw.length);
    hp.rating = String(hoAvg);
    hp.noRevs = !(hu.revs.length + hoLive.length);

    // profile
    const pc = this.con(s.curId) || s.contractors[0];
    const coLiveRaw = pc ? s.reviews.filter(x => x.by==='homeowner' && s.projects.some(p=>p.id===x.pid && p.contractorId===pc.id)) : [];
    const coLive = coLiveRaw.map(x=>({ who: maskName(uName(s.projects.find(p=>p.id===x.pid)?.ownerId || 'h1')), when:(lang==='ar'?'سبتمبر 2026':'September 2026'), stars:'★★★★★'.slice(0,x.stars), text:x.text }));
    const coAvg = pc ? (() => { const n=pc.reviews + coLiveRaw.length; if(!n) return String(pc.rating);
      return ((pc.rating*pc.reviews + coLiveRaw.reduce((a,r)=>a+r.stars,0)) / n).toFixed(1); })() : null;
    const prof = pc ? {...decorateC(pc),
      tmWork:[0,1].map(i=>({imgId:'pf-'+pc.id+'-'+i, src:'assets/trades/'+String(((pc.id.charCodeAt(1)+i)%10)+1).padStart(2,'0')+'.jpg', caption:[tradeL(pc.trades[0]), tradeL(pc.trades[pc.trades.length-1])][i]})),
      ownWork:[2,3].map(i=>({imgId:'pf-'+pc.id+'-'+i, src:'assets/trades/'+String(((pc.id.charCodeAt(1)+i)%10)+1).padStart(2,'0')+'.jpg', caption:[cityL(pc.city), tradeL(pc.trades[0])][i-2]})),
      reviewList:coLive.concat([{who:maskName(uName('h1')),when:(lang==='ar'?'سبتمبر 2026':'September 2026'),stars:'★★★★★',text:lang==='en'?'Clear quote, weekly updates, finished on schedule. Milestone evidence made approvals easy.':'عرض واضح وتحديثات أسبوعية وإنجاز في الوقت. إثباتات المراحل سهّلت الاعتماد.'},{who:maskName(uName('h2')),when:(lang==='ar'?'أغسطس 2026':'August 2026'),stars:'★★★★☆',text:lang==='en'?'Good finish quality. One small delay on materials, communicated in advance.':'جودة تشطيب جيدة. تأخير بسيط في المواد تم الإبلاغ عنه مسبقًا.'}]),
      rating: coAvg, reviews: revsN(pc.reviews + coLiveRaw.length), reviewTotal: pc.reviews + coLiveRaw.length, moreReviews: (pc.reviews + coLiveRaw.length) > 2,
      doneLine: pc.done + ' ' + (lang==='ar' ? 'مشروعًا مكتملًا عبر ترميم' : 'projects completed through Tarmem'),
      stats:[{v:(2026-pc.since), l:t.profile.years},{v:pc.onTime+'%', l:t.profile.onTime},{v:(lang==='ar' ? (pc.response===1?'ساعة':pc.response===2?'ساعتان':pc.response<=10?pc.response+' ساعات':pc.response+' ساعة') : pc.response+'h'), l:t.profile.response},
        (()=>{ const n=s.projects.filter(p=>p.contractorId===pc.id).reduce((a,p)=>a+p.ms.filter(m=>m==='disputed').length,0);
               return n ? {v:n, l:t.profile.disputes} : null; })()].filter(Boolean),
      creds:[['id',t.admin.chk.id],['cr',t.admin.chk.cr],['pf',t.profile.credWork]].map(([k,label])=>({label, status:pc.checks[k]?t.profile.checked:t.profile.pendingS, color:pc.checks[k]?'#1B7A3E':'#8A5A00'}))} : {};

    // auth
    const a=s.auth;
    const auth = {isSignin:a.mode==='signin', isSignup:a.mode==='signup', showSteps:a.mode==='signup', step1:a.step===1, step2:a.step===2, step3:a.step===3, roleHo:a.role==='homeowner', roleCo:a.role==='contractor', f:a.f, otpCode:arNumerals(a.otpCode||'', lang), idIsId:a.f.idType==='id', idIsIqama:a.f.idType==='iqama', uploadLabel:a.uploaded?t.auth.uploaded:t.auth.upload, error:a.error};
    const authSteps = t.auth.steps.map((label,i)=>({n:i+1,label,on:i+1<=a.step?'true':'false',color:i+1<=a.step?'#FF5A3C':'#B9B7D0'}));

    // post
    const p=s.post; const post = {step1:p.step===1,step2:p.step===2,step3:p.step===3,step4:p.step===4,f:p.f,tAsap:p.f.timing==='asap',tMonth:p.f.timing==='month',tFlex:p.f.timing==='flexible',files:p.files,hasFiles:p.files.length>0,fileCount:(p.files.length||t.post.noFiles),
      addressLabel:(p.f.address||'').trim()||t.post.unset,
      nextDisabled: p.step===4 && !p.pledge,
      secDetails:String(t.post.steps[0]||'').split(' · ')[0],
      secLocation:String(t.post.steps[1]||'').split(' · ')[0],
      secFiles:String(t.post.steps[2]||'').split(' · ')[0],tradeLabel:tradeL(p.f.trade),cityLabel:cityL(p.f.city),timingLabel:t.post[p.f.timing],pledge:p.pledge,
      sug: (() => { const S=this.sugFor(p.f); if(!S) return {has:false, none:true};
        const {lo,hi}=S, top=Math.log10(1000), P=(this.D.PRICE_TEXT||{})[lang]||{per:{}};
        const G=(this.D.PRICE_GUIDE||{})[p.f.trade]||{}, key = S.u==='unit' ? G.n : (S.u==='m2' && G.k>1 ? 'walls' : S.u);
        const x = P.per[key] ? P.per[key].replace('{q}', fmt(S.q)) : '';
        const note = [x && (S.typ ? P.typical : P.fromText).replace('{x}', x), P.basis, S.c==='l' && P.wide, P.vary].filter(Boolean).join(' ') || t.post.sugNote;
        const left = Math.max(0, Math.log10(lo/1000)/top*100);
        return {has:true, none:false, note, range: lang==='ar' ? fmt(lo)+' – '+fmt(hi)+' ريال' : 'SAR '+fmt(lo)+' – '+fmt(hi),
          left:left.toFixed(1),
          width:Math.max(2, Math.min(100-left, (Math.log10(hi/1000)-Math.log10(lo/1000))/top*100)).toFixed(1)}; })(),
      budgetLine: (()=>{ const g=v=>(+v||0).toLocaleString('en-US');
        return lang==='ar' ? 'من '+g(p.f.min)+' إلى '+g(p.f.max)+' ريال' : 'SAR '+g(p.f.min)+' – '+g(p.f.max); })(),
      overCap: (+p.f.max||0) > 1000000, canBack:p.step>1,nextLabel:p.step===4?t.post.publish:(t.post.next+': '+String(t.post.steps[p.step]||'').split(' · ')[0]),error:p.error,feeReminder:t.post.feeNext};
    const postSteps = t.post.steps.map((label,i)=>{
      const n=i+1, cur=n===p.step, done=n<p.step;
      return {n,label,
        color: cur?'#1B1464':(done?'#C79A88':'#C4C2D4'),
        weight: cur?600:500,
        ring: cur?'#FFD9CB':(done?'#EAD9D2':'#E2E0EE'),
        fill: cur?'#FFF1EC':'transparent',
        ink: cur?'#D9552F':'currentColor',
        glow: 'none'};
    });

    // homeowner dash
    const mine = s.projects.filter(x=>x.ownerId==='h1');
    const myProjects = mine.map(decorateP);
    const released = mine.reduce((sum,x)=>sum+x.ledger.filter(l=>l.label==='release').reduce((a,l)=>a+l.amount,0),0);
    const plN=(o,n)=>{ if(!o) return '';
      const r = n===0&&o.zero ? o.zero
        : n===1&&o.one ? o.one
        : n===2&&o.two ? o.two
        : (n%100>=3&&n%100<=10&&o.few) ? o.few
        : (o.many||o.other);
      return String(r||'').replace('{n}',n); };
    const nBids=mine.filter(x=>x.status==='open').reduce((a,x)=>a+x.bids.length,0);
    const nAppr=mine.reduce((a,x)=>a+x.ms.filter(m=>m==='submitted').length,0);
    const hStats=[{v:mine.filter(x=>x.status==='active').length,l:t.hdash.sActive},{v:nBids,l:plN(t.hdash.sBidsN,nBids)||t.hdash.sBids},{v:nAppr,l:plN(t.hdash.sApproveN,nAppr)||t.hdash.sApprove},{v:(lang==='ar'?fmt(released)+' ريال':'SAR '+fmt(released)),l:t.hdash.sReleased}];
    const hActions=[]; mine.forEach(x=>{ if(x.status==='open'&&x.bids.length) hActions.push({pid:x.id,tab:'bids',text:`${(t.hdash.actBidsN?plN(t.hdash.actBidsN,x.bids.length):x.bids.length+' '+t.hdash.actBids)} ${L(x.title)}`}); if(x.status==='active'&&!x.funded) hActions.push({pid:x.id,tab:'payments',text:`${t.hdash.actFund} ${L(x.title)}`}); if(x.ms.includes('submitted')) hActions.push({pid:x.id,tab:'milestones',text:`${t.hdash.actApprove} ${L(x.title)}`}); });
    const savedList = s.saved.map(id=>this.con(id)).filter(Boolean).map(decorateC);

    // contractor dash (c1)
    const me='c1';
    const cInvolved = s.projects.filter(x=>x.contractorId===me || x.bids.some(b=>b.cid===me));
    const cProjects = cInvolved.map(x=>{ const d=decorateP(x); const b=x.bids.find(b=>b.cid===me); const ni=x.ms.findIndex(m=>m!=='released'); return {...d, myBidLabel:b?mny(b.price):t.cdash.none, nextMs: x.contractorId===me && ni>=0 ? t.ws.ms[ni].n : t.cdash.none}; });
    const cPend = s.projects.filter(x=>x.contractorId===me&&x.funded).reduce((a,x)=>{ const am=this.msAmounts(x); return a + x.ms.reduce((b,m,i)=> m!=='released'? b+am[i]:b,0); },0);
    const cEarned = s.projects.filter(x=>x.contractorId===me).reduce((a,x)=>a + x.ledger.filter(l=>l.label==='release').reduce((b,l)=>b+l.amount,0),0);
    const cStats=[{v:s.projects.filter(x=>x.status==='open'&&!x.bids.some(b=>b.cid===me)).length,l:t.cdash.sOpen},{v:s.projects.filter(x=>x.status==='open'&&x.bids.some(b=>b.cid===me)).length,l:t.cdash.sBids},{v:fmt(this.coNet(cPend)),l:t.cdash.sPending},{v:fmt(this.coNet(cEarned)),l:t.cdash.sEarned}];
    const cPayments=[]; s.projects.filter(x=>x.contractorId===me&&x.funded).forEach(x=>{ const am=this.msAmounts(x); x.ms.forEach((m,i)=>cPayments.push({pid:x.id, label:`${L(x.title)} · ${t.ws.ms[i].n}`, amount:fmt(this.coNet(am[i])), color: m==='released'?'#1B7A3E':'#8A5A00'})); });
    const openAll = s.projects.filter(x=>x.status==='open');
    const openFiltered = openAll.filter(x => (!s.bfilt.city || x.city===s.bfilt.city) && (!s.bfilt.trade || x.trade===s.bfilt.trade) && (!s.bfilt.min || (x.max||0) >= +s.bfilt.min));
    const openProjects = openFiltered.map(x=>({...decorateP(x), bidCta: x.bids.some(b=>b.cid===me)?t.browse.viewBid:t.browse.bid}));
    const projN = (n, of) => { if(lang!=='ar') return of==null ? n+' '+(n===1?'project':'projects') : 'Showing '+n+' of '+of;
      const one = n===0?'لا مشاريع':n===1?'مشروع واحد':n===2?'مشروعان':n<=10?n+' مشاريع':n+' مشروعًا';
      if(of==null) return one + (n>2 ? ' متاحة' : n===2 ? ' متاحان' : n===1 ? ' متاح' : '');
      const two = of===1?'مشروع واحد':of===2?'مشروعين':of<=10?of+' مشاريع':of+' مشروعًا';
      return one + ' من أصل ' + two; };
    const bf = { city:s.bfilt.city, trade:s.bfilt.trade, min:s.bfilt.min, count:openFiltered.length, countLabel: projN(openFiltered.length), empty:!openFiltered.length, any:!!(s.bfilt.city||s.bfilt.trade||s.bfilt.min) };

    // workspace
    const pr = this.proj(s.curId) || s.projects[0]; let pj={}, pTabs=[], canBid=false, alreadyBid=false, needsFunding=false, bidNeedsNafath=false, fundNeedsNafath=false, tab={}; tab[s.tab]=true;
    if(pr){ const d=decorateP(pr); const st=this.statusOf(pr); const am=this.msAmounts(pr);
      const isOwner = role==='homeowner'; const isCo = role==='contractor';
      const relTot = pr.ledger.filter(l=>l.label==='release').reduce((a,l)=>a+l.amount,0);
      const nextStep = st==='open' ? (isCo?t.ws.next.openCo:t.ws.next.open) : st==='funding' ? (isCo?t.ws.next.fundingCo:t.ws.next.funding) : st==='active' ? (isCo?t.ws.next.activeCo:t.ws.next.activeHo) : t.ws.next.completed;
      const feeN = Math.round((pr.amount||0)*0.01), feeVatN = Math.round(feeN*0.15);
      pj = {...d, amount: fmt(pr.amount || pr.max), fee: fmt(feeN), feeVat: fmt(feeVatN), fundTotal: fmt(pr.amount||0), amountLabel: pr.amount?t.ws.amountAgreed:t.ws.amountBudget, showAddFunds: isOwner && !!pr.amount && !pr.funded, showBudgetRow: !pr.amount, msSummary:(()=>{ const d=pr.ms.filter(m=>m==='released').length, n=pr.ms.length;
          if(lang!=='ar') return `${d}/${n} ${t.ws.next.msDone}`;
          const one = d===0?'لا مراحل':d===1?'مرحلة واحدة':d===2?'مرحلتان':`${d} مراحل`;
          return `${one} من أصل ${n} مراحل مصروفة`; })(), nextStep,
        msNote: isCo ? (t.ws.msNoteCo || t.ws.msNote) : t.ws.msNote,
        compareNote: isCo ? (t.ws.compareNoteCo || t.ws.compareNote) : t.ws.compareNote,
        // a contractor sees their own bid only — never a competitor's name, price or scope
        bidRows: pr.bids.filter(b => !isCo || b.cid === me).map(b=>{ const c=this.con(b.cid); return {cid:b.cid,name:c.name[lang],rating:c.rating,done:c.done,verified:c.verified,price:fmt(b.price),days:b.days,note:L(b.note),accepted:pr.contractorId===b.cid,canAccept:isOwner&&pr.status==='open'}; }),
        msRows: pr.ms.map((m,i)=>{ const ev=this.ev(pr,i); const unlocked = pr.ms.slice(0,i).every(x=>x==='released');
          const coStage = isCo && pr.funded && m==='pending' && unlocked;
          const due = this.msDue(pr, i, m, t, lang);
          const fo=this.feeOf(am[i]); return {n:i+1,name:t.ws.ms[i].n,desc:t.ws.ms[i].d,amount:fmt(am[i]), showBrkHo: isOwner && m==='submitted', showBrkCo: isCo && (m==='submitted' || m==='pending') && pr.funded && unlocked, bWork:fmt(am[i]), bFee:fmt(fo.fee), bFeeVat:fmt(fo.feeVat), bHoTotal:fmt(fo.hoTotal), bComm:fmt(fo.comm), bCommVat:fmt(fo.commVat), bCoGross:fmt(fo.coGross), bCoNet:fmt(fo.coNet),statusLabel:t.ws.msSt[m],tagClass:MS_TAG[m], dueL: due.l, dueCls: due.cls,
          ring: m==='released'?'#1B7A3E':m==='submitted'?'#FF7722':'#B9B7D0', fill: m==='released'?'#1B7A3E':'#fff', ink: m==='released'?'#fff':'#1B1464',
          i, evP:ev.p, evV:ev.v, evO:ev.o, needPhoto:!ev.p, needVideo:!ev.v, needOwner:!ev.o,
          photoLabel: ev.p ? t.ws.evDone : t.ws.evAdd, videoLabel: ev.v ? t.ws.evDone : t.ws.evAdd, ownerLabel: ev.o ? t.ws.evDone : t.ws.evAdd,
          showCoEv: coStage, showOwnerEv: isOwner && m==='submitted',
          canSubmit: coStage && ev.p && ev.v, submitBlocked: coStage && (!ev.p || !ev.v),
          canApprove: isOwner && m==='submitted' && ev.o, approveBlocked: isOwner && m==='submitted' && !ev.o,
          lockedNote: isCo && m==='pending' && !unlocked ? t.ws.evLocked : (isCo && m==='pending' && !pr.funded ? t.ws.evFundFirst : ''),
          autoLabel: m==='submitted' ? t.auto.remain + daysN(AUTO_DAYS) : '',
          autoNote: isCo ? ((t.auto.noteCoA || t.auto.noteA) + daysN(AUTO_DAYS) + (t.auto.noteCoB || t.auto.noteB)) : (t.auto.noteA + daysN(AUTO_DAYS) + t.auto.noteB), showAuto: m==='submitted',
          canResolve:(isOwner||role==='admin')&&m==='disputed'}; }),
        msgRows: pr.msgs.map(m=>{ const mineMsg = (m.from==='h'&&isOwner)||(m.from==='c'&&isCo); const who = m.from==='h'?(isOwner?t.ws.you:uName(pr.ownerId)):(isCo?t.ws.you:cName(pr.contractorId||pr.bids[0]?.cid)); return {who,time:localTime(m.time, lang==='ar'),text:this.scrub(L(m.text)),align:mineMsg?'flex-end':'flex-start',bg:mineMsg?'#1B1464':'#F1F0FA',ink:mineMsg?'#fff':'#14113F'}; }),
        files: pr.files.map(f=>({...f, date:L(f.date), by: f.by==='h'?uName(pr.ownerId):cName(pr.contractorId)})),
        payStats:[{v:fmt(pr.funded?pr.amount:0),l:t.ws.committed},{v:fmt(relTot),l:t.ws.released},{v:fmt(pr.funded?pr.amount-relTot:0),l:t.ws.remaining}],
        ledger: (()=>{ const r2=n=>Math.round(n*100)/100;
          const src = pr.ledger.filter(l=> isCo ? ['release','commission','commvat'].includes(l.label) : !['commission','commvat'].includes(l.label));
          const feeOfMs = i => (pr.ledger.find(x=>x.label==='fee' && x.ms===i)||{}).amount || 0;
          const commOfMs = i => (pr.ledger.find(x=>x.label==='commission' && x.ms===i)||{}).amount || 0;
          return src.map((l,ix)=>{ const mn = l.ms!=null ? t.ws.ms[l.ms].n : '';
            const exact = l.label==='vat' ? r2(feeOfMs(l.ms)*0.15) : l.label==='commvat' ? r2(commOfMs(l.ms)*0.15) : l.amount;
            const label = l.label==='fund' ? t.ws.ledgerFund
              : l.label==='fee' ? t.ws.ledgerFee
              : l.label==='vat' ? t.wallet.types.vat
              : l.label==='commission' ? t.ws.ledgerComm
              : l.label==='commvat' ? t.ws.ledgerCommVat
              : String(t.ws.ledgerRelease).replace('{n}', mn);
            return {label, li: pr.ledger.indexOf(l), date: dateLong(l.date, lang==='ar'), amount: fmt(exact),
              ref: l.inv || ('TRM-' + pr.id.replace(/\D/g,'') + '-' + String(ix+1).padStart(2,'0')),
              stL: t.ws.lgSt.done, stCls: 'tag-g',
              isFeeInv: ['fee','commission','vat','commvat'].includes(l.label),
              isWorkInv: l.label==='release',
              inv: (l.label==='fee'||l.label==='commission') ? (l.inv||'') : ''};
          }); })()};
      const counts = {bids:(isCo ? pr.bids.filter(b => b.cid === me).length : pr.bids.length), milestones:pr.ms.length, messages:pr.msgs.length, files:pr.files.length};
      pTabs = ['overview','bids','milestones','messages','files','payments','changes'].map((id,i)=>({id,label:t.ws.tabs[i],sel:s.tab===id?'true':'false',count:counts[id]||0}));
      counts.changes = (pr.changes||[]).length;
      const crAwarded = !!pr.contractorId && pr.status!=='open';
      const crSide = isCo ? 'co' : 'ho';
      pj.crLocked = !crAwarded;
      pj.crCanCreate = crAwarded && (isOwner||isCo);
      pj.crRows = (pr.changes||[]).slice().reverse().map(c=>{
        const both = c.hoOk && c.coOk;
        const mine = crSide==='ho' ? c.hoOk : c.coOk;
        return {...c,
          byLabel: c.by==='ho' ? t.ws.cr.hoLbl : t.ws.cr.coLbl,
          amountLabel: (c.amount>0?'+ ':c.amount<0?'− ':'') + mny(Math.abs(c.amount)),
          amountColor: c.amount<0 ? '#8A5A00' : '#15703A',
          daysLabel: (c.days||0) + ' ' + t.ws.cr.dayUnit,
          showDays: !!c.days,
          totalLabel: mny(c.newTotal),
          statusLabel: both ? t.ws.cr.applied : t.ws.cr.waiting,
          statusCls: both ? 'tag-g' : 'tag-w',
          canApprove: crAwarded && !both && !mine };
      });
      pj.crNone = !(pr.changes||[]).length;
      const nafOk = !!s.user?.nafath;
      const bidStage = isCo && pr.status==='open' && !pr.bids.some(b=>b.cid===me);
      if(pr.pending) pj.bidRows = pj.bidRows.map(b=>({...b, canAccept:false}));
      canBid = bidStage && nafOk; bidNeedsNafath = bidStage && !nafOk;
      alreadyBid = isCo && pr.status==='open' && pr.bids.some(b=>b.cid===me);
      const fundStage = isOwner && pr.status==='active' && !pr.funded;
      needsFunding = fundStage && nafOk; fundNeedsNafath = fundStage && !nafOk;
    }

    // admin
    const verifQueue = s.contractors.filter(c=>!c.verified && !s.rejected.includes(c.id)).map(c=>({id:c.id,name:c.name[lang],city:cityL(c.city),date:'4 Sep 2026',checks:[['id',t.admin.chk.id],['cr',t.admin.chk.cr],['pf',t.admin.chk.pf]].map(([k,label])=>({label:(c.checks[k]?'✓ ':'· ')+label,cls:c.checks[k]?'tag-g':'tag-w'}))}));
    const adminTabs = ['overview','analytics','promos','affiliates','late','verification','support','payments','users'].map((id,i)=>({id,label:t.admin.tabs[i],cur:s.atab===id?'page':'false',count: id==='verification'?verifQueue.length: id==='support'? s.cases.filter(c=>c.open).length : 0}));
    const atab={}; atab[s.atab]=true;
    const held = s.projects.filter(x=>x.funded).reduce((a,x)=>a + x.amount - x.ledger.filter(l=>l.label==='release').reduce((b,l)=>b+l.amount,0),0);
    const rel = p => p.ledger.filter(l=>l.label==='release').reduce((a,l)=>a+l.amount,0);
    const relTotal = s.projects.reduce((a,p)=>a+rel(p),0);
    const feesCharged = s.projects.reduce((a,p)=>a+p.ledger.filter(l=>l.label==='fee').reduce((b,l)=>b+l.amount,0),0);
    const fundedTotal = s.projects.reduce((a,p)=>a+p.ledger.filter(l=>l.label==='fund').reduce((b,l)=>b+l.amount,0),0);
    const commEarned = Math.round(relTotal*0.09), coEarned = relTotal - commEarned;
    const revReal = commEarned + feesCharged;
    const activePipe = s.projects.filter(p=>p.status==='active').reduce((a,p)=>a+(p.amount-rel(p)),0);
    const openPipe = s.projects.filter(p=>p.status==='open').reduce((a,p)=>a+Math.round((p.min+p.max)/2),0);
    const revProj = Math.round(activePipe*0.10) + Math.round(openPipe*0.10);
    const awarded = s.projects.filter(p=>p.amount>0);
    const avgProject = awarded.length ? Math.round(awarded.reduce((a,p)=>a+p.amount,0)/awarded.length) : 0;
    const revTotal = revReal + revProj;
    const fin = { paid: fmt(fundedTotal + feesCharged), coEarned: fmt(coEarned), revReal: fmt(revReal), revProj: fmt(revProj), revTotal: fmt(revTotal),
      comm: fmt(commEarned), fees: fmt(feesCharged), held: fmt(held), avg: fmt(avgProject),
      coPct: (fundedTotal+feesCharged) ? Math.round(coEarned/(fundedTotal+feesCharged)*100) : 0,
      tmPct: (fundedTotal+feesCharged) ? Math.round(revReal/(fundedTotal+feesCharged)*100) : 0,
      escPct: (fundedTotal+feesCharged) ? 100 - Math.round(coEarned/(fundedTotal+feesCharged)*100) - Math.round(revReal/(fundedTotal+feesCharged)*100) : 0,
      realPct: revTotal ? Math.round(revReal/revTotal*100) : 0, projPct: revTotal ? 100-Math.round(revReal/revTotal*100) : 0,
      commPct: revReal ? Math.round(commEarned/revReal*100) : 0, feePct: revReal ? 100-Math.round(commEarned/revReal*100) : 0 };
    const adminQuick=[{v:s.projects.length,l:t.admin.sProjects,color:'#1B1464'},{v:s.contractors.length,l:t.admin.sContractors,color:'#1B1464'},{v:Object.keys(this.D.USERS).length,l:t.admin.sHomeowners,color:'#1B1464'},{v:fmt(held),l:t.admin.sHeld,color:'#1B1464'}];
    const adminStats=[{v:s.projects.length,l:t.admin.sProjects},{v:s.contractors.length,l:t.admin.sContractors},{v:Object.keys(this.D.USERS).length,l:t.admin.sHomeowners},{v:fmt(held),l:t.admin.sHeld}];
    const cases = s.cases.map(c=>({id:c.id,project:L(this.proj(c.pid)?.title),issue:L(c.issue),open:c.open,status:c.open?t.admin.open:t.admin.resolved,cls:c.open?'tag-a':'tag-g'}));
    const payRows=[]; s.projects.filter(x=>x.funded).forEach(x=>{ const am=this.msAmounts(x); x.ms.forEach((m,i)=>{ if(m!=='released') payRows.push({project:L(x.title),ms:t.ws.ms[i].n,amount:fmt(am[i]),status:t.ws.msSt[m],cls:MS_TAG[m]}); }); });
    const userRows=[...Object.entries(this.D.USERS).map(([id,u])=>({name:u[lang],role:t.roles.homeowner,city:cityL(u.city),status:t.admin.active,cls:'tag-g'})), ...s.contractors.map(c=>({name:c.name[lang],role:t.roles.contractor,city:cityL(c.city),status:c.verified?t.verified:s.rejected.includes(c.id)?t.admin.rejected:t.admin.pending,cls:c.verified?'tag-g':s.rejected.includes(c.id)?'tag-a':'tag-w'}))];

    const V = Math.max(10000, s.calcRaw || 10000), fee = Math.round(V*0.01), comm = Math.round(V*0.09);
    const feeVat = Math.round(fee*0.15), commVat = Math.round(comm*0.15);
    const tmTotal = fee + comm, hoPays = V + fee + feeVat;
    const calc = { raw:V, value:fmt(V), first:s.calcFirst, hoPays:fmt(hoPays), beforeVat:fmt(V+fee), coBeforeVat:fmt(V-comm), tmFees:fmt(tmTotal), comm:fmt(comm), coGets:fmt(V-comm-commVat), feeVat:fmt(feeVat), commVat:fmt(commVat),
      fee:fmt(fee), feeLabel: '+ '+mny(fee), feeColor: '#1B1464',
      coPct: Math.round((V-comm)/(V+fee)*100), tmPct: 100 - Math.round((V-comm)/(V+fee)*100), big: V >= 1000000, draft: s.calcDraft };
    const priceCards = (s.prole==='contractor' ? t.pricing2.coCards : t.pricing2.hoCards).map((p,i)=>({...p,
      border: /%/.test(p.rate) ? '#FF7722' : '#E6E5F0', badgeCls: /%/.test(p.rate) ? 'tag-a' : 'tag-n' }));
    const paidCard = priceCards.find(p=>/%/.test(p.rate)) || priceCards[1] || {}, freeCard = priceCards.find(p=>!/%/.test(p.rate)) || priceCards[0] || {};
    const inclList = s.prole==='contractor' ? t.pricing2.coIncl : (t.pricing2.hoIncl || []);
    const ruleWord = lang==='ar' ? 'قاعدة' : 'Rule';
    const arNum = ['01','02','03','04'];
    const trustRules = t.home.trust.map((x,i)=>({...x, n: lang==='ar' ? arNum[i] : '0'+(i+1), k: ruleWord + ' ' + (lang==='ar' ? arNum[i] : '0'+(i+1))}));
    const faqs = t.faq.items.map((q,i)=>({...q,open:s.openFaq===i,sign:s.openFaq===i?'−':'+'}));

    // wallet
    const W = t.wallet, fmtN = n => fmt(Math.max(0, Math.round(n)));
    const myPs = s.projects.filter(p => role==='contractor' ? p.contractorId===me : p.ownerId==='h1');
    const relSum = p => p.ledger.filter(l=>l.label==='release').reduce((a,l)=>a+l.amount,0);
    const escrowHeld = myPs.filter(p=>p.funded).reduce((a,p)=>a + Math.max(0, p.amount - relSum(p)), 0);
    const releasedAll = myPs.reduce((a,p)=>a+relSum(p), 0);
    const awaiting = myPs.filter(p=>p.funded).reduce((a,p)=>{ const am=this.msAmounts(p); return a + p.ms.reduce((b,m,i)=> m==='submitted'? b+am[i] : b, 0); }, 0);
    const depositsPending = s.txns.filter(x=>x.who==='h1'&&x.type==='deposit'&&x.st==='pending').reduce((a,x)=>a+x.amount,0);
    const depositsIn = s.txns.filter(x=>x.who==='h1'&&x.type==='deposit'&&x.st==='escrow').reduce((a,x)=>a+x.amount,0);
    const paidOut = s.txns.filter(x=>x.who==='c1'&&x.type==='payout').reduce((a,x)=>a+x.amount,0);
    const coNet = Math.round(this.coNet(releasedAll)*100)/100;
    const availableRaw = Math.max(0, Math.round((coNet - paidOut)*100)/100);
    const isCoW = role==='contractor';
    const methodDefs = [
      {id:'mada', label:W.mada, note:W.madaNote}, {id:'apple', label:W.applePay, note:W.applePayNote},
      {id:'visa', label:W.visa, note:W.visaNote}, {id:'transfer', label:W.transfer, note:W.transferNote}
    ];
    const ledgerRows = [];
    const rr2 = n => Math.round(n*100)/100;
    myPs.forEach(p => p.ledger.filter(l => isCoW ? l.label==='release' : !['commission','commvat'].includes(l.label)).forEach(l => {
      const msName = l.ms!=null && t.ws.ms[l.ms] ? t.ws.ms[l.ms].n : '';
      const entry = l.label==='fund' ? t.ws.ledgerFund
        : l.label==='fee' ? t.ws.ledgerFee
        : l.label==='vat' ? W.types.vat
        : l.label==='commission' ? t.ws.ledgerComm
        : l.label==='commvat' ? t.ws.ledgerCommVat
        : String(t.ws.ledgerRelease).replace('{n}', msName);
      const exact = l.label==='vat' ? rr2(((p.ledger.find(x=>x.label==='fee'&&x.ms===l.ms)||{}).amount||0)*0.15)
        : l.label==='commvat' ? rr2(((p.ledger.find(x=>x.label==='commission'&&x.ms===l.ms)||{}).amount||0)*0.15)
        : l.amount;
      ledgerRows.push({
        date: dateLong(l.date, lang==='ar'), label: entry+' · '+L(p.title), method:l.label==='release'?W.bank:'—',
        amount:(isCoW && l.label==='release') ? this.coNet(exact) : exact,
        st: l.label==='release' ? 'released' : 'done', sign: isCoW ? 1 : -1 });
    }));
    ledgerRows.sort((a,b)=>0);
    const myTxns = s.txns.filter(x => x.who === (isCoW ? 'c1' : 'h1'));
    const txRows = myTxns.map(x=>({ date: (x.date===t.ws.today ? x.date : dateLong(x.date, lang==='ar')), label:W.types[x.type], method: x.method==='bank'? W.bank : (methodDefs.find(m=>m.id===x.method)?.label || W.bank),
      amount:x.amount, st:x.st, sign: x.type==='payout' ? -1 : 1 }));
    const allRows = [...txRows, ...ledgerRows];
    const po = s.payout, poIban = String(po.iban||'').replace(/\s/g,''), poD = po.draft || {};
    const pa = { saved: po.saved && !po.editing, editing: po.editing, empty: !po.saved && !po.editing,
      showEdit: po.saved && !po.editing, canCancel: po.saved, error: po.error,
      f: {bank:poD.bank||'', holder:poD.holder||'', iban:poD.iban||''},
      bank: po.bank, holder: po.holder,
      ibanMasked: poIban.length >= 14 ? poIban.slice(0,6) + ' •••• •••• ' + poIban.slice(-4) : poIban };
    const hed = s.hedit ? { open:true, f:{name:s.hedit.name, city:s.hedit.city, about:s.hedit.about}, error:s.hedit.error } : { open:false, f:{}, error:'' };
    const ed = s.edit ? (() => {
      const bioLen = String(s.edit.bio||'').length;
      const allow = ['full','kitchen','bathroom','painting','flooring','electrical','plumbing','ac','carpentry','gypsum','interior','structural'];
      const selIds = s.edit.trades;
      const pc1 = this.con('c1');
      return { open:true, f:{name:s.edit.name, city:s.edit.city, bio:s.edit.bio}, error:s.edit.error,
        bioLen, bioColor: (bioLen && bioLen < 50) ? '#D9401F' : '#7A7994',
        confirmCancel: !!s.edit.confirmCancel,
        previewBio: s.edit.bio || t.profile.fBioPh,
        previewMeta: cityL(s.edit.city) + ' · ★ ' + pc1.rating + ' · ' + pc1.done + ' ' + (lang==='ar' ? 'مشروعًا مكتملًا عبر ترميم' : 'projects completed through Tarmem'),
        selLabels: selIds.map(tradeL),
        trades: this.D.TRADES.filter(x=>allow.includes(x.id))
          .map(x=>({id:x.id, label:x[lang], sel: selIds.includes(x.id) ? 'true':'false'})) };
    })() : { open:false, f:{}, trades:[], selLabels:[], error:'' };
    // the deposit is always tied to one project + milestone; the amount is derived, never typed
    const duePrj = myPs.find(p => p.contractorId && p.status!=='open' && (!p.funded || p.ms.some(m=>m==='pending'))) || null;
    const dueIdx = duePrj ? Math.max(0, duePrj.ms.findIndex(m=>m!=='released')) : -1;
    const dueWork = duePrj ? (this.msAmounts(duePrj)[dueIdx] || 0) : 0;
    const dueFees = this.feeOf(dueWork);
    const r2 = n => Math.round(n*100)/100;
    const procRate = (s.wl.method==='visa') ? 0.025 : 0;
    const dueProc = r2(dueWork * procRate), dueProcVat = r2(dueProc * 0.15);
    const dueTotal = r2(dueFees.hoTotal + dueProc + dueProcVat);
    const due = duePrj ? {
      has:true, none:false,
      msTitle: (t.wallet.addFunds||'') + ' · ' + (t.ws.ms[dueIdx] ? t.ws.ms[dueIdx].n : ''),
      project: L(duePrj.title),
      work: fmt(dueWork), fee: fmt(dueFees.fee), feeVat: fmt(dueFees.feeVat),
      proc: fmt(dueProc), procVat: fmt(dueProcVat), showProc: dueProc > 0,
      total: fmt(dueTotal), raw: dueTotal
    } : {has:false, none:true};
    const wl = {
      due,
      isHo: role==='homeowner', isCo: isCoW,
      title: isCoW ? W.coTitle : W.hoTitle, sub: isCoW ? W.coSub : W.hoSub,
      stats: isCoW
        ? [{v:fmt(availableRaw), l:W.available, color:'#15703A'},{v:fmtN(awaiting), l:W.pendingRelease, color:'#1B1464'},{v:fmtN(paidOut), l:W.withdrawn, color:'#1B1464'}]
        : [{v:fmtN(escrowHeld+depositsIn), l:W.inEscrow, color:'#1B1464'},{v:fmtN(awaiting), l:(W.pendingApprovalHo || W.pendingRelease), color:'#B26B00'},{v:fmtN(releasedAll), l:W.releasedTo, color:'#15703A'}],
      amount: s.wl.amount, error: s.wl.error, notice: s.wl.notice,
      amountDisplay: s.wl.amount ? (Number(String(s.wl.amount).replace(/[^\d.]/g,'')||0).toLocaleString('en-US') + (lang==='ar' ? ' ريال' : ' SAR')) : '',
      amountPh: lang==='ar' ? '10,000 ريال' : '10,000 SAR',
      cur: lang==='ar' ? 'ريال' : 'SAR',
      confirming: !!s.wl.confirm, notConfirming: !s.wl.confirm,
      availableExact: fmt(availableRaw),
      confirmAmount: fmt(s.wl.confirm || 0),
      ibanShort: (iban => iban ? '•••• ' + String(iban).slice(-4) : '—')(s.payout && s.payout.iban),
      methods: methodDefs.map(m=>({...m, on: s.wl.method===m.id, sel: s.wl.method===m.id ? 'true':'false'})),
      showBank: s.wl.method==='transfer',
      bankName: lang==='ar' ? 'البنك السعودي الأول' : 'Saudi Awwal Bank', beneficiary: lang==='ar' ? 'ترميم للوساطة الإلكترونية' : 'Tarmem Digital Brokerage',
      escrowIban: 'SA03 8000 0000 6080 1016 7519', ref: 'TRM-H1-4821',
      availableRaw, availableNum: fmtN(availableRaw), pendingDeposits: fmtN(depositsPending),
      rows: allRows.map(x=>({ date:x.date, label:x.label, method:x.method,
        amount:(isCoW ? '' : (x.sign>0?'+ ':'− '))+mny(x.amount), color: x.sign>0 ? '#15703A' : '#1B1464',
        st: (!isCoW && x.st==='released' && W.stHoReleased) || W.st[x.st] || x.st, tag: x.st==='processing'||x.st==='pending' ? 'tag-w' : x.st==='escrow' ? 'tag-n' : 'tag-g' })),
      noRows: !allRows.length
    };


    // browse filters + project withdraw
    const bfl = s.bfilt;
    const pe = { canWithdraw: pj && pj.status==='open' && role==='homeowner', locked: pj && pj.status==='active' && role==='homeowner',
      idle: !s.withdrawAsk, asking: s.withdrawAsk };

    // settings
    const SG = s.setg, hasActive = s.projects.some(p=>p.ownerId==='h1' && p.funded && p.status==='active');
    const st = { mobile:SG.mobile, email:SG.email, notice:SG.notice,
      otherLang: lang==='ar' ? 'English' : 'العربية',
      isAr: lang==='ar', isEn: lang==='en', closeAsk: !!s.closeAsk,
      canClose: !hasActive, closeBlocked: hasActive,
      prefs: [['pBids',t.settings.pBids,false],['pStages',t.settings.pStages,false],['pPay',t.settings.pPay,true],['pDeadlines',t.settings.pDeadlines,true],['pMsg',t.settings.pMsg,false],['pNews',t.settings.pNews,false]]
        .map(([id,label,locked])=>({id, label, locked, on: locked ? true : !!SG.prefs[id]})) };

    const statT = this.state.statT ?? 1;
    const statAnim = [0,1,2].map(i => { const c = (t.v3.statCards||[])[i] || {}; return {...c, v: countStat(c.v, statT)}; });

    // review + notifications
    const myRev = s.reviews.find(x=>x.pid===s.curId && x.by===role);
    const rev = { show: pj && pj.status==='completed' && (role==='homeowner'||role==='contractor') && !myRev,
      done: !!myRev, sub: role==='contractor' ? t.rev.subCo : t.rev.subHo,
      starList:[1,2,3,4,5].map(n=>({n, on: n<=s.revF.stars ? 'true':'false'})),
      hint: s.revF.stars ? '★'.repeat(s.revF.stars) : t.rev.starHint,
      text:s.revF.text, error:s.revF.error,
      myStars: myRev ? '★★★★★'.slice(0,myRev.stars) : '', myText: myRev ? myRev.text : '' };

    const myProj = s.projects.filter(p => role==='contractor' ? p.contractorId==='c1' : p.ownerId==='h1');
    const nItems = [];
    myProj.forEach(p => { const ttl=L(p.title);
      p.ms.forEach((m,i)=>{ if(m==='submitted') nItems.push({id:p.id+'-s'+i, pid:p.id, kind: role==='homeowner'?'approve':'submitted', title:ttl, body:t.ws.ms[i].n, tag:t.ws.msSt.submitted, cls:'tag-w'});
        if(m==='disputed') nItems.push({id:p.id+'-d'+i, pid:p.id, kind:'dispute', title:ttl, body:t.ws.ms[i].n, tag:t.ws.msSt.disputed, cls:'tag-a'}); });
      if(p.status==='open' && p.bids.length) nItems.push({id:p.id+'-b', pid:p.id, kind:'bids', title:ttl, body:bidsN(p.bids.length), tag:t.ws.st.open, cls:'tag-n'});
      if(p.status==='active' && !p.funded) nItems.push({id:p.id+'-f', pid:p.id, kind:'fund', title:ttl, body:t.ws.fundTitle, tag:t.ws.st.funding, cls:'tag-w'});
      if(p.funded && p.status==='active'){ const i = p.ms.findIndex(m => m !== 'released'); if(i >= 0){ const due = this.msDue(p, i, p.ms[i], t, lang); if(due.l && due.diff <= 3) nItems.push({id:p.id+'-due'+i, pid:p.id, kind:'due', title:ttl, body:t.ws.ms[i].n + ' · ' + due.l, tag: due.diff < 0 ? t.strikes.overdue : t.strikes.dueIn, cls: due.diff < 0 ? 'tag-a' : 'tag-w'}); } }
      const skn = this._strikeCount(s, p.id); if(skn && role==='contractor') nItems.push({id:p.id+'-sk'+skn, pid:p.id, kind:'strike', title:ttl, body:[t.strikes.one,t.strikes.two,t.strikes.three][skn-1], tag:t.admin.lr.hStrike + ' ' + skn, cls:'tag-a'});
      if(skn === 3 && role==='homeowner') nItems.push({id:p.id+'-decide', pid:p.id, kind:'decide', title:ttl, body:t.pen.hoTitle, tag:t.admin.lr.st.awaiting, cls:'tag-a'});
      if(p.status==='completed' && !s.reviews.some(x=>x.pid===p.id && x.by===role)) nItems.push({id:p.id+'-r', pid:p.id, kind:'review', title:ttl, body:t.rev.pending, tag:t.ws.st.completed, cls:'tag-g'});
    });
    const nt = { items:nItems.map(x=>({...x, unread: !s.notifRead.includes(x.id)})), count:nItems.filter(x=>!s.notifRead.includes(x.id)).length,
      hasAny:!!nItems.length, empty:!nItems.length, open:s.notifOpen, badge: nItems.filter(x=>!s.notifRead.includes(x.id)).length || '' };


    return { dir: lang==='ar'?'rtl':'ltr', t, r, cur, curPre, curPost, curLbl, user:s.user, isGuest:!role, isUser:!!role, isHomeowner:role==='homeowner', isContractor:role==='contractor', isNotContractor:role!=='contractor', isAdmin:role==='admin',
      featured, results:pageItems, resultCount:arNumerals(results.length, lang), pg, pageFrom: arNumerals(results.length? (page-1)*PER+1 : 0, lang), pageTo: arNumerals(Math.min(page*PER, results.length), lang), filt:s.filt, prof, cities:this.D.CITIES.map(c=>({id:c.id,label:c[lang]})), trades:this.D.TRADES.map(c=>({id:c.id,label:c[lang]})), tradeGroups:this.D.TRADE_GROUPS.map(g=>({label:g[lang],items:this.D.TRADES.filter(c=>c.g===g.id).map(c=>({id:c.id,label:c[lang]}))})),
      showAiPill: s.scrolled && s.route==='home',
      overNav: (s.route==='home' || s.route===undefined) && !s.topped ? 'true' : 'false',
      notHome: s.route!=='home' && s.route!==undefined,
      onlineNow: (s.onlineNow ?? 312).toLocaleString('en-US'),
      replayVid: () => { const v = document.querySelector('.ph-vid'); if(v){ v.currentTime = 0; v.muted = true; const p = v.play(); if(p && p.catch) p.catch(()=>{}); } },
      toAiBar: () => { const el=document.getElementById('v-ai-in');
        if(el){ const y=el.getBoundingClientRect().top + window.scrollY - 140; window.scrollTo({top:Math.max(0,y), behavior:'smooth'}); setTimeout(()=>el.focus(), 420); } },
      aiText:s.aiText||'', aiEmpty: !String(s.aiText||'').trim(),
      setAi: e => { this.fitAi(e.target); this.setState({aiText:e.target.value}); },
      aiSug: (t.ai.sug||[]).map((q,n)=>({q, i:String(n)})),
      useSug: e => { const n = Number(e.currentTarget.dataset.i||0); const fill = (t.ai.sugFill||[])[n] || (t.ai.sug||[])[n] || '';
        this.setState({aiText:fill}, () => { const el = document.getElementById('v-ai-in'); if(el){ el.focus(); el.setSelectionRange(fill.length, fill.length); this.fitAi(el); el.scrollTop = 0; } }); },
      aiAttachLabel: (s.aiFiles||[]).length ? ((s.aiFiles||[]).length+' '+t.ai.attached) : t.ai.attach,
      aiAttach: () => { const inp=document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.multiple=true;
        inp.onchange=()=>{ const names=[...inp.files].map(f=>f.name); this.setState(p=>({aiFiles:[...(p.aiFiles||[]), ...names]})); };
        inp.click(); },
      rmAiFile: e => { const i=+e.currentTarget.dataset.i; this.setState(p=>({aiFiles:(p.aiFiles||[]).filter((x,ix)=>ix!==i)})); },
      arrowPath: lang==='ar' ? 'M19 12H5M12 19l-7-7 7-7' : 'M5 12h14M12 5l7 7-7 7',
      arrowBackPath: lang==='ar' ? 'M19 12H5M12 19l-7-7 7-7' : 'M5 12h14M12 5l7 7-7 7',
      heroAlt: lang==='ar' ? 'مقطع أيزومتري لغرفة معيشة، من الرسم الأولي إلى التنفيذ' : 'Isometric cutaway of a living room, from outline drawing to finished space',
      howSteps: s.howTab==='co' ? (t.how.coSteps||[]) : (t.how.hoSteps||[]),
      homePhases: (t.how.hoPhases||[]).map((p,i)=>({...p, n:'0'+(i+1), icon:{__html: HOW_ICONS.ho[i]}})),
      howPhases: (s.howTab==='co' ? (t.how.coPhases||[]) : (t.how.hoPhases||[])).map((p,i)=>({...p, n:'0'+(i+1), icon:{__html: HOW_ICONS[s.howTab==='co'?'co':'ho'][i]}})),
      howHoOn: s.howTab!=='co', howCoOn: s.howTab==='co', setHowRole: e => this.setState({howTab:e.target.value}),
      payFlow0: (t.how.payFlow[0]||{}).title, payFlow1: (t.how.payFlow[1]||{}).title, payFlow2: (t.how.payFlow[2]||{}).title, payFlow3: (t.how.payFlow[3]||{}).title,
      ms0: t.ws.ms[0].n, ms1: t.ws.ms[1].n, ms2: t.ws.ms[2].n,
      howHo: s.howTab==='co' ? 'false' : 'true', howCo: s.howTab==='co' ? 'true' : 'false',
      setHowTab: e => this.setState({howTab:e.currentTarget.dataset.tab}),
      tc: (()=>{ const co = s.auth.role==='contractor';
        return { title: co ? t.auth.tcCo : t.auth.tcHo,
          secs: (co ? (t.auth.tcCoSecs||[]) : (t.auth.tcHoSecs||[])).map(label=>({label})),
          agree: co ? t.auth.tcAgreeCo : t.auth.tcAgreeHo,
          href: co ? 'assets/tarmem-contractor-guidelines.pdf' : 'assets/tarmem-homeowner-guide.pdf' }; })(),
      agr: (()=>{ const a=s.agr; if(!a||!pr) return {open:false, notRead:true, rows:[], secs:[]};
        const bid=pr.bids.find(b=>b.cid===a.cid); const c=this.con(a.cid);
        return { open:true, notRead: !a.read,
          signLabel: role==='contractor' ? t.agr.signCo : t.agr.signHo,
          rows:[{k:t.agr.pProject, v:L(pr.title)}, {k:t.agr.pCity, v:cityL(pr.city)},
                {k:t.agr.pOwner, v:uName(pr.ownerId)}, {k:t.agr.pContractor, v:c?c.name[lang]:''},
                {k:t.agr.pAmount, v: bid ? mny(bid.price) : ''},
                {k:t.agr.pDays, v: bid ? daysN(bid.days) : ''},
                {k:t.agr.pStages, v: arNumerals(3, lang)},
                {k:t.agr.pDate, v: dateLong(new Date().toISOString().slice(0,10), lang==='ar')}],
          secs: (t.agr.secs||[]).map(label=>({label})) }; })(),
      agrPend: (()=>{ if(!pr||!pr.pending) return {show:false, canSign:false, text:''};
        return {show:true, canSign: role==='contractor', text: role==='contractor' ? t.agr.waitCoSelf : t.agr.waitCo}; })(),
      agrCard: (()=>{ const g=pr&&pr.sig; if(!g||!g.ho||!g.co) return {show:false, rows:[]};
        return {show:true, rows:[{who:t.agr.pOwner, name:g.ho.name, at:g.ho.at},{who:t.agr.pContractor, name:g.co.name, at:g.co.at}]}; })(),
      annoA:(t.v3.annos||[])[0], annoB:(t.v3.annos||[])[1], annoC:(t.v3.annos||[])[2],
      heroSteps: (t.v3.cardSteps||[]).map((label,i)=>({label, mark: i<2?'✓':'', cls: i<2?'v-tick':'v-tickoff', color: i<2?'#2E2A34':'#6E685E'})),
      heroStrip: (()=>{ const ic=[
          [{d:'M12 20h9'},{d:'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'}],
          [{d:'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'},{d:'M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z'},{d:'M8 12h8'},{d:'M8 16h5'}],
          [{d:'M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1z'},{d:'M10 10V5a2 2 0 0 1 4 0v5'},{d:'M4 15v-3a6 6 0 0 1 6-6'},{d:'M14 6a6 6 0 0 1 6 6v3'}]];
        return (t.v3.strip||[]).map((x,i)=>({...x, icon: ic[i]||ic[0]})); })(),
      showNavCta: s.route!=='home',
      heroOn: s.heroOn!==false,
      replayHero: () => { this.setState({heroOn:false}); setTimeout(()=>this.setState({heroOn:true}), 50); },
      heroFrames: (t.v2.frames||[]).map((l,i)=>({n:String(i+1).padStart(2,'0'), l})),
      heroTitle: t.home.heroTitle,
      hsA: statAnim[0], hsB: statAnim[1], hsC: statAnim[2],
      testimonials: (t.home.testimonials||[]).map(x=>({...x, quote:'“'+x.q+'”', initial:(x.n||' ').trim().charAt(0)})),
      partners: (t.home.partners||[]).map(p=>({...p, logoSrc:'assets/locked/logo-'+p.id+'.png'})),
      trustStrip: t.home.stats||[],
      stepRows: t.home.steps||[],
      faqTop: (t.faq.items||[]).slice(0,4),
      svcGroups: (()=>{ const order=['plan','shell','finish','systems','exterior','tech','after']; const gl=t.v2.groups||{};
        const byG={}; this.D.TRADES.forEach(x=>{ (byG[x.g]=byG[x.g]||[]).push(x); });
        const keys=order.filter(k=>byG[k]).concat(Object.keys(byG).filter(k=>!order.includes(k)));
        return keys.map(k=>({label:gl[k]||k, items:byG[k].map(x=>({id:x.id, label:x[lang], n:(()=>{const k=s.contractors.filter(c=>c.trades.includes(x.id)).length; return k?arNumerals(k,lang):'';})()}))})); })(),
      pickTrade: e => { const id=e.currentTarget.dataset.id; this.setState({filt:{...s.filt, trade:id}}); this.nav('contractors'); },
      startPlan: () => { const txt=String(s.aiText||'').trim();
        if(!txt){ const el=document.getElementById('v-ai-in'); if(el) el.focus(); return; }
        this.setState({aiText:'', plan:{msgs:[{role:'user',text:txt}], brief:{type:'',city:'',space:'',scope:'',budget:'',timing:''}, touched:[], q:'', busy:true, error:'', question:'', done:false, matches:[], matching:false}},
          ()=>this.askAssistant());
        this.nav('plan'); },
      restartPlan: () => this.setState({plan:{msgs:[], brief:{type:'',city:'',space:'',scope:'',budget:'',timing:''}, touched:[], q:'', busy:false, error:'', question:'', done:false, matches:[], matching:false}}),
      setPlanQ: e => this.setState({plan:{...s.plan, q:e.target.value}}),
      sendAnswer: () => { const q=String(s.plan.q||'').trim(); if(!q) return;
        this.setState({plan:{...s.plan, msgs:[...s.plan.msgs,{role:'user',text:q}], q:'', busy:true, error:''}}, ()=>this.askAssistant()); },
      setBriefField: e => { const {name,value}=e.target;
        this.setState(p=>({plan:{...p.plan, brief:{...p.plan.brief,[name]:value}, touched: p.plan.touched.includes(name)?p.plan.touched:[...p.plan.touched,name]}})); },
      runMatch: () => this.runMatchAI(),
      toPost: () => { const b=s.plan.brief;
        const norm = str => String(str||'').replace(/[0-9]/g, d=>'0123456789'.indexOf(d));
        const nums = [...norm(b.budget).matchAll(/([\d,.]+)\s*(ألف|الف|k)?/gi)]
          .map(m=>{ const n=parseFloat(m[1].replace(/,/g,'')); return isFinite(n) ? (m[2]? n*1000 : n) : null; })
          .filter(n=>n && n>=100).sort((a,c)=>a-c);
        const cityRec = this.D.CITIES.find(c=>c.ar===b.city||c.en===b.city||c.id===b.city);
        const tr = this.D.TRADES.find(x=>b.type && (String(b.type).includes(x[lang]) || String(x[lang]).includes(String(b.type).trim())));
        const desc = [b.scope, b.space].filter(Boolean).join(' — ');
        this.setState({post:{...s.post, step:1, error:'', f:{...s.post.f,
          title: b.type || s.post.f.title, trade: tr?tr.id:s.post.f.trade, desc: desc || s.post.f.desc,
          city: cityRec?cityRec.id:s.post.f.city, timing: s.post.f.timing,
          min: nums.length>1 ? String(Math.round(nums[0])) : '', max: nums.length ? String(Math.round(nums[nums.length-1])) : ''}}});
        this.nav('post'); },
      pl: (()=>{ const p=s.plan, labels={type:t.ai.fType, city:t.ai.fCity, space:t.ai.fSpace, scope:t.ai.fScope, budget:t.ai.fBudget, timing:t.ai.fTiming};
        const miss=this.bKeys().filter(k=>!String(p.brief[k]||'').trim());
        return { msgs:p.msgs.map(m=>({text:m.text, cls: m.role==='user'?'v-msgu':'v-msga'})),
          busy:p.busy, hasError:!!p.error, error:p.error, q:p.q, qEmpty:!String(p.q||'').trim(),
          canAnswer: !p.busy, isEmpty: p.msgs.length===0,
          fields: this.bKeys().map(k=>({k, dom:'v-b-'+k, label:labels[k], v:p.brief[k]||'', ph:t.ai.empty})),
          draftTitle: String(p.brief.type||'').trim(), hasTitle: !!String(p.brief.type||'').trim(),
          hasMissing: miss.length>0, missingLabel: t.ai.missing+' · '+arNumerals(miss.length, lang),
          files: (s.aiFiles||[]).map((name,i)=>({name, i, rm:'×'})),
          matching:p.matching, hasMatches:p.matches.length>0,
          matchDisabled: p.matching || !String(p.brief.type||'').trim(),
          matches: p.matches.map(m=>{ const c=this.con(m.id)||{}; return {id:m.id, name:c.name?c.name[lang]:m.id, verified:!!c.verified,
            meta:[cityL(c.city), '★ '+c.rating, c.done+' '+t.projectsWord].join(' · '), why:m.why, whyLabel:t.ai.why+':'}; }) }; })(),
      wl, pa, ed, hed,
      openHoEdit: () => { const o=s.hoProfile||{}; const u=this.D.USERS.h1;
        this.setState({hedit:{name: s.user?.name || u[lang], city: o.city || u.city, about: o.about?.[lang] ?? u.about[lang], error:''}}); },
      closeHoEdit: () => this.setState({hedit:null}),
      setHoEdit: e => { const {name,value}=e.target; this.setState({hedit:{...s.hedit,[name]:value,error:''}}); },
      saveHoEdit: () => { const d=s.hedit; if(!String(d.name||'').trim()) return this.setState({hedit:{...d,error:t.hprofile.errName}});
        this.setState({ hoProfile:{...(s.hoProfile||{}), city:d.city, about:{...((s.hoProfile||{}).about||{}), [lang]:d.about}}, user:{...s.user, name:d.name.trim()}, hedit:null }); },
      openEdit: () => { const c=this.con('c1'); this.setState({edit:{name:c.name[lang], city:c.city, trades:[...c.trades], bio:c.bio[lang], error:''}}); },
      closeEdit: () => { const d=s.edit; if(!d) return;
        const c0=this.con('c1');
        const dirty = d.name!==c0.name[lang] || d.city!==c0.city || d.bio!==c0.bio[lang] || d.trades.join()!==c0.trades.join();
        if(dirty && !d.confirmCancel) return this.setState({edit:{...d, confirmCancel:true}});
        this.setState({edit:null}); },
      discardEdit: () => this.setState({edit:null}),
      keepEditing: () => this.setState({edit:{...s.edit, confirmCancel:false}}),
      setEdit: e => { const {name,value}=e.target; this.setState({edit:{...s.edit,[name]:value,error:''}}); },
      toggleEditTrade: e => { const id=e.currentTarget.dataset.id; const cur=s.edit.trades;
        this.setState({edit:{...s.edit, trades: cur.includes(id) ? cur.filter(x=>x!==id) : [...cur,id], error:''}}); },
      saveEdit: () => { const d=s.edit; if(!String(d.name||'').trim()) return this.setState({edit:{...d,error:t.profile.errName}});
        if(!d.trades.length) return this.setState({edit:{...d,error:t.profile.errTrades}});
        const bl=String(d.bio||'').length; if(bl<50||bl>500) return this.setState({edit:{...d,error:t.profile.errBio}});
        this.setState({ contractors: s.contractors.map(c=>c.id==='c1' ? {...c, name:{...c.name,[lang]:d.name.trim()}, city:d.city, trades:d.trades, bio:{...c.bio,[lang]:d.bio}} : c), edit:null,
          user: s.user ? {...s.user, name:d.name.trim()} : s.user }); },
      isNotAdmin: role==='homeowner'||role==='contractor',
      navOpenAttr: s.navOpen ? 'true' : 'false',
      toggleNav: () => this.setState({navOpen:!s.navOpen}),
      setAccount: e => { const {name,value}=e.target; this.setState({payout:{...s.payout, draft:{...(s.payout.draft||{}), [name]:value}, error:''}}); },
      editAccount: () => this.setState({payout:{...s.payout, editing:true, error:'', draft:{bank:s.payout.bank, holder:s.payout.holder || s.user?.name || '', iban:s.payout.iban}}}),
      cancelAccount: () => this.setState({payout:{...s.payout, editing:false, error:'', draft:null}}),
      saveAccount: () => { const p=s.payout, d=p.draft||{}; const iban=String(d.iban||'').replace(/\s/g,'').toUpperCase();
        if(!d.bank) return this.setState({payout:{...p,error:t.wallet.errBank}});
        if(!String(d.holder||'').trim()) return this.setState({payout:{...p,error:t.wallet.errHolder}});
        if(!/^SA\d{22}$/.test(iban)) return this.setState({payout:{...p,error:t.wallet.errIban}});
        this.setState({payout:{bank:d.bank, holder:String(d.holder).trim(), iban, saved:true, editing:false, error:'', draft:null}, wl:{...s.wl, notice:t.wallet.accountSaved, error:''}}); },
      setWallet: e => { const {name,value}=e.target; this.setState({wl:{...s.wl, [name==='wmethod'?'method':name]:value, error:'', notice:''}}); },
      withdrawAll: () => this.setState({wl:{...s.wl, amount:String(availableRaw), confirm:null, error:'', notice:''}}),
      addFunds: () => { const v=(wl.due&&wl.due.raw)||0; if(v<=0) return this.setState({wl:{...s.wl,error:t.wallet.dueNone}});
        const isTr = s.wl.method==='transfer';
        const tx = {who:'h1', date:t.ws.today, type:'deposit', method:s.wl.method, amount:v, st:isTr?'pending':'escrow'};
        this.setState({txns:[tx,...s.txns], wl:{...s.wl, amount:'', error:'', notice:isTr?t.wallet.addedTransfer:t.wallet.added}}); },
      requestWithdraw: () => { if(!s.payout.saved) return this.setState({wl:{...s.wl,error:t.wallet.withdrawNeedsAccount}, payout:{...s.payout,editing:true}});
        const v=Math.round((+String(s.wl.amount).replace(/[^\d.]/g,'')||0)*100)/100;
        if(v<=0) return this.setState({wl:{...s.wl,error:t.wallet.errAmount}});
        if(v>availableRaw) return this.setState({wl:{...s.wl,error:t.wallet.errMax}});
        this.setState({wl:{...s.wl, confirm:v, error:''}}); },
      cancelWithdraw: () => this.setState({wl:{...s.wl, confirm:null}}),
      confirmWithdraw: () => { const v=s.wl.confirm; if(!v) return;
        const tx = {who:'c1', date:t.ws.today, type:'payout', method:'bank', amount:v, st:'processing'};
        this.setState({txns:[tx,...s.txns], wl:{...s.wl, amount:'', confirm:null, error:'', notice:t.wallet.requested}}); },
      st, pe, bf,
      setBFilter: e => { const {name,value}=e.target; this.setState({bfilt:{...s.bfilt,[name]:value}}); },
      clearBFilter: () => this.setState({bfilt:{city:'',trade:'',min:''}}),
      askWithdraw: () => this.setState({withdrawAsk:true}),
      keepProject: () => this.setState({withdrawAsk:false}),
      doWithdraw: () => { this.setState({projects:s.projects.filter(p=>p.id!==s.curId), withdrawAsk:false}); this.nav('hdash'); },
      setSetting: e => { const {name,value}=e.target; this.setState({setg:{...s.setg,[name]:value,notice:''}}); },
      setPref: e => { const {name,checked}=e.target; this.setState({setg:{...s.setg, prefs:{...s.setg.prefs,[name]:checked}, notice:''}}); },
      saveSettings: () => this.setState({setg:{...s.setg, notice:t.settings.saved}}),
      rev, setStars: e => this.setState({revF:{...s.revF, stars:+e.currentTarget.dataset.n, error:''}}),
      setRevText: e => this.setState({revF:{...s.revF, text:e.target.value, error:''}}),
      submitReview: () => { const f=s.revF;
        if(!f.stars) return this.setState({revF:{...f,error:t.rev.errStars}});
        if(f.text.trim().length<12) return this.setState({revF:{...f,error:t.rev.errText}});
        this.setState({reviews:[...s.reviews,{pid:s.curId, by:role, stars:f.stars, text:f.text.trim(), date:t.ws.today}], revF:{stars:0,text:'',error:''}}); },
      nt, toggleNotifs: () => this.setState({notifOpen:!s.notifOpen, menuOpen:false}),
      closeNotifs: () => this.setState({notifOpen:false}),
      markAllRead: () => this.setState({notifRead: nt.items.map(x=>x.id)}),
      hp, auth, authSteps, userInitial: (s.user?.name||'').trim().charAt(0),
      menuOpen: !!s.menuOpen, menuOpenAttr: s.menuOpen ? 'true':'false',
      accountRole: role==='homeowner'? t.roles.homeowner : role==='contractor'? t.roles.contractor : t.roles.admin,
      back: () => this.goBack(),
      showBack: (s.hist||[]).length>0 && !['home','project','homeowner','contractor'].includes(s.route),
      backWord: t.goBack, backArrow: lang==='ar' ? '→' : '←',
      toggleMenu: () => this.setState({menuOpen: !s.menuOpen}),
      closeMenu: () => this.setState({menuOpen:false}),
      goMenu: e => { const d=e.currentTarget.dataset; this.setState({menuOpen:false}); this.nav(d.route, d.id?{curId:d.id}:{}); },
      ruleStages: [
        {n:'1', title:t.rules.l1, sub:t.rules.l1sub, items:t.rules.s1},
        {n:'2', title:t.rules.l2, sub:t.rules.l2sub, items:t.rules.s2},
        {n:'3', title:t.rules.l3, sub:t.rules.l3sub, items:t.rules.s3}
      ].map((x,i)=>({...x, n: arNumerals(i+1, lang)})),
      naf: { idle: s.auth.naf==='idle', wait: s.auth.naf==='wait', done: s.auth.naf==='done', code: arNumerals(s.auth.nafCode||'', lang) },
      authNafLabel: a.mode==='signin' ? t.auth.nafathSign : t.auth.nafathVerify,
      startNafath: this._startNafath || (this._startNafath = () => { const code = 10 + Math.floor(Math.random()*89);
        this.setState(st=>({auth:{...st.auth, naf:'wait', nafCode:code, error:''}}));
        clearTimeout(this._naf); this._naf = setTimeout(()=>{ const a=this.state.auth; if(a.naf!=='wait') return;
          this.setState(st=>({auth:{...st.auth, naf:'done'}, user: st.user ? {...st.user, nafath:true} : st.user})); }, 2600); }),
      nafVerified: !!s.user?.nafath, coNeedsNafath: role==='contractor' && !s.user?.nafath, hoNeedsNafath: role==='homeowner' && !s.user?.nafath,
      authTitle:a.mode==='signin'?t.auth.titleIn:t.auth.titleUp, authPrimary:a.mode==='signin'?t.auth.signIn:t.continue,
      authLede: a.mode==='signin' ? t.auth.ledeIn : t.auth.ledeUp,
      authNafLine: a.role==='contractor' ? t.auth.nafCo : t.auth.nafHo, authRoleLabel:a.mode==='signin'?t.auth.signInAs:t.auth.nafathRole,
      post, postSteps, myProjects, hStats, hActions, noHActions:!hActions.length, savedList, noSaved:!savedList.length,
      qaProjN: myProjects.length || null, qaSavedN: savedList.length || null, qaToProjects: this.qaToProjects,
      qaOpenN: openProjects.length || null, qaWorkN: cProjects.length || null, qaToWork: this.qaToWork,
      ...Object.fromEntries(HIRE_CATS.map((id,n)=>['hc'+n, {id, label: tradeL(id)}])),
      hireTrade: this.hireTrade,
      cProjects, cStats, cPayments, openProjects: openProjects.slice(0, s.openShown),
      openTotal: openProjects.length, openShown: Math.min(s.openShown, openProjects.length),
      openTally: projN(Math.min(s.openShown, openProjects.length), openProjects.length), hasMoreOpen: openProjects.length > s.openShown,
      moreOpenCount: Math.max(0, openProjects.length - s.openShown), openPct: openProjects.length ? Math.round(Math.min(s.openShown, openProjects.length)/openProjects.length*100) : 100,
      pj, pTabs, tab, canBid, alreadyBid, bidNeedsNafath, fundNeedsNafath, noBids: pr && !pr.bids.length, noBidsHo: pr && !pr.bids.length && role!=='contractor', hasBids: pr && pr.bids.length>0, noMs: pr && !pr.ms.length, canMessage: role==='homeowner'||role==='contractor', year:String(new Date().getFullYear()), bidF:this.bidView(s, t, lang, pr), msgDraft:s.msgDraft, needsFunding, showLedger: pr && pr.ledger.length>0, payIsCard:s.pay==='card', payIsApple:s.pay==='apple', payIsMada:s.pay==='mada', backRoute: role==='contractor'?'cdash': role==='admin'?'admin':'hdash',
      feeStops: t.pricing2.jStops.map((x,i)=>({...x, paid: i===3 ? 'true':'false', mark: i===3 ? '★' : '✓'})),
      ct: { f:s.contact, sent:s.contact.sent, form:!s.contact.sent, error:s.contact.error },
      setContact: e => { const {name,value}=e.target; this.setState({contact:{...s.contact,[name]:value,error:''}}); },
      sendContact: () => { const c=s.contact; if(!c.name || (!c.email && !c.phone) || !c.msg) return this.setState({contact:{...c,error:t.pages.cErr}}); this.setState({contact:{...c,sent:true,error:''}}); },
      trustRules, calc, priceCards, paidCard, freeCard, inclList, prIsHo: s.prole==='homeowner', prIsCo: s.prole==='contractor',
      setPriceRole: e => this.setState({prole:e.target.value}),
      setCalc: e => { const v = Math.max(0, +e.target.value || 0); this.setState({calcRaw:v, calcDraft:String(v)}); },
      setCalcDraft: e => { const txt = e.target.value; const n = Number(txt); this.setState({calcDraft:txt, ...(txt !== '' && !isNaN(n) && n > 0 ? {calcRaw:n} : {})}); },
      commitCalc: () => { const n = Math.max(10000, Number(s.calcDraft) || 10000); this.setState({calcRaw:n, calcDraft:String(n)}); },
      giftOpen: !!(s.gift && s.gift.open), giftCode: s.gift ? s.gift.code : '', giftBadge: !!(s.gift && !s.gift.used && role==='homeowner'),
      giftLater: () => this.setState({gift:{...s.gift, open:false, seen:true}}),
      giftStart: () => { this.setState({gift:{...s.gift, open:false, seen:true}}); this.nav('post'); },
      lr: this.lateView(s, t, lang),
      lrRemind: e => { const id=e.currentTarget.dataset.id; this.setState({strikes:(s.strikes||[]).map(k=>k.id===id?{...k,reminded:true}:k)}); },
      lrWaive: e => { const id=e.currentTarget.dataset.id; this.setState({strikes:(s.strikes||[]).map(k=>k.id===id?{...k,status:'waived'}:k)}); },
      lrRefund: e => { const {id,st}=e.currentTarget.dataset; this.setState({refunds:(s.refunds||[]).map(r=>r.id===id?{...r,status:st}:r)}); },
      ...this.lateCaseVals(s, t, lang, pr, role),
      wa: this.waView(s, t, lang, role), sk: this.strikeMeter(s, t, lang, role), pjSk: this.projStrike(s, t, lang, role, pr),
      waVerify: () => { const n = String((s.setg||{}).waNumber || (s.setg||{}).mobile || '').trim(); if(n.length < 9) return; this.setState({setg:{...s.setg, waNumber:n, waVerified:true, waSent:n, notice:''}}); },
      waChannel: e => this.setState({setg:{...s.setg, channel:e.currentTarget.dataset.v}}),
      hc: this.helpView(s, t, lang), hcSearch: e => this.setState({hcQ:e.target.value}), hcCat: e => { const c=e.currentTarget.dataset.c; this.setState({hcCat: s.hcCat===c ? '' : c, hcQ:''}); },
      inv: this.invView(s, t, lang, pr), openInv: e => { const d=e.currentTarget.dataset; this.setState({invOpen: d.li!=null ? {li:+d.li, kind:d.kind||'receipt'} : d.inv}); }, closeInv: () => this.setState({invOpen:null}), printInv: () => window.print(),
      showWaFab: s.route !== 'admin' && role !== 'admin',
      waFabShow: (s.route === 'home' ? s.scrolled : true) ? 'true' : 'false',
      an: this.analytics(s, t, lang), live: this.liveView(s, t, lang),
      pm: this.promoView(s, t, lang), af: this.affView(s, t, lang),
      pmOpen: () => this.setState({pmDraft:{code:this._genCode(), type:'pct', value:'', applies:'ho', min:'', max:'', per:'1', start:'2026-09-16', end:'', note:'', err:''}}),
      pmClose: () => this.setState({pmDraft:null}),
      pmSet: e => { const {name,value}=e.target; this.setState({pmDraft:{...s.pmDraft,[name]: name==='code' ? value.toUpperCase().replace(/[^A-Z0-9]/g,'') : value, err:''}}); },
      pmType: e => this.setState({pmDraft:{...s.pmDraft, type:e.currentTarget.dataset.v, err:''}}),
      pmGen: () => this.setState({pmDraft:{...s.pmDraft, code:this._genCode(), err:''}}),
      pmSave: () => { const d = s.pmDraft, P = t.admin.pm; if(!d) return;
        if(!/^[A-Z0-9]{4,12}$/.test(d.code)) return this.setState({pmDraft:{...d, err:P.errCode}});
        if((s.promos||[]).some(p=>p.code===d.code)) return this.setState({pmDraft:{...d, err:P.errDup}});
        const v = Number(d.value); if(!(v > 0) || (d.type==='pct' && v > 100)) return this.setState({pmDraft:{...d, err:P.errValue}});
        if(d.end && d.start && d.end <= d.start) return this.setState({pmDraft:{...d, err:P.errDates}});
        const np = {id:'pm'+Date.now(), code:d.code, type:d.type, value:v, applies:d.applies, min:Number(d.min)||0, max:d.max ? Number(d.max) : null, per:Number(d.per)||1, start:d.start||'2026-09-16', end:d.end||null, note:d.note||'', uses:0, saved:0, paused:false, archived:false};
        this.setState({promos:[np, ...(s.promos||[])], pmDraft:null}); },
      pmToggle: e => { const id=e.currentTarget.dataset.id; this.setState({promos:(s.promos||[]).map(p=>p.id===id?{...p,paused:!p.paused}:p)}); },
      pmArchive: e => { const id=e.currentTarget.dataset.id; this.setState({promos:(s.promos||[]).map(p=>p.id===id?{...p,archived:true,paused:true}:p)}); },
      pmCopy: e => { const c=e.currentTarget.dataset.code; this._copy(c); this.setState({copied:c}); clearTimeout(this._cp); this._cp=setTimeout(()=>this.setState({copied:null}),1600); },
      afOpen: () => this.setState({afDraft:{name:'', type:'creator', rate:'20', code:'', contact:'', err:''}}),
      afClose: () => this.setState({afDraft:null}),
      afSet: e => { const {name,value}=e.target; this.setState({afDraft:{...s.afDraft,[name]: name==='code' ? value.toUpperCase().replace(/[^A-Z0-9]/g,'') : value, err:''}}); },
      afSave: () => { const d = s.afDraft, A = t.admin.af; if(!d) return;
        if(!String(d.name||'').trim()) return this.setState({afDraft:{...d, err:A.errName}});
        const r = Number(d.rate); if(!(r >= 1 && r <= 50)) return this.setState({afDraft:{...d, err:A.errRate}});
        const code = d.code || String(d.name).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8) || this._genCode();
        if(!/^[A-Z0-9]{4,12}$/.test(code) || (s.affiliates||[]).some(a=>a.code===code)) return this.setState({afDraft:{...d, err:A.errCode}});
        const na = {id:'af'+Date.now(), name:d.name.trim(), type:d.type, rate:r, code, contact:d.contact||'', clicks:0, signups:0, projects:0, earned:0, owed:0, paused:false};
        this.setState({affiliates:[na, ...(s.affiliates||[])], afDraft:null}); },
      afToggle: e => { const id=e.currentTarget.dataset.id; this.setState({affiliates:(s.affiliates||[]).map(a=>a.id===id?{...a,paused:!a.paused}:a)}); },
      afPay: e => { const id=e.currentTarget.dataset.id; this.setState({affiliates:(s.affiliates||[]).map(a=>a.id===id?{...a,owed:0}:a)}); },
      afCopy: e => { const c=e.currentTarget.dataset.link; this._copy('https://'+c); this.setState({copied:c}); clearTimeout(this._cp); this._cp=setTimeout(()=>this.setState({copied:null}),1600); },
      setAnRange: e => this.setState({anRange:e.currentTarget.dataset.r}),
      setGa: e => this.setState({gaDraft:e.target.value, gaErr:false}),
      connectGa: () => { const v = String(s.gaDraft||'').trim().toUpperCase(); if(!/^G-[A-Z0-9]{6,12}$/.test(v)) return this.setState({gaErr:true}); this.setState({gaId:v, gaErr:false, gaDraft:''}); },
      disconnectGa: () => this.setState({gaId:null}),
      fin, adminQuick, adminTabs, atab, adminStats, allProjects:s.projects.map(decorateP), verifQueue, noVerif:!verifQueue.length, cases, payRows, userRows, faqs,

      goAuth: e => { const rl=e.currentTarget.dataset.signup;
        this.setState({route:'auth', menuOpen:false, navOpen:false, auth:{...s.auth, mode:'signup', step:1, role:rl, error:''}});
        window.scrollTo({top:0,behavior:'instant'}); },
      go: e => { const d=e.currentTarget.dataset; const extra={}; if(s.navOpen) extra.navOpen=false; if(d.id) extra.curId=d.id; if(d.tab) extra.tab=d.tab; else if(d.route==='project') extra.tab='overview'; if(d.route==='auth'&&d.role) extra.auth={...s.auth,mode:'signup',role:d.role,step:1,error:''}; if(d.route==='post' && role && role!=='homeowner') { this.nav('auth',{auth:{...s.auth,mode:'signup',role:'homeowner',step:1}}); return; } this.nav(d.route, extra); },
      toggleLang: () => this.setState({lang: lang==='en'?'ar':'en'}),
      setLang: e => this.setState({lang: e.target.value}),
      askClose: () => this.setState(st=>({closeAsk:!st.closeAsk})),
      confirmClose: () => this.setState({closeAsk:false, setg:{...s.setg, notice:t.settings.closeSent}}),
      signOut: () => { this.setState({user:null, menuOpen:false}); this.nav('home'); },
      demoSignIn: e => { const rl=e.currentTarget.dataset.role; const name = rl==='homeowner'?uName('h1'): rl==='contractor'? cName('c1') : (lang==='en'?'Operations':'العمليات'); this.setState({user:{role:rl,name,nafath:true}, auth:{...s.auth,naf:'done'}}); if(s.pendingPost && rl==='homeowner') { this.publishPost(); return; } this.nav(rl==='homeowner'?'hdash': rl==='contractor'?'cdash':'admin'); },
      setMode: e => this.setState({auth:{...s.auth,mode:e.target.value,step:1,error:''}}),
      resendOtp: () => this.setState({auth:{...s.auth, otpCode:String(1000+Math.floor(Math.random()*8999)), f:{...s.auth.f,otp:''}, error:''}}),
      setAuthField: e => { const {name,value,type,checked}=e.target; if(name==='role') this.setState({auth:{...s.auth,role:value}}); else this.setState({auth:{...s.auth,error:'',f:{...s.auth.f,[name]:type==='checkbox'?checked:value}}}); },
      authBack: () => this.setState({auth:{...s.auth,step:Math.max(1,s.auth.step-1),error:''}}),
      authNext: () => { const a=s.auth, f=a.f;
        if(a.step===1){ const digits=String(f.mobile||'').replace(/\D/g,''); if(digits.length<9) return this.setState({auth:{...a,error:t.auth.errMobile}});
          return this.setState({auth:{...a, step:2, otpCode:String(1000+Math.floor(Math.random()*8999)), error:''}}); }
        if(a.step===2){ if(String(f.otp||'').replace(/\D/g,'').length!==4) return this.setState({auth:{...a,error:t.auth.errOtp}});
          if(a.mode==='signin') return this._authFinish(a.role);
          return this.setState({auth:{...a, step:3, error:''}}); }
        if(!f.name) return this.setState({auth:{...a,error:t.auth.errName}});
        if(!f.tc) return this.setState({auth:{...a,error:t.auth.tcErr}});
        this._authFinish(a.role); },
      toggleVNote: e => { const id=e.currentTarget.dataset.id; this.setState(st=>({vNote: st.vNote===id ? null : id})); },
      setFilter: e => { const {name,value,type,checked}=e.target; this.setState({filt:{...s.filt,[name]:type==='checkbox'?checked:value}, page:1}); },
      hasFilters: !!(s.filt.q || s.filt.city || s.filt.trade || s.filt.verified),
      clearFilters: () => this.setState({filt:{q:'',city:'',trade:'',verified:false,sort:s.filt.sort}, page:1}),
      setPage: e => { const p = +e.currentTarget.dataset.p; if(p && p!==page) { this.setState({page:p}); window.scrollTo({top:0,behavior:'smooth'}); } },
      loadMoreOpen: () => this.setState({openShown: s.openShown + 3}),
      toggleSave: e => { e.stopPropagation(); const id=e.currentTarget.dataset.id; this.setState({saved: s.saved.includes(id)? s.saved.filter(x=>x!==id) : [...s.saved,id]}); },
      toggleFaq: e => { const i=+e.currentTarget.dataset.i; this.setState({openFaq: s.openFaq===i?-1:i}); },
      setPostField: e => { const {name,value}=e.target; this.setState({post:{...s.post,f:{...s.post.f,[name]:value},error:''}}); },
      postUpload: e => { const names=[...(e.target.files||[])].map(f=>f.name); this.setState({post:{...s.post,files:[...s.post.files,...(names.length?names:['photo-'+(s.post.files.length+1)+'.jpg'])]}}); },
      useSuggestion: () => { const S=this.sugFor(s.post.f); if(!S) return;
        this.setState({post:{...s.post, f:{...s.post.f, min:String(S.lo), max:String(S.hi)}, error:''}}); },
      useSuggestion: () => { const S=this.sugFor(s.post.f); if(!S) return;
        this.setState({post:{...s.post, f:{...s.post.f, min:String(S.lo), max:String(S.hi)}, error:''}}); },
      postBack: () => this.setState({post:{...s.post,step:s.post.step-1,error:''}}),
      postGoStep: e => this.setState({post:{...s.post,step:+e.currentTarget.dataset.step,error:''}}),
      togglePledge: e => this.setState({post:{...s.post,pledge:e.target.checked,error:''}}),
      postNext: () => { const f=s.post.f; if(s.post.step===1 && (!f.title||!f.desc)) return this.setState({post:{...s.post,error:t.post.errTitle}}); if(s.post.step===2 && (!f.min||!f.max)) return this.setState({post:{...s.post,error:t.post.errBudget}}); if(s.post.step<4) return this.setState({post:{...s.post,step:s.post.step+1,error:''}}); if((+f.max||0) > 1000000) return this.setState({post:{...s.post,error:t.post.capNote}}); if(!s.post.pledge) return this.setState({post:{...s.post,error:t.post.pledgeErr}}); if(role!=='homeowner'){ this.setState({pendingPost:true, auth:{...s.auth,mode:'signup',role:'homeowner',step:1}}); this.nav('auth'); return; } this.publishPost(); },
      setTab: e => this.setState({tab:e.currentTarget.dataset.tab}),
      setAdminTab: e => this.setState({atab:e.currentTarget.dataset.tab}),
      setBidField: e => { const {name,value}=e.target; this.setState({bidF:{...s.bidF,[name]:value,error:''}}); },
      setBidToggle: e => { const {name,checked}=e.target; this.setState({bidF:{...s.bidF,[name]:checked,error:''}}); },
      reviewBid: () => { const b=s.bidF;
        if(!b.price||!b.days) return this.setState({bidF:{...s.bidF,error:t.ws.errBid}});
        if(!b.warranty||!b.valid||!b.start) return this.setState({bidF:{...s.bidF,error:t.ws.errTerms}});
        const tot=(+b.ms1||0)+(+b.ms2||0)+(+b.ms3||0);
        if(tot!==100) return this.setState({bidF:{...s.bidF,error:t.ws.fMsNote}});
        this.setState({bidF:{...s.bidF, step:'review', error:''}}); },
      editBid: () => this.setState({bidF:{...s.bidF, step:'edit'}}),
      submitBid: () => { const b=s.bidF; if(!b.price||!b.days) return this.setState({bidF:{...s.bidF,error:t.ws.errBid}}); this.updProj(pr.id, p=>({...p,bids:[...p.bids,{cid:me,price:+b.price,days:+b.days,note:{en:b.note,ar:b.note},incl:b.incl,excl:b.excl,brands:b.brands,start:b.start,warranty:b.warranty,valid:b.valid,visit:!!b.visit,vatReg:!!b.vatReg,ms:[+b.ms1,+b.ms2,+b.ms3]}]})); this.setState({bidF:{price:'',days:'',note:'',incl:'',excl:'',brands:'',start:'',warranty:'',valid:'',ms1:'30',ms2:'40',ms3:'30',vatReg:true,visit:false,step:'edit',error:''}}); },
      acceptBid: e => this.setState({agr:{cid:e.currentTarget.dataset.cid, read:false}}),
      openAgreementCo: () => this.setState({agr:{cid: pr && pr.pending ? pr.pending.cid : null, read:false}}),
      closeAgreement: () => this.setState({agr:null}),
      agrScroll: e => { const el=e.currentTarget;
        if(el.scrollTop + el.clientHeight >= el.scrollHeight - 8 && s.agr && !s.agr.read) this.setState({agr:{...s.agr, read:true}}); },
      signAgreement: () => { const a=s.agr; if(!a||!a.read||!pr) return;
        const cid=a.cid; const bid=pr.bids.find(b=>b.cid===cid); if(!bid) return;
        const at=new Date().toISOString().slice(0,10); const who=(s.user&&s.user.name)||'';
        if(role==='contractor'){
          this.updProj(pr.id, p=>({...p, status:'active', contractorId:cid, amount:(p.pending?p.pending.price:bid.price),
            ms:['pending','pending','pending'], ev:[0,1,2].map(()=>({p:false,v:false,o:false})), pending:null,
            sig:{...(p.sig||{}), co:{name:who, at}}}));
          this.setState({agr:null, tab:'payments'}); return;
        }
        this.updProj(pr.id, p=>({...p, pending:{cid, price:bid.price, days:bid.days}, sig:{...(p.sig||{}), ho:{name:who, at}}}));
        this.setState({agr:null}); },
      submitMs: e => { const i=+e.currentTarget.dataset.i; const ev=this.ev(pr,i); if(!ev.p||!ev.v) return; this.updProj(pr.id, p=>({...p,ms:p.ms.map((m,j)=>j===i?'submitted':m)})); },
      addEv: e => { const {i,k}=e.currentTarget.dataset; this.setEv(pr.id, +i, k); },
      crOpen: s.crOpen, crF: s.crF || {desc:'',amount:'',days:''}, crError: s.crError || '',
      crToggle: () => this.setState(st=>({crOpen:!st.crOpen, crError:''})),
      crSet: e => { const {name,value}=e.target; this.setState(st=>({crF:{...(st.crF||{desc:'',amount:'',days:''}),[name]:value}, crError:''})); },
      crSubmit: () => { const f=s.crF||{}; if(!String(f.desc||'').trim()) return this.setState({crError:t.ws.cr.errDesc});
        const side = role==='contractor' ? 'co' : 'ho';
        const delta = Math.round(Number(f.amount)||0), days = Math.round(Number(f.days)||0);
        this.updProj(pr.id, p=>{ const list=p.changes||[];
          return {...p, changes:[...list, {id:'CR-'+(list.length+1), by:side, desc:String(f.desc).trim(), amount:delta, days,
            hoOk:side==='ho', coOk:side==='co', newTotal:(p.amount||0)+delta}]}; });
        this.setState({crOpen:false, crF:{desc:'',amount:'',days:''}, crError:''}); },
      crApprove: e => { const id=e.currentTarget.dataset.id; const side = role==='contractor' ? 'co' : 'ho';
        this.updProj(pr.id, p=>{ let amount=p.amount||0, days=p.days||0;
          const changes=(p.changes||[]).map(c=>{ if(c.id!==id) return c;
            const nc={...c, hoOk:c.hoOk||side==='ho', coOk:c.coOk||side==='co'};
            if(nc.hoOk && nc.coOk && !c.applied){ amount = amount + (c.amount||0); days = days + (c.days||0); nc.applied=true; nc.newTotal=amount; }
            return nc; });
          return {...p, changes, amount, days}; }); },
      approveMs: e => { const i=+e.currentTarget.dataset.i; if(!this.ev(pr,i).o) return; const am=this.msAmounts(pr); this.updProj(pr.id, p=>{ const ms=p.ms.map((m,j)=>j===i?'released':m); const fo=this.feeOf(am[i]); const inv='TRM-'+String(Date.now()).slice(-6), inv2='TRM-'+String(Date.now()+1).slice(-6); return {...p,ms,status:ms.every(m=>m==='released')?'completed':p.status,ledger:[...p.ledger,{date:t.ws.today,label:'release',ms:i,amount:am[i]},{date:t.ws.today,label:'fee',ms:i,amount:fo.fee,inv},{date:t.ws.today,label:'vat',ms:i,amount:fo.feeVat,inv},{date:t.ws.today,label:'commission',ms:i,amount:fo.comm,inv:inv2},{date:t.ws.today,label:'commvat',ms:i,amount:fo.commVat,inv:inv2}]}; }); },
      disputeMs: e => { const i=+e.currentTarget.dataset.i; this.updProj(pr.id, p=>({...p,ms:p.ms.map((m,j)=>j===i?'disputed':m)})); this.setState(st=>({cases:[{id:'S-'+(205+st.cases.length),pid:pr.id,issue:{en:'Homeowner raised an issue on '+t.ws.ms[i].n,ar:'رفع المالك مشكلة على '+t.ws.ms[i].n},open:true},...st.cases]})); },
      resolveMs: e => { const i=+e.currentTarget.dataset.i; this.updProj(pr.id, p=>({...p,ms:p.ms.map((m,j)=>j===i?'submitted':m)})); },
      setMsgDraft: e => this.setState({msgDraft:e.target.value}),
      msgKey: e => { if(e.key==='Enter' && s.msgDraft.trim()) { this.updProj(pr.id, p=>({...p,msgs:[...p.msgs,{from:role==='contractor'?'c':'h',text:{en:s.msgDraft,ar:s.msgDraft},time:t.ws.today}]})); this.setState({msgDraft:''}); } },
      sendMsg: () => { if(!s.msgDraft.trim()) return; this.updProj(pr.id, p=>({...p,msgs:[...p.msgs,{from:role==='contractor'?'c':'h',text:{en:s.msgDraft,ar:s.msgDraft},time:t.ws.today}]})); this.setState({msgDraft:''}); },
      wsUpload: e => { const n=e.target.files?.[0]?.name||'upload.jpg'; this.updProj(pr.id, p=>({...p,files:[...p.files,{name:n,by:role==='contractor'?'c':'h',date:t.ws.today}]})); },
      setPay: e => this.setState({pay:e.target.value}),
      fundProject: () => { this.updProj(pr.id, p=>({...p,funded:true,ledger:[{date:t.ws.today,label:'fund',amount:p.amount},...p.ledger]})); this.setState({tab:'milestones'}); },
      approveVerif: e => { const id=e.currentTarget.dataset.id; this.setState({contractors:s.contractors.map(c=>c.id===id?{...c,verified:true,checks:{id:true,cr:true,pf:true}}:c)}); },
      rejectVerif: e => { const id=e.currentTarget.dataset.id; this.setState({rejected:[...s.rejected,id]}); },
      closeCase: e => { const id=e.currentTarget.dataset.id; this.setState({cases:s.cases.map(c=>c.id===id?{...c,open:false}:c)}); }
    };
  }
}

export default Component;
