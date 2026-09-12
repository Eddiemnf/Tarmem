/* A password screen in front of the whole site while it is a private preview.

   The password is injected at build time from the SITE_PASSWORD environment
   variable (see vite.config.ts). With it unset the gate disappears entirely and
   the site is public, so nothing here can lock anyone out by accident.

   This is a door, not a wall: the password ends up in the downloaded bundle, so
   someone technical could find it. It is meant to keep casual visitors and
   search engines out of a prototype full of invented data — not to protect
   anything that would matter if a stranger saw it. */

import { useState, type FormEvent, type ReactNode } from 'react';

const PASSWORD = __SITE_PASSWORD__;
const UNLOCKED_KEY = 'tarmem-preview-unlocked';

/** Remember the unlock so a refresh doesn't ask again. Storage can throw in
    private windows, so every access is guarded. */
function readUnlocked(): boolean {
  try {
    return localStorage.getItem(UNLOCKED_KEY) === PASSWORD;
  } catch {
    return false;
  }
}

export default function Gate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(readUnlocked);
  const [entry, setEntry] = useState('');
  const [wrong, setWrong] = useState(false);

  // No password configured — the site is simply public.
  if (!PASSWORD) return <>{children}</>;
  if (unlocked) return <>{children}</>;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (entry !== PASSWORD) {
      setWrong(true);
      setEntry('');
      return;
    }
    try {
      localStorage.setItem(UNLOCKED_KEY, PASSWORD);
    } catch {
      // Private window — they'll be asked again next visit, which is fine.
    }
    setUnlocked(true);
  };

  return (
    <div className="gate">
      <form className="gate-card" onSubmit={submit}>
        <img className="gate-logo" src="assets/tarmem-logo.png" alt="ترميم" />
        <p className="gate-note">هذا الموقع قيد المعاينة الخاصة.</p>

        <label className="gate-label" htmlFor="gate-input">كلمة المرور</label>
        <input
          id="gate-input"
          className="gate-input"
          type="password"
          value={entry}
          autoFocus
          autoComplete="current-password"
          onChange={(e) => { setEntry(e.target.value); setWrong(false); }}
          aria-invalid={wrong}
          aria-describedby={wrong ? 'gate-error' : undefined}
        />

        {wrong && <p className="gate-error" id="gate-error" role="alert">كلمة المرور غير صحيحة.</p>}

        <button className="gate-btn" type="submit" disabled={!entry}>دخول</button>
      </form>
    </div>
  );
}
