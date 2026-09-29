/* "Check your email to activate your account" (supabase/030 F).

   With "Confirm email" on, a new account — a homeowner's from the sign-up form, a contractor's from /join — has no
   session until its email link is opened. This panel says so, names the address, and sends the link again on request.
   Used by src/platform/AuthPage.tsx and src/launch/JoinPage.tsx, in the design's own sign-in frame and classes. */

import { useState, type ReactNode } from 'react';
import { PLATFORM_COPY } from './copy';
import { resendConfirmation } from './session';

export function AuthFrame({ title, lede, children, className = '' }: { title: string; lede: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`fade ${className}`.trim()} style={{ display: 'flex', justifyContent: 'center', padding: '64px 24px 88px' }}>
      <div style={{ width: '100%', maxWidth: '432px', display: 'flex', flexDirection: 'column', gap: '26px' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h1 style={{ fontSize: '27px', lineHeight: 1.3, color: '#1B1464', fontWeight: 600 }}>{title}</h1>
          <p style={{ color: '#6B6986', fontSize: '14px', lineHeight: 1.7, maxWidth: '40ch', margin: '0 auto', overflowWrap: 'anywhere' }}>{lede}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

/** A sentence in the sign-in card that is news, not an error. */
export const Notice = ({ children }: { children: ReactNode }) => (
  <p role="status" className="authnote" style={{ fontSize: '13.5px', lineHeight: 1.7, color: '#1B1464', background: '#F7F6FC', border: '1px solid #E6E5F0', borderRadius: '12px', padding: '12px 14px', margin: 0 }}>{children}</p>
);

/** A "send the link again" button, with its own outcome underneath. */
export function ResendButton({ lang, email, label }: { lang: 'ar' | 'en'; email: string; label?: string }) {
  const copy = PLATFORM_COPY[lang];
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<{ ok: boolean; text: string } | null>(null);
  const resend = async () => {
    if (busy || !email) return;
    setBusy(true); setSaid(null);
    const r = await resendConfirmation(email);
    setBusy(false);
    setSaid(r.ok ? { ok: true, text: copy.resent } : { ok: false, text: copy.err[r.error] });
  };
  return (
    <>
      <button type="button" className="btn btn-s resend-link" disabled={busy} onClick={resend} style={{ width: '100%', padding: '12px' }}>{busy ? copy.working : label || copy.resend}</button>
      {said ? (said.ok ? <Notice>{said.text}</Notice> : <p className="autherr" role="alert">{said.text}</p>) : null}
    </>
  );
}

export default function ConfirmEmail({ lang, email, note, onBack }: { lang: 'ar' | 'en'; email: string; note?: string; onBack?: () => void }) {
  const copy = PLATFORM_COPY[lang];
  return (
    <AuthFrame className="confirm-email" title={copy.confirmTitle} lede={<span dir="auto">{copy.confirmLede(email)}</span>}>
      <div className="authcard">
        {note ? <Notice>{note}</Notice> : null}
        <ResendButton lang={lang} email={email} />
      </div>
      {onBack ? <p className="muted" style={{ textAlign: 'center', fontSize: '13px' }}><button type="button" className="lnkbtn" onClick={onBack} style={{ fontSize: '13px' }}>{copy.backToSignIn}</button></p> : null}
    </AuthFrame>
  );
}
