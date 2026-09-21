/* Shown after a request has been written into WhatsApp. It says plainly that
   nothing has reached Tarmem until the visitor presses Send, and offers the same
   message again, or by email, if WhatsApp did not open. */

import type { VM } from '../state/viewModel';
import { LAUNCH_COPY } from './copy';
import { mailtoUrl, whatsAppUrl } from './deliver';
import type { SentRequest } from './guard';

export default function SentPage({ vm }: { vm: VM }) {
  const copy = LAUNCH_COPY[vm.dir === 'ltr' ? 'en' : 'ar'].sent;
  const last = vm.launchLast as SentRequest | undefined;
  const title = last?.kind === 'join' ? copy.titleJoin : last?.kind === 'contact' ? copy.titleContact : copy.titleProject;
  const steps = [copy.steps[0], ...(last?.files ? [copy.stepsFiles] : []), copy.steps[1]];

  return (
    <section className="wrap fade" style={{ paddingBlock: 'clamp(34px,4.2vw,60px) clamp(48px,6vw,88px)', maxWidth: '760px' }}>
      <span className="kick">{copy.kicker}</span>
      <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', marginTop: '10px' }}>{title}</h1>
      <p style={{ color: '#5B5A7A', marginTop: '12px', fontSize: '15px', lineHeight: 1.8 }}>{copy.lead}</p>

      <ol className="card" style={{ marginTop: '22px', paddingInlineStart: '44px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14.5px', lineHeight: 1.7, color: '#14113F' }}>
        {steps.map((step) => <li key={step}>{step}</li>)}
      </ol>

      {last ? (
        <pre dir="auto" style={{ marginTop: '18px', whiteSpace: 'pre-wrap', font: 'inherit', fontSize: '13.5px', lineHeight: 1.8, color: '#3A385C', background: '#F7F6FC', border: '1px solid #E6E5F0', borderRadius: '14px', padding: '16px 18px' }}>
          {last.text}
        </pre>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '22px' }}>
        {last ? <a className="btn btn-p" href={whatsAppUrl(last.text)} target="_blank" rel="noopener">{copy.again}</a> : null}
        {last ? <a className="btn btn-s" href={mailtoUrl(copy.emailSubject, last.text)}>{copy.email}</a> : null}
        <button className="btn btn-g" type="button" data-route="home" onClick={vm.go}>{copy.home}</button>
      </div>
    </section>
  );
}
