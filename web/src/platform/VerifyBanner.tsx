/* (031) Explore first, verify before dealing: a signed-in account that cannot deal with the other side yet sees why, and
   the one thing to do about it — open the link in the "confirm your email" mail (or have it sent again), or complete the
   account in Settings. The database refuses the dealing itself (supabase/031); this only says so up front. */
import { useState } from 'react';
import { routeHref } from '../launch/urls';
import { useLaunchActions, type VM } from '../state/viewModel';
import { PLATFORM_COPY } from './copy';
import { canInteract, currentAccount, emailConfirmed, refreshAccount, requestEmailVerification } from './session';

export default function VerifyBanner({ vm }: { vm: VM }) {
  const lang = vm.dir === 'ltr' ? 'en' : 'ar';
  const copy = PLATFORM_COPY[lang];
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const { host } = useLaunchActions();
  const a = currentAccount();
  if (!a || canInteract(a)) return null;
  const confirmed = emailConfirmed(a);
  const email = a.profile.email || '';
  const text = !confirmed ? (a.profile.role === 'contractor' ? copy.verifyBarCo(email) : copy.verifyBarHo(email))
    : a.otpLive && !a.profile.mobile_verified_at ? copy.verifyBarOtp : copy.verifyBarProfile;

  const resend = async () => {
    setBusy(true); setNote('');
    const r = await requestEmailVerification();
    setBusy(false);
    if (r.ok === 'already') { await refreshAccount(); host.setLogicState({ siteNotice: copy.verifiedNow, siteNoticeTone: 'ok' }); return; }
    if (r.ok) { setNote(copy.verifySent); return; }
    setNote(r.error === 'rate' ? copy.verifyRate : copy.err[r.error]);
  };
  const check = async () => {
    setBusy(true); setNote('');
    await refreshAccount();
    setBusy(false);
    // confirmed on another device or tab: the bar goes, and the page says so
    if (emailConfirmed(currentAccount())) host.setLogicState({ siteNotice: copy.verifiedNow, siteNoticeTone: 'ok' });
    else setNote(copy.verifyNotYet);
  };

  return (
    <div className="verifybar" role="status" style={{ background: '#F3F2FA', borderBottom: '1px solid #E6E4F2', color: '#1B1464', fontSize: '13.5px', lineHeight: 1.7 }}>
      <div className="wrap" style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', paddingBlock: '10px' }}>
        <span style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', minWidth: 0, flex: '1 1 320px' }}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B84522" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', marginTop: '3px' }}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 7.5l7.4 5.2a2 2 0 0 0 2.2 0l7.4-5.2" /></svg>
          <span style={{ overflowWrap: 'anywhere' }}>{text}{note ? <><br /><strong style={{ fontWeight: 600 }}>{note}</strong></> : null}</span>
        </span>
        <span style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {!confirmed ? (<>
            <button type="button" className="btn btn-s btn-sm" disabled={busy} onClick={resend}>{copy.verifyResend}</button>
            <button type="button" className="btn btn-g btn-sm" disabled={busy} onClick={check}>{copy.verifyCheck}</button>
          </>) : (
            <a className="btn btn-s btn-sm" data-route="settings" href={routeHref('settings')} onClick={vm.go} style={{ textDecoration: 'none' }}>{copy.verifySettings}</a>
          )}
        </span>
      </div>
    </div>
  );
}
