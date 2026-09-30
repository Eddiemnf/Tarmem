/* The team's second step (supabase/032), in front of the admin console and the inbox.

   After the password, an admin types the six-digit code an authenticator app on their phone shows; until they have, the
   database gives the session no admin powers at all. The first time, the app is set up here: scan the QR code (or type
   the key), then type the code it shows. The key and the codes stay between this screen and the admin's phone. */

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { useLaunchActions, type VM } from '../state/viewModel';
import { PLATFORM_COPY } from './copy';
import { currentAccount, twoStepBegin, twoStepCheck, type TwoStepSetup } from './session';

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩', PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
/** Whatever was typed or pasted ("123 456", Arabic digits), as the six digits it holds. */
const digitsOf = (raw: string) => raw.replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d))).replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d))).replace(/\D/g, '').slice(0, 6);

const stepNo: CSSProperties = { flex: 'none', width: '24px', height: '24px', borderRadius: '50%', background: '#F3F2FA', color: '#1B1464', fontSize: '12.5px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
const quiet: CSSProperties = { background: 'none', border: 0, padding: 0, font: 'inherit', cursor: 'pointer' };

export default function AdminTwoStep({ vm }: { vm: VM }) {
  const lang = vm.dir === 'ltr' ? 'en' : 'ar';
  const copy = PLATFORM_COPY[lang];
  const { host } = useLaunchActions();
  const enrolled = Boolean(currentAccount()?.twoStep?.enrolled);
  const [setup, setSetup] = useState<TwoStepSetup | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  const begin = async () => {
    setBusy(true); setError('');
    const r = await twoStepBegin();
    setBusy(false);
    if (r.ok) setSetup(r.ok); else setError(copy.err[r.error]);
  };
  // the set-up starts as the page opens, once
  useEffect(() => { if (enrolled || started.current) return; started.current = true; void begin(); }, [enrolled]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || (!enrolled && !setup)) return;
    if (code.length !== 6) return setError(copy.err.tsWrong);
    setBusy(true); setError('');
    const r = await twoStepCheck(code, enrolled ? undefined : setup?.factorId);
    setBusy(false);
    // done: the account is read again and the console opens in place of this page
    if (r.ok) { if (!enrolled) host.setLogicState({ siteNotice: copy.tsDone, siteNoticeTone: 'ok' }); return; }
    setError(copy.err[r.error]); setCode('');
  };

  const copyKey = async () => {
    if (!setup) return;
    try { await navigator.clipboard.writeText(setup.secret); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { /* the key is on screen to type instead */ }
  };

  return (
    <section className="fade twostep" data-mode={enrolled ? 'code' : 'setup'} style={{ display: 'flex', justifyContent: 'center', padding: 'clamp(36px,6vw,64px) 20px 88px' }}>
      <div style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <span aria-hidden="true" style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#FFF1EC', color: '#FF5A3C', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>
          </span>
          <h1 style={{ fontSize: '26px', lineHeight: 1.3, color: '#1B1464', fontWeight: 600 }}>{enrolled ? copy.tsTitle : copy.tsSetupTitle}</h1>
          <p style={{ color: '#7A7994', fontSize: '14px', lineHeight: 1.7, maxWidth: '40ch', margin: '0 auto' }}>{enrolled ? copy.tsLede : copy.tsSetupLede}</p>
        </div>
        <form className="authcard" onSubmit={submit} noValidate style={{ padding: 'clamp(18px,5vw,28px)' }}>
          {enrolled ? null : (
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px', lineHeight: 1.7, color: '#3A385C' }}>
              <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}><span style={stepNo}>1</span><span style={{ minWidth: 0 }}>{copy.tsStep1}</span></li>
              <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={stepNo}>2</span>
                <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <span>{copy.tsStep2}</span>
                  <div style={{ alignSelf: 'center', width: '184px', height: '184px', padding: '4px', background: '#fff', border: '1px solid #E6E5F0', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {setup ? <img className="ts-qr" src={setup.qr} alt={copy.tsQrAlt} width={176} height={176} style={{ display: 'block', width: '176px', height: '176px' }} />
                      : <span className="muted" style={{ fontSize: '12.5px', textAlign: 'center', padding: '0 12px' }}>{busy ? copy.tsLoading : ''}</span>}
                  </div>
                  {setup ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span className="muted" style={{ fontSize: '12.5px' }}>{copy.tsNoScan}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', background: '#F7F6FC', border: '1px solid #E6E5F0', borderRadius: '10px', padding: '8px 10px' }}>
                        <code id="ts-secret" dir="ltr" style={{ flex: '1 1 150px', minWidth: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: '13px', letterSpacing: '.04em', color: '#1B1464', overflowWrap: 'anywhere' }}>
                          {setup.secret.replace(/(.{4})(?=.)/g, '$1 ')}
                        </code>
                        <button type="button" className="btn btn-s btn-sm" onClick={() => void copyKey()} style={{ flex: 'none' }}>{copied ? copy.tsCopied : copy.tsCopy}</button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </li>
              <li style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}><span style={stepNo}>3</span><span style={{ minWidth: 0 }}>{copy.tsStep3}</span></li>
            </ol>
          )}
          <div className="authfield"><label className="authlbl" htmlFor="ts-code">{copy.tsCode}</label>
            <input id="ts-code" className="authinput num" name="code" inputMode="numeric" autoComplete="one-time-code" dir="ltr" value={code}
              onChange={(e) => { setCode(digitsOf(e.currentTarget.value)); if (error) setError(''); }}
              style={{ textAlign: 'center', letterSpacing: '.35em', fontSize: '20px', fontWeight: 600 }} /></div>
          {error ? <p className="autherr" role="alert">{error}</p> : null}
          {!enrolled && !setup && !busy
            ? <button className="btn btn-s" type="button" onClick={() => void begin()} style={{ width: '100%', padding: '13px' }}>{copy.tsRetry}</button>
            : <button className="btn btn-p" type="submit" disabled={busy || (!enrolled && !setup)} style={{ width: '100%', padding: '14px' }}>{busy ? copy.working : enrolled ? copy.tsContinue : copy.tsTurnOn}</button>}
          <div style={{ display: 'flex', justifyContent: 'center', fontSize: '13px' }}>
            <button type="button" className="lnk ts-signout" onClick={vm.signOut} style={{ ...quiet, color: '#7A7994' }}>{copy.tsSignOut}</button>
          </div>
          {enrolled ? <p className="muted" style={{ fontSize: '12.5px', lineHeight: 1.7, margin: 0 }}>{copy.tsLost}</p> : null}
        </form>
      </div>
    </section>
  );
}
