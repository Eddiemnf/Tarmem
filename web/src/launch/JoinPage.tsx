/* The contractor application on the public site.

   The design's sign-up walks a contractor through an OTP and Nafath that do not
   exist yet, into a dashboard of invented projects. Until they do, "join as a
   contractor" is an application the Tarmem team reviews by hand: the details are
   written into a WhatsApp message the contractor sends themselves.

   Built from the design's own classes (.card, .input, .lbl, .tchip, .btn), with the trades the
   profile editor offers (CO_TRADES) first and every other trade one tap away, grouped as on the
   post-a-project form, so it reads as part of the same product. As on the homeowner's
   sign-up, the Terms of use and the Privacy policy must be accepted; and the page says
   what joining costs (nothing; 9% of the work a contractor wins, as on the pricing page). */

import { useState } from 'react';
import * as D from '../data/tarmem-data';
import { platformOn } from '../platform/client';
import ConfirmEmail from '../platform/ConfirmEmail';
import { PLATFORM_COPY } from '../platform/copy';
import OtpStep from '../platform/OtpStep';
import { LIMITS, needsMobileCode, saudiMobile, signUpContractor, skipMobileCode, validEmail } from '../platform/session';
import { useLaunchActions, type VM } from '../state/viewModel';
import { LAUNCH_COPY } from './copy';
import { routeHref } from './urls';

type Trade = { id: string; g: string; en: string; ar: string };
const ALL_TRADES = (D as unknown as { TRADES: Trade[] }).TRADES;
const GROUPS = (D as unknown as { TRADE_GROUPS: { id: string; en: string; ar: string }[] }).TRADE_GROUPS;
const COMMON = (D as unknown as { CO_TRADES?: string[] }).CO_TRADES || [];
/** The database keeps at most twelve trades per application (supabase/001). */
const MAX_TRADES = 12;

export default function JoinPage({ vm }: { vm: VM }) {
  const lang = vm.dir === 'ltr' ? 'en' : 'ar';
  const copy = LAUNCH_COPY[lang].join;
  const { send, host } = useLaunchActions();
  const cities = (vm.cities || []) as { id: string; label: string }[];
  const label = (t: Trade) => (lang === 'ar' ? t.ar : t.en);
  const trades = ALL_TRADES.map((t) => ({ id: t.id, label: label(t) }));
  const common = ALL_TRADES.filter((t) => COMMON.includes(t.id));
  const others = GROUPS.map((g) => ({ id: g.id, label: lang === 'ar' ? g.ar : g.en, items: ALL_TRADES.filter((t) => t.g === g.id && !COMMON.includes(t.id)) })).filter((g) => g.items.length);
  const [more, setMore] = useState(false);

  const real = PLATFORM_COPY[lang];
  const [form, setForm] = useState({ company: '', person: '', mobile: '', email: '', password: '', city: cities[0]?.id || '', cr: '', note: '' });
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [otp, setOtp] = useState(false);
  const [trap, setTrap] = useState('');
  const [agree, setAgree] = useState(false);
  const [confirmFor, setConfirmFor] = useState('');

  const set = (e: { currentTarget: { name: string; value: string } }) =>
    setForm({ ...form, [e.currentTarget.name]: e.currentTarget.value });
  const toggle = (id: string) => {
    if (picked.includes(id)) { setPicked(picked.filter((x) => x !== id)); if (error === copy.tradesMax) setError(''); return; }
    if (picked.length >= MAX_TRADES) { setError(copy.tradesMax); return; }
    setPicked([...picked, id]);
  };
  const chip = (t: Trade) => (
    <button key={t.id} type="button" className="tchip" aria-pressed={picked.includes(t.id) ? 'true' : 'false'} onClick={() => toggle(t.id)}>{label(t)}</button>
  );

  const submit = async () => {
    if (!form.company.trim() || !form.person.trim() || !picked.length) {
      setError(copy.error);
      return;
    }
    if (platformOn) {
      // the database's own limits (supabase/001), said per field before anything is sent
      if (form.company.trim().length < 2 || form.company.trim().length > LIMITS.company) return setError(real.err.company);
      if (form.person.trim().length < 2 || form.person.trim().length > LIMITS.person) return setError(real.err.person);
      // Saved with Tarmem directly, so the team needs a way to reach the applicant: a Saudi mobile number.
      const mobile = saudiMobile(form.mobile), email = form.email.trim();
      if (!mobile) return setError(real.err.mobile);
      // The application creates the contractor's account: once an admin verifies it, they sign in with this email and password.
      if (!validEmail(email)) return setError(real.coEmailNeeded);
      if (form.password.length < 8) return setError(real.err.password);
      if (form.cr.trim() && !/^[0-9]{5,15}$/.test(form.cr.trim())) return setError(real.err.cr);
      if (form.note.trim().length > LIMITS.appNote) return setError(real.err.noteLong);
      if (!agree) return setError(copy.agreeError);
      // a filled hidden field is a bot: it sees the dashboard's address, nothing is created
      if (trap.trim()) { (host.logic as unknown as { nav: (route: string) => void }).nav('cdash'); return undefined; }
      setBusy(true); setError('');
      const result = await signUpContractor({ company: form.company, person: form.person, mobile, email: email.toLowerCase(), password: form.password, city: form.city, trades: picked, crNumber: form.cr, note: form.note, lang });
      setBusy(false);
      if (!result.ok) return setError(real.err[result.error]);
      // with "Confirm email" on: the application is in, and the account opens from the link in the email (supabase/030 C, F)
      if (result.ok === 'confirm') { setConfirmFor(email.toLowerCase()); window.scrollTo({ top: 0 }); return undefined; }
      if (needsMobileCode()) { setOtp(true); return undefined; }
      (host.logic as unknown as { nav: (route: string) => void }).nav('cdash'); // their dashboard, which says the account is being verified
      return undefined;
    }
    if (!agree) { setError(copy.agreeError); return undefined; }
    const lines = [
      `${copy.company}: ${form.company.trim()}`,
      `${copy.person}: ${form.person.trim()}`,
      `${copy.city}: ${cities.find((c) => c.id === form.city)?.label || form.city}`,
      `${copy.trades}: ${trades.filter((t) => picked.includes(t.id)).map((t) => t.label).join(lang === 'ar' ? '، ' : ', ')}`,
      form.cr.trim() ? `${copy.cr}: ${form.cr.trim()}` : '',
    ].filter(Boolean);
    const note = form.note.trim();
    send({ kind: 'join', files: 0, text: [copy.heading, lines.join('\n'), note ? `${copy.note}:\n${note}` : ''].filter(Boolean).join('\n\n') });
  };

  if (confirmFor) return <ConfirmEmail lang={lang} email={confirmFor} note={real.confirmCo} />;
  if (otp) return <OtpStep lang={real === PLATFORM_COPY.en ? 'en' : 'ar'} onDone={() => { skipMobileCode(); (host.logic as unknown as { nav: (route: string) => void }).nav('cdash'); }} />;

  return (
    <section className="wrap fade g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '40px', paddingBlock: 'clamp(34px,4.2vw,60px) clamp(48px,6vw,88px)', alignItems: 'start' }}>
      <div>
        <span className="kick">{copy.kicker}</span>
        <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', marginTop: '10px' }}>{copy.title}</h1>
        <p style={{ color: '#5B5A7A', marginTop: '12px', fontSize: '15px', lineHeight: 1.8, maxWidth: '46ch' }}>{copy.sub}</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '22px 0 0', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', lineHeight: 1.7, color: '#3A385C' }}>
          {copy.points.map((point) => (
            <li key={point} style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
              <span aria-hidden="true" style={{ color: '#FF7722', fontWeight: 700 }}>✓</span><span>{point}</span>
            </li>
          ))}
        </ul>
        <div style={{ marginTop: '22px', padding: '14px 16px', borderRadius: '14px', background: '#F7F6FC', fontSize: '13.5px', lineHeight: 1.75, color: '#3A385C', maxWidth: '46ch' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: '#1B1464', marginBottom: '4px' }}>{copy.costTitle}</h2>
          <p>{copy.cost} <a className="lnk" data-route="pricing" href={routeHref('pricing')} onClick={vm.go} style={{ fontSize: '13.5px', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{copy.costLink}</a></p>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="hp-field" aria-hidden="true"><label htmlFor="join-website">Website</label><input id="join-website" className="input" name="website" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.currentTarget.value)} /></div>
        <div><label className="lbl" htmlFor="join-company">{copy.company}</label><input id="join-company" className="input" name="company" maxLength={LIMITS.company} value={form.company} onChange={set} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '12px' }}>
          <div><label className="lbl" htmlFor="join-person">{copy.person}</label><input id="join-person" className="input" name="person" maxLength={LIMITS.person} value={form.person} onChange={set} /></div>
          <div><label className="lbl" htmlFor="join-city">{copy.city}</label>
            <select id="join-city" className="input" name="city" value={form.city} onChange={set}>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </div>
        {platformOn ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '12px' }}>
            <div><label className="lbl" htmlFor="join-mobile">{real.mobile}</label><input id="join-mobile" className="input num" name="mobile" type="tel" dir="ltr" autoComplete="tel" inputMode="tel" maxLength={20} placeholder={real.mobilePh} value={form.mobile} onChange={set} /></div>
            <div><label className="lbl" htmlFor="join-email">{real.email}</label><input id="join-email" className="input" name="email" type="email" dir="ltr" autoComplete="email" value={form.email} onChange={set} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label className="lbl" htmlFor="join-password">{real.coPassword}</label><input id="join-password" className="input" name="password" type="password" dir="ltr" autoComplete="new-password" placeholder={real.passwordHint} value={form.password} onChange={set} /></div>
          </div>
        ) : null}
        <div>
          <span className="lbl">{copy.trades}</span>
          <div role="group" aria-label={copy.trades} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
            {common.map(chip)}
            {/* a trade picked from the other list stays in view when the list is closed again */}
            {!more ? ALL_TRADES.filter((t) => !COMMON.includes(t.id) && picked.includes(t.id)).map(chip) : null}
          </div>
          <button type="button" className="lnkbtn join-more" aria-expanded={more ? 'true' : 'false'} onClick={() => setMore(!more)} style={{ marginTop: '10px', fontSize: '13px' }}>{more ? copy.fewerTrades : copy.moreTrades}</button>
          {more ? others.map((g) => (
            <div key={g.id} role="group" aria-label={g.label} style={{ marginTop: '10px' }}>
              <span className="muted" style={{ fontSize: '12px', display: 'block', marginBottom: '6px' }}>{g.label}</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>{g.items.map(chip)}</div>
            </div>
          )) : null}
          <p className="muted" style={{ fontSize: '12px', marginTop: '6px' }}>{copy.tradesHint}</p>
        </div>
        <div><label className="lbl" htmlFor="join-cr">{copy.cr}</label><input id="join-cr" className="input" name="cr" inputMode="numeric" dir="ltr" maxLength={15} aria-invalid={error === real.err.cr ? 'true' : 'false'} value={form.cr} onChange={set} />
          <p className="muted" style={{ fontSize: '12px', marginTop: '6px' }}>{copy.crHint}</p></div>
        <div><label className="lbl" htmlFor="join-note">{copy.note}</label><textarea id="join-note" className="input" name="note" rows={4} maxLength={LIMITS.appNote} value={form.note} onChange={set} placeholder={copy.notePh} aria-describedby="join-note-count" />
          <span id="join-note-count" className="muted num charcount" aria-live="polite">{real.chars(form.note.length, LIMITS.appNote)}</span></div>
        <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13px', lineHeight: 1.7, color: '#3A385C' }}>
          <input id="join-agree" type="checkbox" required aria-invalid={error === copy.agreeError ? 'true' : 'false'} aria-describedby={error ? 'join-error' : undefined} checked={agree}
            onChange={(e) => { setAgree(e.currentTarget.checked); if (e.currentTarget.checked && error === copy.agreeError) setError(''); }} style={{ marginTop: '5px' }} />
          <span>{copy.agree} <a className="lnk" data-route="terms" href={routeHref('terms')} onClick={vm.go} style={{ fontSize: '13px', color: '#C53B1C' }}>{copy.terms}</a> {copy.and}{lang === 'ar' ? '' : ' '}<a className="lnk" data-route="privacy" href={routeHref('privacy')} onClick={vm.go} style={{ fontSize: '13px', color: '#C53B1C' }}>{copy.privacy}</a></span>
        </label>
        {error ? <p id="join-error" role="alert" style={{ color: '#C2381A', fontSize: '13px' }}>{error}</p> : null}
        <button className="btn btn-p" type="button" disabled={busy} onClick={submit}>{busy ? real.working : platformOn ? real.coCreate : copy.send}</button>
      </div>
    </section>
  );
}
