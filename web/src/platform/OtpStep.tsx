/* Mobile verification by a WhatsApp code, right after an account is created (supabase/022).

   Shown only while the database has mobile verification switched on (set_otp) and the person's
   number is not verified yet. The code goes to the number they typed; a wrong or late code is
   refused by the database, and "later" lets them in without it. */

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PLATFORM_COPY } from './copy';
import { currentAccount, otpCheck, otpRequest, refreshAccount } from './session';

export default function OtpStep({ lang, onDone }: { lang: 'ar' | 'en'; onDone: () => void }) {
  const copy = PLATFORM_COPY[lang];
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [busy, setBusy] = useState(false);
  const mobile = currentAccount()?.profile.mobile || '';
  const asked = useRef(false);

  const send = async () => {
    setBusy(true); setError('');
    const r = await otpRequest();
    setBusy(false);
    if (r.ok) setSentTo(r.ok);
    else if (r.error === 'otpOff') onDone();
    else setError(copy.err[r.error || 'generic']);
  };
  useEffect(() => { if (asked.current) return; asked.current = true; void send(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const digits = code.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, '');
    if (digits.length !== 6) return setError(copy.err.otpWrong);
    setBusy(true); setError('');
    const ok = await otpCheck(digits);
    setBusy(false);
    if (!ok) return setError(copy.err.otpWrong);
    await refreshAccount();
    onDone();
  };

  return (
    <section className="fade otp-step" style={{ display: 'flex', justifyContent: 'center', padding: '64px 24px 88px' }}>
      <div style={{ width: '100%', maxWidth: '432px', display: 'flex', flexDirection: 'column', gap: '26px' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h1 style={{ fontSize: '27px', lineHeight: 1.3, color: '#1B1464', fontWeight: 600 }}>{copy.otpTitle}</h1>
          <p style={{ color: '#7A7994', fontSize: '14px', lineHeight: 1.7, maxWidth: '38ch', margin: '0 auto' }}>{copy.otpLede} <span className="num" dir="ltr">{mobile}</span></p>
        </div>
        <form className="authcard" onSubmit={submit} noValidate>
          <div className="authfield"><label className="authlbl" htmlFor="otp-code">{copy.otpCode}</label>
            <input id="otp-code" className="authinput num" name="code" inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={6} value={code} onChange={(e) => setCode(e.currentTarget.value)} /></div>
          {sentTo ? <p role="status" className="muted" style={{ fontSize: '13px', margin: 0 }}>{copy.otpSent}</p> : null}
          {error ? <p className="autherr" role="alert">{error}</p> : null}
          <button className="btn btn-p" type="submit" disabled={busy} style={{ width: '100%', padding: '14px' }}>{busy ? copy.working : copy.otpVerify}</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13px' }}>
            <a className="lnk" onClick={() => { if (!busy) void send(); }} style={{ color: '#FF5A3C', cursor: 'pointer' }}>{copy.otpResend}</a>
            <a className="lnk otp-later" onClick={onDone} style={{ color: '#7A7994', cursor: 'pointer' }}>{copy.otpLater}</a>
          </div>
        </form>
      </div>
    </section>
  );
}
