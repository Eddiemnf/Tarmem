/* The contractor application on the public site.

   The design's sign-up walks a contractor through an OTP and Nafath that do not
   exist yet, into a dashboard of invented projects. Until they do, "join as a
   contractor" is an application the Tarmem team reviews by hand (and, with accounts
   on, the contractor's account is made at the same time).

   Three short steps in one card — the business, the account, the trades — marked as on the
   post-a-project form, so it reads as part of the same product and never shows a wall of
   fields. The trades come in the post form's groups, folded until opened, with what is
   chosen shown above them. As on the homeowner's sign-up, the Terms of use and the Privacy
   policy must be accepted; and the page says what joining costs (nothing; 9% of the work a
   contractor wins, as on the pricing page). */

import { useRef, useState } from 'react';
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
/** The database keeps at most twelve trades per application (supabase/001). */
const MAX_TRADES = 12;
const STEPS = 3;

export default function JoinPage({ vm }: { vm: VM }) {
  const lang = vm.dir === 'ltr' ? 'en' : 'ar';
  const copy = LAUNCH_COPY[lang].join;
  const { send, host } = useLaunchActions();
  const cities = (vm.cities || []) as { id: string; label: string }[];
  const label = (t: Trade) => (lang === 'ar' ? t.ar : t.en);
  const trades = ALL_TRADES.map((t) => ({ id: t.id, label: label(t) }));
  const groups = GROUPS.map((g) => ({ id: g.id, label: lang === 'ar' ? g.ar : g.en, items: ALL_TRADES.filter((t) => t.g === g.id) })).filter((g) => g.items.length);

  const real = PLATFORM_COPY[lang];
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ company: '', person: '', mobile: '', email: '', password: '', city: cities[0]?.id || '', cr: '', note: '' });
  const [picked, setPicked] = useState<string[]>([]);
  const [open, setOpen] = useState<string>('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [otp, setOtp] = useState(false);
  const [trap, setTrap] = useState('');
  const [agree, setAgree] = useState(false);
  const [confirmFor, setConfirmFor] = useState('');
  const card = useRef<HTMLDivElement>(null);

  const set = (e: { currentTarget: { name: string; value: string } }) =>
    setForm({ ...form, [e.currentTarget.name]: e.currentTarget.value });
  const toggle = (id: string) => {
    if (picked.includes(id)) { setPicked(picked.filter((x) => x !== id)); if (error === copy.tradesMax) setError(''); return; }
    if (picked.length >= MAX_TRADES) { setError(copy.tradesMax); return; }
    setPicked([...picked, id]); if (error === copy.error) setError('');
  };
  const chip = (t: Trade) => (
    <button key={t.id} type="button" className="tchip" aria-pressed={picked.includes(t.id) ? 'true' : 'false'} onClick={() => toggle(t.id)}>{label(t)}</button>
  );

  /** What is wrong on one step, in the site's words (the database's own limits, supabase/001), or '' when it is complete. */
  const problemOn = (n: number): string => {
    if (n === 1) {
      const company = form.company.trim();
      if (!company) return copy.error;
      if (platformOn && (company.length < 2 || company.length > LIMITS.company)) return real.err.company;
      if (form.cr.trim() && !/^[0-9]{5,15}$/.test(form.cr.trim())) return real.err.cr;
      return '';
    }
    if (n === 2) {
      const person = form.person.trim();
      if (!person) return copy.error;
      if (!platformOn) return '';
      if (person.length < 2 || person.length > LIMITS.person) return real.err.person;
      // Saved with Tarmem directly, so the team needs a way to reach the applicant: a Saudi mobile number.
      if (!saudiMobile(form.mobile)) return real.err.mobile;
      // The application creates the contractor's account: once an admin verifies it, they sign in with this email and password.
      if (!validEmail(form.email.trim())) return real.coEmailNeeded;
      if (form.password.length < 8) return real.err.password;
      return '';
    }
    if (!picked.length) return copy.error;
    if (form.note.trim().length > LIMITS.appNote) return real.err.noteLong;
    if (!agree) return copy.agreeError;
    return '';
  };
  const go = (n: number) => {
    setStep(n); setError('');
    const top = card.current ? card.current.getBoundingClientRect().top + window.scrollY - 96 : 0;
    if (top < window.scrollY) window.scrollTo({ top, behavior: 'smooth' });
  };
  const next = () => { const p = problemOn(step); if (p) return setError(p); go(step + 1); return undefined; };

  const submit = async () => {
    // every step again: a later step can never send what an earlier one would refuse
    for (let n = 1; n <= STEPS; n += 1) { const p = problemOn(n); if (p) { if (n !== step) setStep(n); return setError(p); } }
    if (platformOn) {
      // a filled hidden field is a bot: it sees the dashboard's address, nothing is created
      if (trap.trim()) { (host.logic as unknown as { nav: (route: string) => void }).nav('cdash'); return undefined; }
      const mobile = saudiMobile(form.mobile) as string, email = form.email.trim().toLowerCase();
      setBusy(true); setError('');
      const result = await signUpContractor({ company: form.company, person: form.person, mobile, email, password: form.password, city: form.city, trades: picked, crNumber: form.cr, note: form.note, lang });
      setBusy(false);
      if (!result.ok) return setError(real.err[result.error]);
      // with "Confirm email" on: the application is in, and the account opens from the link in the email (supabase/030 C, F)
      if (result.ok === 'confirm') { setConfirmFor(email); window.scrollTo({ top: 0 }); return undefined; }
      if (needsMobileCode()) { setOtp(true); return undefined; }
      (host.logic as unknown as { nav: (route: string) => void }).nav('cdash'); // their dashboard, which says the account is being verified
      return undefined;
    }
    const lines = [
      `${copy.company}: ${form.company.trim()}`,
      `${copy.person}: ${form.person.trim()}`,
      `${copy.city}: ${cities.find((c) => c.id === form.city)?.label || form.city}`,
      `${copy.trades}: ${trades.filter((t) => picked.includes(t.id)).map((t) => t.label).join(lang === 'ar' ? '، ' : ', ')}`,
      form.cr.trim() ? `${copy.cr}: ${form.cr.trim()}` : '',
    ].filter(Boolean);
    const note = form.note.trim();
    send({ kind: 'join', files: 0, text: [copy.heading, lines.join('\n'), note ? `${copy.note}:\n${note}` : ''].filter(Boolean).join('\n\n') });
    return undefined;
  };

  if (confirmFor) return <ConfirmEmail lang={lang} email={confirmFor} note={real.confirmCo} />;
  if (otp) return <OtpStep lang={real === PLATFORM_COPY.en ? 'en' : 'ar'} onDone={() => { skipMobileCode(); (host.logic as unknown as { nav: (route: string) => void }).nav('cdash'); }} />;

  // the post form's step marks: the current step ringed in orange, done steps in a warm grey
  const mark = (n: number) => {
    const cur = n === step, done = n < step;
    return (
      <li key={n} aria-current={cur ? 'step' : undefined} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: cur ? '#1B1464' : done ? '#9A5B45' : '#6B6986', fontWeight: cur ? 600 : 500 }}>
        <span className="num" style={{ width: '26px', height: '26px', borderRadius: '50%', border: `1.5px solid ${cur ? '#FFD9CB' : done ? '#EAD9D2' : '#E2E0EE'}`, background: cur ? '#FFF1EC' : 'transparent', color: cur ? '#B84522' : 'currentColor', display: 'grid', placeItems: 'center', fontSize: '12px', flex: 'none' }}>
          {done ? '✓' : n}
        </span>{copy.steps[n - 1]}
      </li>
    );
  };
  const selectLook = { appearance: 'none' as const, WebkitAppearance: 'none' as const, backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236B6986\' stroke-width=\'2.4\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: lang === 'ar' ? 'left 14px center' : 'right 14px center', paddingInlineEnd: '38px' };
  const errorLine = error ? <p id="join-error" role="alert" style={{ color: '#B3261E', fontSize: '13px', margin: 0 }}>{error}</p> : null;

  return (
    <section className="wrap fade g2 join-page" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,5fr) minmax(0,7fr)', gap: 'clamp(28px,4vw,56px)', paddingBlock: 'clamp(34px,4.2vw,60px) clamp(48px,6vw,88px)', alignItems: 'start' }}>
      <div className="join-intro">
        <span className="kick">{copy.kicker}</span>
        <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', marginTop: '10px' }}>{copy.title}</h1>
        <p style={{ color: '#5B5A7A', marginTop: '12px', fontSize: '15px', lineHeight: 1.8, maxWidth: '44ch' }}>{copy.sub}</p>
        <ul className="join-points" style={{ listStyle: 'none', padding: 0, margin: '22px 0 0', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px', lineHeight: 1.7, color: '#3A385C' }}>
          {copy.points.map((point) => (
            <li key={point} style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
              <span aria-hidden="true" style={{ color: '#FF7722', fontWeight: 700 }}>✓</span><span>{point}</span>
            </li>
          ))}
        </ul>
        <p style={{ marginTop: '20px', fontSize: '13.5px', lineHeight: 1.75, color: '#3A385C', maxWidth: '44ch' }}>
          <strong style={{ color: '#1B1464', fontWeight: 600 }}>{copy.costTitle}: </strong>{copy.costShort}{' '}
          <a className="lnk" data-route="pricing" href={routeHref('pricing')} onClick={vm.go} style={{ fontSize: '13.5px', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{copy.costLink}</a>
        </p>
      </div>

      <div ref={card} className="card join-card" style={{ display: 'flex', flexDirection: 'column', gap: '18px', padding: 'clamp(20px,3vw,32px)' }}>
        <div className="hp-field" aria-hidden="true"><label htmlFor="join-website">Website</label><input id="join-website" className="input" name="website" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.currentTarget.value)} /></div>
        <ol aria-label={copy.stepOf(step, STEPS)} style={{ display: 'flex', gap: '18px', listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', flexWrap: 'wrap' }}>
          {[1, 2, 3].map(mark)}
        </ol>
        <h2 style={{ fontSize: '19px', color: '#1B1464', margin: 0 }}>{copy.stepTitles[step - 1]}</h2>

        {step === 1 ? (<>
          <div><label className="lbl" htmlFor="join-company">{copy.company}</label><input id="join-company" className="input" name="company" autoComplete="organization" maxLength={LIMITS.company} value={form.company} onChange={set} /></div>
          <div><label className="lbl" htmlFor="join-city">{copy.city}</label>
            <select id="join-city" className="input" name="city" value={form.city} onChange={set} style={selectLook}>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div><label className="lbl" htmlFor="join-cr">{copy.cr}</label><input id="join-cr" className="input" name="cr" inputMode="numeric" dir="ltr" maxLength={15} aria-invalid={error === real.err.cr ? 'true' : 'false'} value={form.cr} onChange={set} />
            <p className="muted" style={{ fontSize: '12px', marginTop: '6px' }}>{copy.crHint}</p></div>
        </>) : null}

        {step === 2 ? (<>
          <div><label className="lbl" htmlFor="join-person">{copy.person}</label><input id="join-person" className="input" name="person" autoComplete="name" maxLength={LIMITS.person} value={form.person} onChange={set} /></div>
          {platformOn ? (<>
            <div className="join-two" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,210px),1fr))', gap: '12px' }}>
              <div><label className="lbl" htmlFor="join-mobile">{real.mobile}</label><input id="join-mobile" className="input num" name="mobile" type="tel" dir="ltr" autoComplete="tel" inputMode="tel" maxLength={20} placeholder={real.mobilePh} value={form.mobile} onChange={set} /></div>
              <div><label className="lbl" htmlFor="join-email">{real.email}</label><input id="join-email" className="input" name="email" type="email" dir="ltr" autoComplete="email" value={form.email} onChange={set} /></div>
            </div>
            <div><label className="lbl" htmlFor="join-password">{real.coPassword}</label>
              <div style={{ position: 'relative' }}>
                <input id="join-password" className="input" name="password" type={showPw ? 'text' : 'password'} dir="ltr" autoComplete="new-password" placeholder={real.passwordHint} value={form.password} onChange={set} style={{ paddingInlineEnd: '72px' }} />
                <button type="button" className="lnkbtn" onClick={() => setShowPw(!showPw)} aria-pressed={showPw ? 'true' : 'false'} style={{ position: 'absolute', insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12.5px' }}>{showPw ? copy.hidePassword : copy.showPassword}</button>
              </div>
            </div>
          </>) : null}
        </>) : null}

        {step === 3 ? (<>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
              <span className="lbl" style={{ margin: 0 }}>{copy.trades}</span>
              <span className="muted num" aria-live="polite" style={{ fontSize: '12.5px' }}>{copy.picked(picked.length, MAX_TRADES)}</span>
            </div>
            {picked.length ? (
              <div role="group" aria-label={copy.trades} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                {ALL_TRADES.filter((t) => picked.includes(t.id)).map((t) => (
                  <button key={t.id} type="button" className="tchip" aria-pressed="true" aria-label={`${copy.remove}: ${label(t)}`} onClick={() => toggle(t.id)}>{label(t)} <span aria-hidden="true" style={{ marginInlineStart: '4px' }}>×</span></button>
                ))}
              </div>
            ) : <p className="muted" style={{ fontSize: '12.5px', marginTop: '6px' }}>{copy.tradesHint}</p>}
            <div className="join-groups" style={{ marginTop: '12px', border: '1px solid #ECEBF4', borderRadius: '14px', overflow: 'hidden' }}>
              {groups.map((g, i) => {
                const n = g.items.filter((t) => picked.includes(t.id)).length, isOpen = open === g.id;
                return (
                  <div key={g.id} style={{ borderTop: i ? '1px solid #ECEBF4' : 'none' }}>
                    <button type="button" aria-expanded={isOpen ? 'true' : 'false'} aria-controls={`join-g-${g.id}`} onClick={() => setOpen(isOpen ? '' : g.id)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 16px', background: isOpen ? '#FBFAFE' : '#fff', border: 0, font: 'inherit', fontSize: '14px', color: '#1B1464', cursor: 'pointer', textAlign: 'start' }}>
                      <span style={{ flex: 1, fontWeight: 500 }}>{g.label}</span>
                      {n ? <span className="num" style={{ fontSize: '11.5px', fontWeight: 600, color: '#B84522', background: '#FFF1EC', borderRadius: '999px', padding: '2px 8px' }}>{n}</span> : null}
                      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B6986" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease' }}><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                    {isOpen ? <div id={`join-g-${g.id}`} role="group" aria-label={g.label} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '4px 16px 16px' }}>{g.items.map(chip)}</div> : null}
                  </div>
                );
              })}
            </div>
          </div>
          {noteOpen ? (
            <div><label className="lbl" htmlFor="join-note">{copy.note}</label><textarea id="join-note" className="input" name="note" rows={3} maxLength={LIMITS.appNote} value={form.note} onChange={set} placeholder={copy.notePh} aria-describedby="join-note-count" />
              <span id="join-note-count" className="muted num charcount" aria-live="polite">{real.chars(form.note.length, LIMITS.appNote)}</span></div>
          ) : <button type="button" className="lnkbtn" onClick={() => setNoteOpen(true)} style={{ alignSelf: 'flex-start', fontSize: '13px' }}>{copy.addNote}</button>}
          <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13px', lineHeight: 1.7, color: '#3A385C' }}>
            <input id="join-agree" type="checkbox" required aria-invalid={error === copy.agreeError ? 'true' : 'false'} aria-describedby={error ? 'join-error' : undefined} checked={agree}
              onChange={(e) => { setAgree(e.currentTarget.checked); if (e.currentTarget.checked && error === copy.agreeError) setError(''); }} style={{ marginTop: '5px' }} />
            <span>{copy.agree} <a className="lnk" data-route="terms" href={routeHref('terms')} onClick={vm.go} style={{ fontSize: '13px', color: '#C53B1C' }}>{copy.terms}</a> {copy.and}{lang === 'ar' ? '' : ' '}<a className="lnk" data-route="privacy" href={routeHref('privacy')} onClick={vm.go} style={{ fontSize: '13px', color: '#C53B1C' }}>{copy.privacy}</a></span>
          </label>
        </>) : null}

        {errorLine}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
          {step > 1 ? <button type="button" className="btn btn-s" onClick={() => go(step - 1)}>{copy.back}</button> : <span className="muted num" style={{ fontSize: '12.5px' }}>{copy.stepOf(step, STEPS)}</span>}
          {step < STEPS
            ? <button type="button" className="btn btn-p" onClick={next}>{copy.next}</button>
            : <button className="btn btn-p" type="button" disabled={busy} onClick={submit}>{busy ? real.working : platformOn ? real.coCreate : copy.send}</button>}
        </div>
      </div>
    </section>
  );
}
