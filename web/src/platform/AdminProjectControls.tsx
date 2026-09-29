/* The Tarmem team's controls on a project opened from the console (supabase/030 A).

   While payment on the site is off nothing moves a signed project to its end, and nothing takes down a project posted as
   spam: the team does both from here. An open project can be removed (withdrawn); a signed project in progress can be
   marked completed, or cancelled (withdrawn). Each asks first, and takes an optional note that stays in the team's own
   record (events) and is never emailed. The database emails the parties in fixed words. Renders nothing outside the
   public site, and nothing for anyone but an admin (the demo stays identical to the design). */

import { useState } from 'react';
import type { LogicState } from '../state/designRuntime';
import { useLaunchActions, type VM } from '../state/viewModel';
import { refreshAdminNow } from './admin';
import { platformOn } from './client';
import { PLATFORM_COPY } from './copy';
import { adminSetProjectStatus, currentAccount } from './session';

type Action = 'complete' | 'cancel' | 'remove';
const TARGET: Record<Action, 'completed' | 'withdrawn'> = { complete: 'completed', cancel: 'withdrawn', remove: 'withdrawn' };

export default function AdminProjectControls({ vm }: { vm: VM }) {
  const { host } = useLaunchActions();
  const [asking, setAsking] = useState<{ pid: string; action: Action } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ pid: string; text: string } | null>(null);
  const account = platformOn ? currentAccount() : null;
  if (!vm.launch || !account?.logicUser.admin) return null;
  const state = host.logic.state;
  const project = (state.projects as LogicState[] | undefined)?.find((p) => p.id === state.curId);
  if (!project?.dbId || project.withdrawn) return null;
  const actions: Action[] = project.status === 'open' ? ['remove'] : project.status === 'active' ? ['complete', 'cancel'] : [];
  if (!actions.length) return null;
  const copy = PLATFORM_COPY[vm.dir === 'ltr' ? 'en' : 'ar'];
  const ask = asking && asking.pid === project.id ? asking.action : null;
  const problem = error && error.pid === project.id ? error.text : '';
  const WORDS: Record<Action, { btn: string; q: string; yes: string; done: string }> = {
    complete: { btn: copy.adminComplete, q: copy.adminCompleteQ, yes: copy.adminCompleteYes, done: copy.adminCompleted },
    cancel: { btn: copy.adminCancel, q: copy.adminCancelQ, yes: copy.adminCancelYes, done: copy.adminCancelled },
    remove: { btn: copy.adminRemove, q: copy.adminRemoveQ, yes: copy.adminRemoveYes, done: copy.adminRemoved },
  };
  const close = () => { setAsking(null); setNote(''); setError(null); };
  const yes = async () => {
    if (!ask || busy) return;
    const pid = String(project.id);
    setBusy(true); setError(null);
    const r = await adminSetProjectStatus(String(project.dbId), TARGET[ask], note);
    if (!r.ok) { setBusy(false); setError({ pid, text: copy.err[r.error] }); return; }
    await refreshAdminNow();
    setBusy(false); close();
    host.setLogicState({ siteNotice: WORDS[ask].done, siteNoticeTone: 'ok' });
  };
  return (
    <div className="card admin-controls" style={{ flexBasis: '100%', marginTop: '18px', padding: '18px 22px', gap: '12px', borderColor: '#E0DEEE', background: '#FBFBFE' }}>
      <span className="kick">{copy.adminCtlTitle}</span>
      <p style={{ fontSize: '13.5px', color: '#3A385C', margin: 0, maxWidth: '70ch', lineHeight: 1.7 }}>{project.status === 'open' ? copy.adminCtlOpen : copy.adminCtlActive}</p>
      {ask ? (
        <div role="group" aria-label={WORDS[ask].btn} style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#fff', border: '1px solid #E6E5F0', borderRadius: '12px', padding: '14px 16px' }}>
          <b style={{ fontSize: '14px', color: '#1B1464', lineHeight: 1.6 }}>{WORDS[ask].q}</b>
          <label className="lbl" htmlFor="adm-note" style={{ margin: 0 }}>{copy.adminNoteLabel}</label>
          <input id="adm-note" className="input" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={copy.adminNotePh} />
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className={`btn btn-sm ${ask === 'complete' ? 'btn-p' : 'btn-s'} adm-yes`} style={ask === 'complete' ? undefined : { color: '#B3261E' }} disabled={busy} onClick={yes}>{busy ? copy.working : WORDS[ask].yes}</button>
            <button type="button" className="btn btn-s btn-sm" disabled={busy} onClick={close}>{copy.adminKeep}</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {actions.map((a) => (
            <button key={a} type="button" className={`btn btn-sm ${a === 'complete' ? 'btn-p' : 'btn-s'}`} data-act={a} onClick={() => { setAsking({ pid: String(project.id), action: a }); setNote(''); setError(null); }}>{WORDS[a].btn}</button>
          ))}
        </div>
      )}
      {problem ? <p className="autherr" role="alert" style={{ margin: 0 }}>{problem}</p> : null}
    </div>
  );
}
