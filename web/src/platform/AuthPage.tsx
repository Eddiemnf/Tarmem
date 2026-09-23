/* Sign in and sign up on the public site.

   The design signs people in with a code sent to their mobile and then Nafath. Neither is
   connected yet, so until they are this page asks for an email and a password instead, in the
   design's own frame and classes. Only homeowners create accounts here; contractors apply
   (src/launch/JoinPage.tsx) and are verified by the team first. */

import { useState, type FormEvent } from 'react';
import { useLaunchActions, type VM } from '../state/viewModel';
import { PLATFORM_COPY } from './copy';
import { currentAccount, normalizeMobile, requestPasswordReset, signIn, signUp, validEmail, validMobile } from './session';

export default function AuthPage({ vm }: { vm: VM }) {
  const lang = vm.dir === 'ltr' ? 'en' : 'ar';
  const copy = PLATFORM_COPY[lang];
  const { host } = useLaunchActions();
  const cities = (vm.cities || []) as { id: string; label: string }[];
  const signup = Boolean(vm.auth?.isSignup);

  const [form, setForm] = useState({ email: '', password: '', name: '', mobile: '', city: cities[0]?.id || 'riyadh', agree: false });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  const set = (e: { currentTarget: { name: string; value: string } }) => setForm({ ...form, [e.currentTarget.name]: e.currentTarget.value });

  /** Signed in: publish the project they had filled in, or open their dashboard. */
  const enter = () => {
    const logic = host.logic as unknown as { publishPost: () => void; nav: (route: string) => void; state: { pendingPost?: boolean } };
    if (logic.state.pendingPost && currentAccount()) logic.publishPost();
    else logic.nav('hdash');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setNotice('');
    if (forgot) {
      const address = form.email.trim().toLowerCase();
      if (!validEmail(address)) return setError(copy.err.email);
      setBusy(true); setError('');
      const sent = await requestPasswordReset(address);
      setBusy(false);
      if (!sent.ok) return setError(copy.err[sent.error]);
      return setNotice(copy.forgotSent);
    }
    const email = form.email.trim().toLowerCase();
    if (!validEmail(email)) return setError(copy.err.email);
    if (form.password.length < 8) return setError(copy.err.password);
    const mobile = normalizeMobile(form.mobile);
    if (signup) {
      if (form.name.trim().length < 2) return setError(copy.err.name);
      if (!validMobile(mobile)) return setError(copy.err.mobile);
      if (!form.agree) return setError(copy.err.agree);
    }
    setBusy(true); setError('');
    const result = signup
      ? await signUp({ email, password: form.password, name: form.name.trim(), mobile, city: form.city, lang })
      : await signIn(email, form.password);
    setBusy(false);
    if (!result.ok) return setError(copy.err[result.error]);
    if (result.ok === 'confirm') { setForm({ ...form, password: '' }); return setNotice(copy.confirmSent); }
    enter();
  };

  if (forgot) {
    return (
      <section className="fade" style={{ display: 'flex', justifyContent: 'center', padding: '64px 24px 88px' }}>
        <div style={{ width: '100%', maxWidth: '432px', display: 'flex', flexDirection: 'column', gap: '26px' }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h1 style={{ fontSize: '27px', lineHeight: 1.3, color: '#1B1464', fontWeight: 600 }}>{copy.forgotTitle}</h1>
            <p style={{ color: '#7A7994', fontSize: '14px', lineHeight: 1.7, maxWidth: '38ch', margin: '0 auto' }}>{copy.forgotLede}</p>
          </div>
          <form className="authcard" onSubmit={submit} noValidate>
            <div className="authfield"><label className="authlbl" htmlFor="au-email">{copy.email}</label>
              <input id="au-email" className="authinput" name="email" type="email" dir="ltr" autoComplete="email" value={form.email} onChange={set} /></div>
            {error ? <p className="autherr" role="alert">{error}</p> : null}
            {notice ? <p role="status" style={{ fontSize: '13.5px', lineHeight: 1.7, color: '#1B1464', background: '#F7F6FC', border: '1px solid #E6E5F0', borderRadius: '12px', padding: '12px 14px' }}>{notice}</p> : null}
            <button className="btn btn-p" type="submit" disabled={busy} style={{ width: '100%', padding: '14px' }}>{busy ? copy.working : copy.forgotSend}</button>
          </form>
          {<p className="muted" style={{ textAlign: 'center', fontSize: '13px' }}><a className="lnk" onClick={() => { setForgot(false); setError(''); setNotice(''); }} style={{ color: '#FF5A3C', cursor: 'pointer' }}>{copy.backToSignIn}</a></p>}
        </div>
      </section>
    );
  }

  return (
    <section className="fade" style={{ display: 'flex', justifyContent: 'center', padding: '64px 24px 88px' }}>
      <div style={{ width: '100%', maxWidth: '432px', display: 'flex', flexDirection: 'column', gap: '26px' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h1 style={{ fontSize: '27px', lineHeight: 1.3, color: '#1B1464', fontWeight: 600 }}>{signup ? copy.signUpTitle : copy.signInTitle}</h1>
          <p style={{ color: '#7A7994', fontSize: '14px', lineHeight: 1.7, maxWidth: '38ch', margin: '0 auto' }}>{host.logic.state.pendingPost ? copy.pendingPost : signup ? copy.signUpLede : copy.signInLede}</p>
        </div>

        <div className="authseg">
          <label><input type="radio" name="mode" value="signin" checked={!signup} onChange={vm.setMode} /><span>{copy.signIn}</span></label>
          <label><input type="radio" name="mode" value="signup" checked={signup} onChange={vm.setMode} /><span>{copy.signUp}</span></label>
        </div>

        <form className="authcard" onSubmit={submit} noValidate>
          {signup ? (<>
            <div className="authfield"><label className="authlbl" htmlFor="au-name">{copy.name}</label>
              <input id="au-name" className="authinput" name="name" autoComplete="name" value={form.name} onChange={set} /></div>
            <div className="authfield"><label className="authlbl" htmlFor="au-mobile">{copy.mobile}</label>
              <input id="au-mobile" className="authinput num" name="mobile" type="tel" dir="ltr" autoComplete="tel" placeholder={copy.mobilePh} value={form.mobile} onChange={set} /></div>
            <div className="authfield"><label className="authlbl" htmlFor="au-city">{copy.city}</label>
              <select id="au-city" className="authinput" name="city" value={form.city} onChange={set}>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select></div>
          </>) : null}
          <div className="authfield"><label className="authlbl" htmlFor="au-email">{copy.email}</label>
            <input id="au-email" className="authinput" name="email" type="email" dir="ltr" autoComplete="email" value={form.email} onChange={set} /></div>
          <div className="authfield"><label className="authlbl" htmlFor="au-password">{copy.password}</label>
            <input id="au-password" className="authinput" name="password" type="password" dir="ltr" autoComplete={signup ? 'new-password' : 'current-password'} placeholder={signup ? copy.passwordHint : ''} value={form.password} onChange={set} /></div>
          {signup ? (
            <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13px', lineHeight: 1.7, color: '#3A385C' }}>
              <input type="checkbox" checked={form.agree} onChange={(e) => setForm({ ...form, agree: e.currentTarget.checked })} style={{ marginTop: '5px' }} />
              <span>{copy.agree} <a className="lnk" data-route="terms" onClick={vm.go} style={{ color: '#FF5A3C' }}>{copy.terms}</a> {copy.and} <a className="lnk" data-route="privacy" onClick={vm.go} style={{ color: '#FF5A3C' }}>{copy.privacy}</a></span>
            </label>
          ) : null}
          {error ? <p className="autherr" role="alert">{error}</p> : null}
          {notice ? <p role="status" style={{ fontSize: '13.5px', lineHeight: 1.7, color: '#1B1464', background: '#F7F6FC', border: '1px solid #E6E5F0', borderRadius: '12px', padding: '12px 14px' }}>{notice}</p> : null}
          <button className="btn btn-p" type="submit" disabled={busy} style={{ width: '100%', padding: '14px' }}>{busy ? copy.working : signup ? copy.signUp : copy.signIn}</button>
        </form>

        <p className="muted" style={{ textAlign: 'center', fontSize: '13px', lineHeight: 1.8 }}>
          {signup
            ? <>{copy.contractorNote} <a className="lnk" data-route="join" onClick={vm.go} style={{ color: '#FF5A3C' }}>{copy.contractorLink}</a>.</>
            : <>{copy.forgot} <a className="lnk" onClick={() => { setForgot(true); setError(''); setNotice(''); }} style={{ color: '#FF5A3C', cursor: 'pointer' }}>{copy.forgotLink}</a>.</>}
        </p>
      </div>
    </section>
  );
}
