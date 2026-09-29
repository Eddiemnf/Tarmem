/* A signed project while payment on the site is off (supabase/006, 030).

   The design moves an awarded project straight into funded stages. Until payment on the site is live the public site
   shows what is actually agreed instead: the accepted bid, read-only (AcceptedBid, on the Bids tab); the stages it plans,
   which start once the Tarmem team has arranged the first payment (PlannedStages, on the Stages tab); and, for both
   parties, a way to say the work is finished (ConfirmComplete, on the overview): the project completes once both have,
   which opens the design's own review form. Each renders nothing outside the public site (the demo stays identical to
   the design). */

import { useState } from 'react';
import type { LogicState } from '../state/designRuntime';
import { useLaunchActions, type VM } from '../state/viewModel';
import { platformOn } from './client';
import { PLATFORM_COPY } from './copy';
import { confirmComplete, currentAccount, type AgreementRow, type BidRow } from './session';

const fmt = (n: unknown) => Math.round(Number(n) || 0).toLocaleString('en-US');

/** The project on screen, its agreement (signed by both), and the bid it was signed on — or null. */
function useSigned(vm: VM): { project: LogicState; agreement: AgreementRow; bid: BidRow | null; lang: 'ar' | 'en' } | null {
  const { host } = useLaunchActions();
  const account = platformOn ? currentAccount() : null;
  if (!account || !vm.launch || account.profile.role === 'admin') return null;
  const state = host.logic.state;
  const project = (state.projects as LogicState[] | undefined)?.find((p) => p.id === state.curId);
  const agreement = project?.dbId ? account.agreements.find((a) => a.project_id === project.dbId && a.contractor_signed_at) : undefined;
  if (!project || !agreement) return null;
  return { project, agreement, bid: account.bids.find((b) => b.id === agreement.bid_id) || null, lang: vm.dir === 'ltr' ? 'en' : 'ar' };
}

const card = { marginTop: '20px', padding: '22px 24px', gap: '14px' } as const;
const row = { display: 'flex', justifyContent: 'space-between', gap: '14px', padding: '9px 0', borderBottom: '1px solid #EEEDF5', fontSize: '13.5px' } as const;

/** The accepted bid, as signed: the price and days agreed, and the terms the contractor wrote into their bid. */
export function AcceptedBid({ vm }: { vm: VM }) {
  const signed = useSigned(vm);
  if (!signed) return null;
  const { agreement, bid, lang, project } = signed;
  const copy = PLATFORM_COPY[lang], W = vm.t.ws, ar = lang === 'ar';
  const d = (bid?.details || {}) as Record<string, unknown>;
  const money = (n: unknown) => (ar ? `${fmt(n)} ريال` : `SAR ${fmt(n)}`);
  const split = Array.isArray(d.ms) ? (d.ms as unknown[]).map(Number) : [30, 40, 30];
  // a date the contractor picked is a calendar day, not a moment: shown as that day wherever the page is opened
  const when = (iso: unknown) => { const t = Date.parse(String(iso || '').slice(0, 10) + 'T00:00:00Z'); return Number.isFinite(t) ? new Date(t).toLocaleDateString(ar ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : ''; };
  const lines: [string, string][] = ([
    [W.price, money(agreement.amount)],
    [W.duration || W.days, `${agreement.days} ${vm.t.daysWord || (ar ? 'يوم' : 'days')}`],
    [W.fWarranty, String(d.warranty || '')],
    [W.fStart, when(d.start)],
    [W.fIncl, String(d.incl || '')],
    [W.fExcl, String(d.excl || '')],
    [W.fBrands, String(d.brands || '')],
    [W.scopeNote, String(bid?.note || '')],
    [copy.acceptedSplit, split.map((p, i) => `${W.ms?.[i]?.n || i + 1}: ${p}%`).join(' · ')],
  ] as [string, string][]).filter(([, v]) => v.trim());
  const changed = Number(project.amount) && Number(project.amount) !== Number(agreement.amount);
  return (
    <div className="card accepted-bid" style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span className="kick">{copy.acceptedTitle}</span>
        <span className="tag tag-g">✓ {currentAccount()?.profile.role === 'contractor' ? copy.acceptedChosenCo : copy.acceptedChosen}</span>
      </div>
      <div className="num">
        {lines.map(([k, v]) => <div key={k} style={row}><span className="muted" style={{ flex: 'none' }}>{k}</span><span style={{ fontWeight: 600, color: '#1B1464', textAlign: 'end', overflowWrap: 'anywhere', minWidth: 0 }}>{v}</span></div>)}
        {changed ? <div style={row}><span className="muted">{vm.t.ws.cr?.newTotal || (ar ? 'القيمة بعد التغييرات' : 'Value after changes')}</span><span style={{ fontWeight: 600, color: '#1B1464' }}>{money(project.amount)}</span></div> : null}
      </div>
      {d.vatReg || d.visit ? <p className="muted" style={{ fontSize: '12.5px', margin: 0 }}>{[d.vatReg ? copy.acceptedVat : '', d.visit ? copy.acceptedVisit : ''].filter(Boolean).join(' · ')}</p> : null}
    </div>
  );
}

/** The three stages the agreement plans, with their share of the value, waiting for the first payment. */
export function PlannedStages({ vm }: { vm: VM }) {
  const signed = useSigned(vm);
  if (!signed || currentAccount()?.paymentsLive) return null;
  const { agreement, bid, lang, project } = signed;
  const copy = PLATFORM_COPY[lang], W = vm.t.ws, ar = lang === 'ar';
  const d = (bid?.details || {}) as Record<string, unknown>;
  const split = Array.isArray(d.ms) && (d.ms as unknown[]).length === 3 ? (d.ms as unknown[]).map(Number) : [30, 40, 30];
  const value = Number(project.amount) || Number(agreement.amount) || 0;
  return (
    <div className="card planned-stages" style={{ ...card, marginTop: '16px' }}>
      <span className="kick">{copy.plannedTitle}</span>
      {split.map((share, i) => (
        <div key={i} className="num" style={{ display: 'grid', gridTemplateColumns: '32px minmax(0,1fr) auto', gap: '14px', alignItems: 'center', paddingBlock: '6px' }}>
          <span style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1.5px solid #B9B7D0', display: 'grid', placeItems: 'center', fontSize: '13px', fontWeight: 600, color: '#1B1464' }}>{i + 1}</span>
          <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600, color: '#1B1464' }}>{W.ms?.[i]?.n || `${ar ? 'المرحلة' : 'Stage'} ${i + 1}`}</div><div className="muted" style={{ fontSize: '12.5px' }}>{W.ms?.[i]?.d || ''}</div></div>
          <div style={{ textAlign: 'end' }}><div style={{ fontWeight: 600 }}>{ar ? `${fmt((value * share) / 100)} ريال` : `SAR ${fmt((value * share) / 100)}`}</div><span className="tag tag-w">{share}% · {copy.plannedWaiting}</span></div>
        </div>
      ))}
    </div>
  );
}

/** "Confirm the work is complete": either party of an active, signed project, while payment on the site is off. Completion
    is never one-sided (supabase/030 B): the project completes on the second confirmation, and until then the card says
    whose confirmation is awaited — and, to the party who has not confirmed yet, that the other one has. */
export function ConfirmComplete({ vm }: { vm: VM }) {
  const signed = useSigned(vm);
  const { host } = useLaunchActions();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const account = currentAccount();
  const role = account?.profile.role;
  if (!signed || account?.paymentsLive || (role !== 'homeowner' && role !== 'contractor') || signed.project.status !== 'active') return null;
  const copy = PLATFORM_COPY[signed.lang];
  const ho = role === 'homeowner';
  const mine = ho ? signed.agreement.homeowner_done_at : signed.agreement.contractor_done_at;
  const theirs = ho ? signed.agreement.contractor_done_at : signed.agreement.homeowner_done_at;
  const yes = async () => {
    if (busy) return;
    setBusy(true); setError('');
    const r = await confirmComplete(String(signed.project.dbId), ho ? 'homeowner' : 'contractor');
    setBusy(false);
    if (!r.ok) { setError(copy.err[r.error]); return; }
    setAsking(false);
    host.setLogicState({ siteNotice: r.ok === 'completed' ? (ho ? copy.completeDone : copy.completeDoneCo) : copy.completeSent, siteNoticeTone: 'ok', tab: 'overview' });
  };
  const note = mine ? (ho ? copy.completeWaitHo : copy.completeWaitCo) : theirs ? (ho ? copy.completeAskHo : copy.completeAskCo) : (ho ? copy.completeNote : copy.completeNoteCo);
  return (
    <div className="card confirm-complete" data-state={mine ? 'waiting' : theirs ? 'asked' : 'open'} style={{ marginBottom: '24px', padding: '20px 22px', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span className="kick">{ho ? copy.completeTitle : copy.completeTitleCo}</span>
        {mine ? <span className="tag tag-w">{ho ? copy.completeWaitTagHo : copy.completeWaitTagCo}</span> : theirs ? <span className="tag tag-a">{ho ? copy.completeTheirsHo : copy.completeTheirsCo}</span> : null}
      </div>
      <p style={{ fontSize: '14px', color: '#3A385C', margin: 0, maxWidth: '62ch', lineHeight: 1.7 }}>{note}</p>
      {mine ? null : asking ? (
        <div role="group" style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#FBFBFE', border: '1px solid #E6E5F0', borderRadius: '12px', padding: '14px 16px' }}>
          <b style={{ fontSize: '14px', color: '#1B1464' }}>{copy.completeQ}</b>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-p btn-sm" disabled={busy} onClick={yes}>{busy ? copy.working : copy.completeYes}</button>
            <button type="button" className="btn btn-s btn-sm" disabled={busy} onClick={() => { setAsking(false); setError(''); }}>{copy.completeNo}</button>
          </div>
        </div>
      ) : <div><button type="button" className="btn btn-p btn-sm complete-btn" onClick={() => setAsking(true)}>{copy.completeBtn}</button></div>}
      {error ? <p className="autherr" role="alert" style={{ margin: 0 }}>{error}</p> : null}
    </div>
  );
}
