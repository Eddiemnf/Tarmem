/* Choosing a new password, on its own page (/reset-password).

   The email's link lands on /signin with a recovery session; the guard (src/launch/guard.ts)
   brings the person here before anything else. Saving signs them in; the database then emails
   "your password was changed" (supabase/021). Without a recovery session — an old link, or the
   address typed by hand — the page says the link has expired and points to sign-in. */

import { useState, type FormEvent, type ReactNode } from 'react';
import { useLaunchActions, type VM } from '../state/viewModel';
import { PLATFORM_COPY } from './copy';
import { isRecovering, setNewPassword } from './session';

export default function ResetPage({ vm }: { vm: VM }) {
  const lang = vm.dir === 'ltr' ? 'en' : 'ar';
  const copy = PLATFORM_COPY[lang];
  const { host } = useLaunchActions();
  const [form, setForm] = useState({ password: '', again: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const recovering = isRecovering();
  const go = (route: string) => (host.logic as unknown as { nav: (route: string) => void }).nav(route);
  const set = (e: { currentTarget: { name: string; value: string } }) => setForm({ ...form, [e.currentTarget.name]: e.currentTarget.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (form.password.length < 8) return setError(copy.err.password);
    if (form.password !== form.again) return setError(copy.err.passwordMatch);
    setBusy(true); setError('');
    const saved = await setNewPassword(form.password);
    setBusy(false);
    if (!saved.ok) return setError(copy.err[saved.error]);
    window.history.replaceState(null, '', window.location.pathname);
    setDone(true);
  };

  const frame = (title: string, lede: string, body: ReactNode) => (
    <section className="fade reset-page" style={{ display: 'flex', justifyContent: 'center', padding: '64px 24px 88px' }}>
      <div style={{ width: '100%', maxWidth: '432px', display: 'flex', flexDirection: 'column', gap: '26px' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h1 style={{ fontSize: '27px', lineHeight: 1.3, color: '#1B1464', fontWeight: 600 }}>{title}</h1>
          <p style={{ color: '#7A7994', fontSize: '14px', lineHeight: 1.7, maxWidth: '38ch', margin: '0 auto' }}>{lede}</p>
        </div>
        {body}
      </div>
    </section>
  );

  if (done) return frame(copy.resetDoneTitle, copy.resetDoneLede,
    <div className="authcard" role="status"><button className="btn btn-p" type="button" onClick={() => go('hdash')} style={{ width: '100%', padding: '14px' }}>{copy.resetDoneGo}</button></div>);
  if (!recovering) return frame(copy.resetExpiredTitle, copy.resetExpiredLede,
    <div className="authcard"><button className="btn btn-p" type="button" onClick={() => go('auth')} style={{ width: '100%', padding: '14px' }}>{copy.resetExpiredGo}</button></div>);
  return frame(copy.newPassTitle, copy.newPassLede,
    <form className="authcard" onSubmit={submit} noValidate>
      <div className="authfield"><label className="authlbl" htmlFor="rp-password">{copy.password}</label>
        <input id="rp-password" className="authinput" name="password" type="password" dir="ltr" autoComplete="new-password" placeholder={copy.passwordHint} value={form.password} onChange={set} /></div>
      <div className="authfield"><label className="authlbl" htmlFor="rp-again">{copy.newPassAgain}</label>
        <input id="rp-again" className="authinput" name="again" type="password" dir="ltr" autoComplete="new-password" value={form.again} onChange={set} /></div>
      {error ? <p className="autherr" role="alert">{error}</p> : null}
      <button className="btn btn-p" type="submit" disabled={busy} style={{ width: '100%', padding: '14px' }}>{busy ? copy.working : copy.newPassSave}</button>
    </form>);
}
