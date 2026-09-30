/* The open projects as everyone sees them (supabase/034): /projects, and one of them at /projects/P-….

   A visitor, a homeowner, a contractor still being verified and the team all get this page — the team sees exactly what
   the public does. A verified contractor never lands here: the guard gives them the full project, with the bid form.
   What is shown is what public_projects() returns: the request, its trade, city, budget, start and date. The homeowner
   is never named, their district is not given, and contact details typed in a description are masked by the database.
   Bidding and messaging need an account: the page says how to get one, for whoever is looking. */

import { useEffect, useMemo, useState, type ChangeEvent, type MouseEvent } from 'react';
import { PLATFORM_COPY } from '../platform/copy';
import { currentAccount, loadPublicProjects, type PublicProject } from '../platform/session';
import { useLaunchActions, useLogicState, type VM } from '../state/viewModel';
import { routeHref } from './urls';

/** The list, kept for a minute between the list and a project, so moving back and forth costs nothing. */
let cache: { rows: PublicProject[]; at: number } | null = null;
const PAGE = 12;

type Viewer = 'visitor' | 'homeowner' | 'pending' | 'verified' | 'admin';

export default function PublicProjects({ vm }: { vm: VM }) {
  const state = useLogicState();
  const { host } = useLaunchActions();
  const ar = vm.dir !== 'ltr';
  const copy = PLATFORM_COPY[ar ? 'ar' : 'en'];
  const account = currentAccount();
  const viewer: Viewer = !account ? 'visitor' : account.profile.role === 'admin' ? 'admin'
    : account.profile.role === 'contractor' ? (account.logicUser.nafath ? 'verified' : 'pending') : 'homeowner';
  const code = state.route === 'listing' ? String(state.curId || '') : '';

  const [rows, setRows] = useState<PublicProject[] | null>(cache?.rows ?? null);
  const [byCode, setByCode] = useState<{ code: string; row: PublicProject | null; failed?: boolean } | null>(null);
  const [failed, setFailed] = useState(false);
  const [filt, setFilt] = useState({ city: '', trade: '', min: '' });
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    let live = true;
    if (cache && Date.now() - cache.at < 60000) return undefined; // (the list was taken from it as the page opened)
    void loadPublicProjects().then((r) => {
      if (!live) return;
      if (!r) { setFailed(true); return; }
      cache = { rows: r, at: Date.now() };
      setRows(r);
    });
    return () => { live = false; };
  }, []);
  // the small "some are examples" line under the early-access notice (LaunchNotice.tsx) follows what is listed
  useEffect(() => {
    if (!rows) return;
    const samples = rows.some((r) => r.preview);
    if (Boolean(host.logic.state.publicSamples) !== samples) host.setLogicState({ publicSamples: samples });
  }, [rows, host]);
  // a project past the newest 300 (or when the list could not be read) is asked for by its code
  const listed = code ? rows?.find((r) => r.code === code) : undefined;
  const askByCode = Boolean(code && !listed && (rows || failed));
  useEffect(() => {
    if (!askByCode) return undefined;
    let live = true;
    // could not ask is not "not open": only an answer from the database may say a project is closed
    void loadPublicProjects(code).then((r) => { if (live) setByCode(r ? { code, row: r[0] ?? null } : { code, row: null, failed: true }); });
    return () => { live = false; };
  }, [askByCode, code]);
  const asked = byCode?.code === code ? byCode : null;
  const one: PublicProject | null | undefined = listed ?? (asked && !asked.failed ? asked.row : undefined);
  const unreachable = Boolean(!listed && asked?.failed);

  const label = (list: { id: string; label: string }[] | undefined, id: string) => list?.find((x) => x.id === id)?.label || id;
  const tradeLabel = (id: string) => ((vm.tradeGroups as { items: { id: string; label: string }[] }[] | undefined) || []).flatMap((g) => g.items).find((x) => x.id === id)?.label || id;
  const fmt = (n: number) => Number(n || 0).toLocaleString('en-US');
  const budget = (p: PublicProject) => (ar ? `${vm.t.browse.budgetPre} ${fmt(p.budget_min)} ${vm.t.browse.budgetTo} ${fmt(p.budget_max)} ريال` : `${vm.t.browse.budgetPre} SAR ${fmt(p.budget_min)} ${vm.t.browse.budgetTo} ${fmt(p.budget_max)}`);
  const day = (iso: string) => new Date(iso).toLocaleDateString(ar ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const go = (patch: Record<string, unknown>) => { host.setLogicState(patch); window.scrollTo(0, 0); };
  /** A link's click: in place, unless a modifier asks for a new tab or window (the browser then follows its href). */
  const link = (patch: Record<string, unknown>) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    e.preventDefault(); go(patch);
  };

  const filtered = useMemo(() => (rows || []).filter((p) => (!filt.city || p.city === filt.city) && (!filt.trade || p.trade === filt.trade) && (!filt.min || p.budget_max >= Number(filt.min))), [rows, filt]);
  const setF = (e: ChangeEvent<HTMLSelectElement>) => { setFilt({ ...filt, [e.currentTarget.name]: e.currentTarget.value }); setShown(PAGE); };

  /** What the one looking can do next: join or sign in, post their own project, wait for verification, or open the console. */
  const next = (p: PublicProject | null) => (
    <div className="card pub-next" style={{ background: '#1B1464', color: '#fff', border: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.7 }}>
        {viewer === 'visitor' ? (p ? copy.pubJoinQ : copy.pubJoinListQ) : viewer === 'homeowner' ? copy.pubHomeowner : viewer === 'pending' ? copy.pubPending : viewer === 'verified' ? copy.pubVerified : copy.pubAdmin}
      </p>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        {viewer === 'visitor' ? (<>
          <a className="btn btn-p btn-sm pub-join" href={routeHref('join')} onClick={link({ route: 'join' })}>{copy.pubJoin}</a>
          {/* signing in from here comes back to this project: a verified contractor then finds the bid form */}
          <a className="lnk pub-signin" style={{ color: '#FFB199', cursor: 'pointer' }} href={routeHref('auth')}
            onClick={link(p ? { route: 'project', curId: p.code, tab: 'bids' } : { route: 'auth', auth: { ...state.auth, mode: 'signin', role: 'homeowner', step: 1, error: '' } })}>{copy.pubSignIn}</a>
        </>) : viewer === 'homeowner' ? (
          <a className="btn btn-p btn-sm" href={routeHref('post')} onClick={link({ route: 'post' })}>{copy.pubPost}</a>
        ) : viewer === 'pending' ? (
          <a className="btn btn-s btn-sm" href={routeHref('cdash')} onClick={link({ route: 'cdash' })}>{copy.pubMyDash}</a>
        ) : viewer === 'verified' && p ? (
          <a className="btn btn-p btn-sm pub-bid" href={routeHref('project', p.code)} onClick={link({ route: 'project', curId: p.code, tab: 'bids' })}>{copy.pubBid}</a>
        ) : viewer === 'admin' && p ? (
          <a className="btn btn-s btn-sm pub-console" href={routeHref('project', p.code)} onClick={link({ route: 'project', curId: p.code, tab: 'overview' })}>{copy.pubAdminOpen}</a>
        ) : null}
      </div>
    </div>
  );

  if (code) {
    const back = <a className="lnk" href={routeHref('browse')} onClick={link({ route: 'browse' })} style={{ cursor: 'pointer', fontSize: '13.5px' }}>{ar ? '→' : '←'} {copy.pubBack}</a>;
    if (unreachable) return (
      <section className="wrap fade pub-unreachable" style={{ paddingBlock: '40px 80px', minHeight: '50vh' }}>{back}
        <p className="autherr" role="alert" style={{ marginTop: '20px' }}>{copy.err.network}</p>
        <button type="button" className="btn btn-s btn-sm" style={{ marginTop: '12px' }} onClick={() => { setByCode(null); setFailed(false); cache = null; setRows(null); void loadPublicProjects().then((r) => { if (r) { cache = { rows: r, at: Date.now() }; setRows(r); } else setFailed(true); }); }}>{copy.pubRetry}</button>
      </section>
    );
    if (one === undefined) return <section className="wrap fade" style={{ paddingBlock: '40px 80px', minHeight: '50vh' }}>{back}<p className="muted" style={{ marginTop: '20px' }}>{copy.pubLoading}</p></section>;
    if (one === null) return (
      <section className="wrap fade pub-gone" style={{ paddingBlock: '40px 80px', minHeight: '50vh' }}>{back}
        <h1 style={{ fontSize: 'clamp(22px,2.6vw,28px)', color: '#1B1464', marginTop: '18px' }}>{copy.pubGone}</h1>
      </section>
    );
    const p = one;
    return (
      <section className="wrap fade pub-project" style={{ paddingBlock: '32px 80px' }}>
        {back}
        {viewer === 'admin' ? <p className="muted pub-admin-note" style={{ fontSize: '12.5px', marginTop: '10px' }}>{copy.pubAdminNote}</p> : null}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '22px', marginTop: '18px', alignItems: 'start' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', gridColumn: 'span 2', minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}><span className="kick">{tradeLabel(p.trade)}</span><span className="muted num" style={{ fontSize: '12px' }}>{p.code}</span></div>
            <h1 style={{ fontSize: 'clamp(22px,2.6vw,30px)', color: '#1B1464', lineHeight: 1.35, overflowWrap: 'anywhere' }}>{p.title}</h1>
            <div>
              <span className="evlbl">{copy.pubBrief}</span>
              <p style={{ fontSize: '15px', color: '#3A385C', lineHeight: 1.85, whiteSpace: 'pre-line', overflowWrap: 'anywhere', marginTop: '6px' }}>{p.description}</p>
            </div>
            <table className="table pub-facts" style={{ width: '100%' }}><tbody>
              <tr><td className="muted">{copy.pubCity}</td><td>{label(vm.cities, p.city)}</td></tr>
              <tr><td className="muted">{copy.pubBudget}</td><td className="num">{budget(p)}</td></tr>
              <tr><td className="muted">{copy.pubTiming}</td><td>{vm.t.post?.[p.timing] || p.timing}</td></tr>
              <tr><td className="muted">{copy.pubPosted}</td><td className="num">{day(p.created_at)}</td></tr>
            </tbody></table>
            <span className="muted" style={{ fontSize: '12px' }}>{copy.pubNoOwner} {vm.t.browse.vatNote}</span>
          </div>
          {next(p)}
        </div>
      </section>
    );
  }

  const cities = (vm.cities as { id: string; label: string }[] | undefined) || [];
  const groups = (vm.tradeGroups as { label: string; items: { id: string; label: string }[] }[] | undefined) || [];
  const any = Boolean(filt.city || filt.trade || filt.min);
  return (
    <section className="wrap fade pub-browse" style={{ paddingBlock: '40px 80px' }}>
      <span className="kick">{copy.pubKicker}</span>
      <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464', marginTop: '10px' }}>{vm.t.browse.title}</h1>
      <p style={{ color: '#5B5A7A', maxWidth: '64ch', marginTop: '8px' }}>{copy.pubSub}</p>
      {viewer === 'admin' ? <p className="muted pub-admin-note" style={{ fontSize: '12.5px', marginTop: '6px' }}>{copy.pubAdminNote}</p> : null}
      {viewer !== 'admin' ? <div style={{ marginTop: '18px' }}>{next(null)}</div> : null}
      <div className="bfil">
        <span className="evlbl">{vm.t.bfilter.title}</span>
        <select className="input" name="city" value={filt.city} onChange={setF} style={{ maxWidth: '190px' }} aria-label={vm.t.bfilter.city}>
          <option value="">{vm.t.bfilter.anyCity}</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select className="input" name="trade" value={filt.trade} onChange={setF} style={{ maxWidth: '210px' }} aria-label={vm.t.bfilter.trade}>
          <option value="">{vm.t.bfilter.anyTrade}</option>
          {groups.map((g) => <optgroup key={g.label} label={g.label}>{g.items.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</optgroup>)}
        </select>
        <select className="input" name="min" value={filt.min} onChange={setF} style={{ maxWidth: '180px' }} aria-label={vm.t.bfilter.budget}>
          <option value="">{vm.t.bfilter.anyBudget}</option>
          {[20000, 50000, 100000].map((v) => <option key={v} value={v}>{vm.curPre}{fmt(v)}+{vm.curPost}</option>)}
        </select>
        {any ? <button className="clearall" onClick={() => { setFilt({ city: '', trade: '', min: '' }); setShown(PAGE); }}>{vm.t.bfilter.clear}</button> : null}
        <span className="muted num pub-count" style={{ marginInlineStart: 'auto', fontSize: '12.5px' }}>{rows ? copy.pubCount(filtered.length) : ''}</span>
      </div>
      {failed ? <p className="autherr" role="alert" style={{ marginTop: '20px' }}>{copy.err.network}</p>
        : !rows ? <p className="muted" style={{ marginTop: '20px' }}>{copy.pubLoading}</p>
        : !filtered.length ? <p className="muted" style={{ fontSize: '13.5px', marginTop: '20px' }}>{vm.t.bfilter.none}</p> : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(300px,100%),1fr))', gap: '20px', marginTop: '24px' }}>
        {filtered.slice(0, shown).map((p) => (
          <div className="card pub-card" key={p.code}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}><span className="kick">{tradeLabel(p.trade)}</span><span className="muted" style={{ fontSize: '12px' }}>{vm.t.browse.postedOn} {day(p.created_at)}</span></div>
            <h3 style={{ fontSize: '20px', color: '#1B1464', overflowWrap: 'anywhere' }}>{p.title}</h3>
            <p style={{ fontSize: '14px', color: '#5B5A7A', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1, overflowWrap: 'anywhere' }}>{p.description}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}><span className="muted num" style={{ fontSize: '13px' }}>{label(cities, p.city)} · {budget(p)}</span><span className="muted" style={{ fontSize: '11.5px', lineHeight: 1.6 }}>{vm.t.browse.vatNote}</span></div>
            <a className="btn btn-p btn-sm" data-route="listing" data-id={p.code} href={routeHref('listing', p.code)} onClick={vm.go}>{vm.t.browse.bid}</a>
          </div>
        ))}
      </div>
      {rows && filtered.length > shown ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '28px' }}>
          <button className="btn btn-s btn-sm" onClick={() => setShown(shown + PAGE)} style={{ padding: '8px 18px', fontSize: '12.5px', fontWeight: 500 }}>{vm.t.browse.loadMore} <span className="num" style={{ opacity: 0.55 }}>+{Math.min(PAGE, filtered.length - shown)}</span></button>
        </div>
      ) : null}
    </section>
  );
}
