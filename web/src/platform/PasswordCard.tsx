/* "Change password", on the settings page, under the contact card. The account signs in with an email and a password
   (src/platform/AuthPage.tsx); this changes the password in place, keeps this device signed in and signs the others out
   (session.ts, setNewPassword). Renders nothing outside the public site, so the demo stays identical to the design. */

import { useState, type FormEvent } from 'react';
import { type VM } from '../state/viewModel';
import { platformOn } from './client';
import { Notice } from './ConfirmEmail';
import { PLATFORM_COPY } from './copy';
import { currentAccount, setNewPassword } from './session';

export default function PasswordCard({ vm }: { vm: VM }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ password: '', again: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [busy, setBusy] = useState(false);
  if (!platformOn || !vm.launch || !currentAccount()) return null;
  const copy = PLATFORM_COPY[vm.dir === 'ltr' ? 'en' : 'ar'];
  const set = (e: { currentTarget: { name: string; value: string } }) => setForm({ ...form, [e.currentTarget.name]: e.currentTarget.value });
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (form.password.length < 8) return setError(copy.err.password);
    if (form.password !== form.again) return setError(copy.err.passwordMatch);
    setBusy(true); setError('');
    const r = await setNewPassword(form.password);
    setBusy(false);
    if (!r.ok) return setError(copy.err[r.error]);
    setForm({ password: '', again: '' }); setOpen(false); setDone(copy.pwSaved);
    return undefined;
  };
  return (
    <div className="card password-card" style={{ marginTop: '16px', padding: '26px', gap: '14px' }}>
      <span className="kick">{copy.pwTitle}</span>
      <p className="muted" style={{ fontSize: '12.5px', lineHeight: 1.7, margin: 0 }}>{copy.pwNote}</p>
      {open ? (
        <form onSubmit={save} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div><label className="lbl" htmlFor="pw-new">{copy.password}</label>
            <input id="pw-new" className="input" name="password" type="password" dir="ltr" autoComplete="new-password" placeholder={copy.passwordHint} value={form.password} onChange={set} /></div>
          <div><label className="lbl" htmlFor="pw-again">{copy.newPassAgain}</label>
            <input id="pw-again" className="input" name="again" type="password" dir="ltr" autoComplete="new-password" value={form.again} onChange={set} /></div>
          {error ? <p className="autherr" role="alert" style={{ margin: 0 }}>{error}</p> : null}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-p btn-sm" type="submit" disabled={busy}>{busy ? copy.working : copy.pwSave}</button>
            <button className="btn btn-s btn-sm" type="button" disabled={busy} onClick={() => { setOpen(false); setError(''); setForm({ password: '', again: '' }); }}>{copy.pwCancel}</button>
          </div>
        </form>
      ) : <div><button type="button" className="btn btn-s btn-sm pw-open" onClick={() => { setOpen(true); setDone(''); }}>{copy.pwChange}</button></div>}
      {done ? <Notice>{done}</Notice> : null}
    </div>
  );
}
