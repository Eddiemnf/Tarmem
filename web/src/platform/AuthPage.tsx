/* Sign in and sign up on the public site.

   The design signs people in with a code sent to their mobile and then Nafath. Neither is
   connected yet, so until they are this page asks for an email and a password instead, in the
   design's own frame and classes. Only homeowners create accounts here; contractors apply
   (src/launch/JoinPage.tsx) and are verified by the team first.

   With "Confirm email" on (supabase/030 F) a new account opens from the link in its email: the
   page then says so and can send the link again, and a guest's project is kept on the device
   and posted at the first sign-in (src/platform/bind.ts). A link that no longer works lands
   here too, and asks for the address to send a new one. */

import { useEffect, useState, type FormEvent } from 'react';
import { landingAfterSignIn } from '../launch/guard';
import { routeHref } from '../launch/urls';
import { useLaunchActions, type VM } from '../state/viewModel';
import ConfirmEmail, { AuthFrame, Notice, ResendButton } from './ConfirmEmail';
import { PLATFORM_COPY } from './copy';
import OtpStep from './OtpStep';
import { clearLinkIssue, clearSessionEnded, currentAccount, linkIssue, needsMobileCode, requestPasswordReset, saudiMobile, saveDraft, sessionEnded, signIn, signUp, skipMobileCode, validEmail, LIMITS } from './session';

type Logic = { publishPost: () => void; state: Record<string, unknown> & { pendingPost?: boolean; post?: { f?: Record<string, unknown>; files?: string[] } } };

export default function AuthPage({ vm }: { vm: VM }) {
  const lang = vm.dir === 'ltr' ? 'en' : 'ar';
  const copy = PLATFORM_COPY[lang];
  const { host } = useLaunchActions();
  const cities = (vm.cities || []) as { id: string; label: string }[];
  const signup = Boolean(vm.auth?.isSignup);
  const logic = host.logic as unknown as Logic;

  const [form, setForm] = useState({ email: '', password: '', name: '', mobile: '', city: cities[0]?.id || 'riyadh', agree: false });
  const [error, setError] = useState('');
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [otp, setOtp] = useState(false);
  const [confirmFor, setConfirmFor] = useState('');
  // a link from an email that no longer works (supabase/030 F): what it was for, read once as the page opens
  const [expired, setExpired] = useState(() => linkIssue());
  const [ended] = useState(() => sessionEnded());
  useEffect(() => { if (expired) clearLinkIssue(); }, [expired]);

  const set = (e: { currentTarget: { name: string; value: string } }) => setForm({ ...form, [e.currentTarget.name]: e.currentTarget.value });
  const fail = (text: string, notConfirmed = false) => { setError(text); setUnconfirmed(notConfirmed); };

  /** Signed in: publish the project they had filled in, or open the page they asked for (the guard keeps it), else their home. */
  const enter = () => {
    clearSessionEnded();
    if (logic.state.pendingPost && currentAccount()) return logic.publishPost();
    if (host.logic.state.route === 'auth') host.setLogicState(landingAfterSignIn(host.logic.state));
    return undefined;
  };
  /** A guest's project waits on this device for the account's first sign-in (the text; photos cannot be kept). */
  const keepDraft = (email: string) => {
    if (!logic.state.pendingPost || !logic.state.post?.f) return;
    saveDraft(email, logic.state.post.f, (logic.state.post.files || []).length);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setNotice('');
    if (forgot) {
      const address = form.email.trim().toLowerCase();
      if (!validEmail(address)) return fail(copy.err.email);
      setBusy(true); fail('');
      const sent = await requestPasswordReset(address);
      setBusy(false);
      if (!sent.ok) return fail(copy.err[sent.error]);
      return setNotice(copy.forgotSent);
    }
    const email = form.email.trim().toLowerCase();
    if (!validEmail(email)) return fail(copy.err.email);
    if (form.password.length < 8) return fail(copy.err.password);
    const mobile = saudiMobile(form.mobile);
    if (signup) {
      if (form.name.trim().length < 2) return fail(copy.err.name);
      if (!mobile) return fail(copy.err.mobile);
      if (!form.agree) return fail(copy.err.agree);
    }
    setBusy(true); fail('');
    const result = signup
      ? await signUp({ email, password: form.password, name: form.name.trim().slice(0, LIMITS.name), mobile, city: form.city, lang })
      : await signIn(email, form.password);
    setBusy(false);
    if (!result.ok) {
      if (result.error === 'unconfirmed') keepDraft(email);
      return fail(copy.err[result.error], result.error === 'unconfirmed');
    }
    if (result.ok === 'confirm') {
      keepDraft(email);
      setForm({ ...form, password: '' });
      return setConfirmFor(email);
    }
    if (signup && needsMobileCode()) return setOtp(true);
    return enter();
  };

  if (otp) return <OtpStep lang={lang} onDone={() => { skipMobileCode(); enter(); }} />;

  if (confirmFor) {
    return <ConfirmEmail lang={lang} email={confirmFor} note={logic.state.pendingPost ? copy.confirmDraft : ''}
      onBack={() => { setConfirmFor(''); fail(''); host.setLogicState((st) => ({ auth: { ...st.auth, mode: 'signin', step: 1, error: '' } })); }} />;
  }

  if (expired) {
    const address = form.email.trim().toLowerCase();
    const sendReset = async () => {
      if (!validEmail(address)) return fail(copy.err.email);
      setBusy(true); fail('');
      const sent = await requestPasswordReset(address);
      setBusy(false);
      if (!sent.ok) return fail(copy.err[sent.error]);
      return setNotice(copy.forgotSent);
    };
    return (
      <AuthFrame className="link-expired" title={copy.linkExpiredTitle} lede={copy.linkExpiredLede}>
        <form className="authcard" onSubmit={(e) => { e.preventDefault(); if (expired.kind === 'reset') void sendReset(); }} noValidate>
          <div className="authfield"><label className="authlbl" htmlFor="au-email">{copy.email}</label>
            <input id="au-email" className="authinput" name="email" type="email" dir="ltr" autoComplete="email" value={form.email} onChange={set} /></div>
          {error ? <p className="autherr" role="alert">{error}</p> : null}
          {notice ? <Notice>{notice}</Notice> : null}
          {expired.kind === 'reset'
            ? <button className="btn btn-p" type="submit" disabled={busy} style={{ width: '100%', padding: '14px' }}>{busy ? copy.working : copy.linkSendReset}</button>
            : validEmail(address)
              ? <ResendButton lang={lang} email={address} label={copy.linkSendSignup} />
              : <button className="btn btn-p" type="button" onClick={() => fail(copy.err.email)} style={{ width: '100%', padding: '14px' }}>{copy.linkSendSignup}</button>}
          {expired.kind === null ? <p className="muted" style={{ textAlign: 'center', fontSize: '13px', margin: 0 }}>{copy.linkOr} <button type="button" className="lnkbtn" onClick={() => void sendReset()} style={{ fontSize: '13px' }}>{copy.linkSendReset}</button></p> : null}
        </form>
        <p className="muted" style={{ textAlign: 'center', fontSize: '13px' }}><button type="button" className="lnkbtn" onClick={() => { setExpired(null); fail(''); setNotice(''); }} style={{ fontSize: '13px' }}>{copy.backToSignIn}</button></p>
      </AuthFrame>
    );
  }

  if (forgot) {
    return (
      <AuthFrame title={copy.forgotTitle} lede={copy.forgotLede}>
        <form className="authcard" onSubmit={submit} noValidate>
          <div className="authfield"><label className="authlbl" htmlFor="au-email">{copy.email}</label>
            <input id="au-email" className="authinput" name="email" type="email" dir="ltr" autoComplete="email" value={form.email} onChange={set} /></div>
          {error ? <p className="autherr" role="alert">{error}</p> : null}
          {notice ? <Notice>{notice}</Notice> : null}
          <button className="btn btn-p" type="submit" disabled={busy} style={{ width: '100%', padding: '14px' }}>{busy ? copy.working : copy.forgotSend}</button>
        </form>
        <p className="muted" style={{ textAlign: 'center', fontSize: '13px' }}><a className="lnk" onClick={() => { setForgot(false); fail(''); setNotice(''); }} style={{ color: '#FF5A3C', cursor: 'pointer' }}>{copy.backToSignIn}</a></p>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title={signup ? copy.signUpTitle : copy.signInTitle} lede={host.logic.state.pendingPost ? copy.pendingPost : signup ? copy.signUpLede : copy.signInLede}>
      <div className="authseg">
        <label><input type="radio" name="mode" value="signin" checked={!signup} onChange={vm.setMode} /><span>{copy.signIn}</span></label>
        <label><input type="radio" name="mode" value="signup" checked={signup} onChange={vm.setMode} /><span>{copy.signUp}</span></label>
      </div>

      <form className="authcard" onSubmit={submit} noValidate>
        {ended && !signup ? <Notice>{copy.err.session}</Notice> : null}
        {signup ? (<>
          <div className="authfield"><label className="authlbl" htmlFor="au-name">{copy.name}</label>
            <input id="au-name" className="authinput" name="name" autoComplete="name" maxLength={LIMITS.name} value={form.name} onChange={set} /></div>
          <div className="authfield"><label className="authlbl" htmlFor="au-mobile">{copy.mobile}</label>
            <input id="au-mobile" className="authinput num" name="mobile" type="tel" dir="ltr" autoComplete="tel" inputMode="tel" maxLength={20} placeholder={copy.mobilePh} value={form.mobile} onChange={set} /></div>
          <div className="authfield"><label className="authlbl" htmlFor="au-city">{copy.city}</label>
            <select id="au-city" className="authinput" name="city" value={form.city} onChange={set}>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select></div>
        </>) : null}
        <div className="authfield"><label className="authlbl" htmlFor="au-email">{copy.email}</label>
          <input id="au-email" className="authinput" name="email" type="email" dir="ltr" autoComplete="email" maxLength={160} value={form.email} onChange={set} /></div>
        <div className="authfield"><label className="authlbl" htmlFor="au-password">{copy.password}</label>
          <input id="au-password" className="authinput" name="password" type="password" dir="ltr" autoComplete={signup ? 'new-password' : 'current-password'} placeholder={signup ? copy.passwordHint : ''} value={form.password} onChange={set} /></div>
        {signup ? (
          <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13px', lineHeight: 1.7, color: '#3A385C' }}>
            <input type="checkbox" checked={form.agree} onChange={(e) => setForm({ ...form, agree: e.currentTarget.checked })} style={{ marginTop: '5px' }} />
            <span>{copy.agree} <a className="lnk" data-route="terms" href={routeHref('terms')} onClick={vm.go} style={{ color: '#FF5A3C' }}>{copy.terms}</a> {copy.and}{lang === 'ar' ? '' : ' '}<a className="lnk" data-route="privacy" href={routeHref('privacy')} onClick={vm.go} style={{ color: '#FF5A3C' }}>{copy.privacy}</a></span>
          </label>
        ) : null}
        {error ? <p className="autherr" role="alert">{error}</p> : null}
        {unconfirmed && validEmail(form.email.trim().toLowerCase()) ? <ResendButton lang={lang} email={form.email.trim().toLowerCase()} /> : null}
        {notice ? <Notice>{notice}</Notice> : null}
        <button className="btn btn-p" type="submit" disabled={busy} style={{ width: '100%', padding: '14px' }}>{busy ? copy.working : signup ? copy.signUp : copy.signIn}</button>
      </form>

      <p className="muted" style={{ textAlign: 'center', fontSize: '13px', lineHeight: 1.8 }}>
        {signup
          ? <>{copy.contractorNote} <a className="lnk" data-route="join" href={routeHref('join')} onClick={vm.go} style={{ color: '#FF5A3C' }}>{copy.contractorLink}</a>.</>
          : <>{copy.forgot} <button type="button" className="lnkbtn" onClick={() => { setForgot(true); fail(''); setNotice(''); }} style={{ fontSize: '13px' }}>{copy.forgotLink}</button>.</>}
      </p>
    </AuthFrame>
  );
}
