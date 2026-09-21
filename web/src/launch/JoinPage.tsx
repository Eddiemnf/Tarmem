/* The contractor application on the public site.

   The design's sign-up walks a contractor through an OTP and Nafath that do not
   exist yet, into a dashboard of invented projects. Until they do, "join as a
   contractor" is an application the Tarmem team reviews by hand: the details are
   written into a WhatsApp message the contractor sends themselves.

   Built from the design's own classes (.card, .input, .lbl, .tchip, .btn) and its
   ten headline trades, so it reads as part of the same product. */

import { useState } from 'react';
import { useLaunchActions, type VM } from '../state/viewModel';
import { LAUNCH_COPY } from './copy';

const TRADE_KEYS = ['hc0', 'hc1', 'hc2', 'hc3', 'hc4', 'hc5', 'hc6', 'hc7', 'hc8', 'hc9'];

export default function JoinPage({ vm }: { vm: VM }) {
  const lang = vm.dir === 'ltr' ? 'en' : 'ar';
  const copy = LAUNCH_COPY[lang].join;
  const { send } = useLaunchActions();
  const cities = (vm.cities || []) as { id: string; label: string }[];
  const trades = TRADE_KEYS.map((key) => vm[key]).filter(Boolean) as { id: string; label: string }[];

  const [form, setForm] = useState({ company: '', person: '', city: cities[0]?.id || '', cr: '', note: '' });
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState('');

  const set = (e: { currentTarget: { name: string; value: string } }) =>
    setForm({ ...form, [e.currentTarget.name]: e.currentTarget.value });
  const toggle = (id: string) =>
    setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);

  const submit = () => {
    if (!form.company.trim() || !form.person.trim() || !picked.length) {
      setError(copy.error);
      return;
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
  };

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
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div><label className="lbl" htmlFor="join-company">{copy.company}</label><input id="join-company" className="input" name="company" value={form.company} onChange={set} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '12px' }}>
          <div><label className="lbl" htmlFor="join-person">{copy.person}</label><input id="join-person" className="input" name="person" value={form.person} onChange={set} /></div>
          <div><label className="lbl" htmlFor="join-city">{copy.city}</label>
            <select id="join-city" className="input" name="city" value={form.city} onChange={set}>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <span className="lbl">{copy.trades}</span>
          <div role="group" aria-label={copy.trades} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
            {trades.map((t) => (
              <button key={t.id} type="button" className="tchip" aria-pressed={picked.includes(t.id) ? 'true' : 'false'} onClick={() => toggle(t.id)}>{t.label}</button>
            ))}
          </div>
          <p className="muted" style={{ fontSize: '12px', marginTop: '6px' }}>{copy.tradesHint}</p>
        </div>
        <div><label className="lbl" htmlFor="join-cr">{copy.cr}</label><input id="join-cr" className="input" name="cr" inputMode="numeric" dir="ltr" value={form.cr} onChange={set} />
          <p className="muted" style={{ fontSize: '12px', marginTop: '6px' }}>{copy.crHint}</p></div>
        <div><label className="lbl" htmlFor="join-note">{copy.note}</label><textarea id="join-note" className="input" name="note" rows={4} value={form.note} onChange={set} placeholder={copy.notePh} /></div>
        {error ? <p role="alert" style={{ color: '#D9401F', fontSize: '13px' }}>{error}</p> : null}
        <button className="btn btn-p" type="button" onClick={submit}>{copy.send}</button>
      </div>
    </section>
  );
}
