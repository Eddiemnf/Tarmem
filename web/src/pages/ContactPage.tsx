/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';
import { routeHref } from '../launch/urls';

export default function ContactPage({ vm }: { vm: VM }) {
  return (<>
    <section className="wrap fade g2" style={{ paddingBlock: '56px 80px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '56px', alignItems: 'start' }}>
      <div>
        <span className="kick">{vm.t.pages.contactKicker}</span>
        <h1 style={{ fontSize: 'clamp(30px,3.4vw,44px)', color: '#1B1464', margin: '12px 0 14px' }}>{vm.t.pages.contactTitle}</h1>
        <p style={{ color: '#5B5A7A', fontSize: '16px', maxWidth: '46ch' }}>{vm.t.pages.contactSub}</p>
        <div className="card" style={{ marginTop: '28px', gap: '10px', background: '#F7F6FC', border: '0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}><span className="muted">{vm.t.pages.cHours}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}><span className="muted">{vm.t.pages.cReply}</span></div>
        </div>
        <div className="ct-reach">
          <a className="ct-mail" href="mailto:support@tarmem.sa"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 7.5l7.4 5.2a2 2 0 0 0 2.2 0l7.4-5.2" /></svg><span dir="ltr">support@tarmem.sa</span></a>
          <a className="btn ct-wa" href="https://wa.me/966530373026" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="18" height="18" fill="#25D366" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.6 11.6 0 0 0 4.4 3.9c1.6.7 2.3.7 3.1.6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.2-.3-.2-.5-.3Z" /></svg> {vm.t.help.wa}</a>
        </div>
      </div>
      <div className="card" style={{ padding: '30px', gap: '16px' }}>
        
    {vm.ct.sent ? (<>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}><span className="fcheck" style={{ width: '30px', height: '30px', fontSize: '15px' }}>✓</span><p style={{ fontSize: '15px', color: '#1B1464', lineHeight: '1.7' }}>{vm.t.pages.cSent}</p></div>
        </>) : null}
    
        
    {vm.ct.form ? (<>
          <div><label className="lbl" htmlFor="a11y-name">{vm.t.pages.cName}</label><input className="input" name="name" maxLength={120} value={vm.ct.f.name} onChange={vm.setContact} aria-invalid={vm.ct.inv.name} aria-describedby="ct-err" id="a11y-name" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div><label className="lbl" htmlFor="a11y-email">{vm.t.pages.cEmail}</label><input className="input" type="email" name="email" maxLength={160} value={vm.ct.f.email} onChange={vm.setContact} aria-invalid={vm.ct.inv.reach} aria-describedby="ct-err" id="a11y-email" /></div>
            <div><label className="lbl" htmlFor="a11y-phone">{vm.t.pages.cPhone}</label><input className="input" name="phone" type="tel" maxLength={20} value={vm.ct.f.phone} onChange={vm.setContact} aria-invalid={vm.ct.inv.reach} aria-describedby="ct-err" id="a11y-phone" /></div>
          </div>
          <div><label className="lbl" htmlFor="a11y-topic">{vm.t.pages.cTopic}</label><select className="input" name="topic" value={vm.ct.f.topic} onChange={vm.setContact} required={true} aria-invalid={vm.ct.inv.topic} aria-describedby="ct-err" id="a11y-topic"><option value="" disabled={true}>{vm.t.pages.cTopicPh}</option>
      {((vm.t.pages.topics) || []).map((o: any, _i0: number) => (
        <React.Fragment key={_i0}><option value={o}>{o}</option></React.Fragment>
      ))}
      </select></div>
          <div><label className="lbl" htmlFor="a11y-msg">{vm.t.pages.cMsg}</label><textarea className="input" name="msg" maxLength={4000} value={vm.ct.f.msg} onChange={vm.setContact} placeholder={vm.t.pages.cMsgPh} aria-invalid={vm.ct.inv.msg} aria-describedby="ct-err" id="a11y-msg" /><span className="muted num charcount">{vm.ct.msgCount}</span></div>
          <div className="hp-field" aria-hidden="true"><label>Website</label><input className="input" name="website" value={vm.ct.f.website} onChange={vm.setContact} tabIndex={-1} autoComplete="off" /></div>
          
      {vm.ct.error ? (<><p id="ct-err" role="alert" style={{ fontSize: '13px', color: '#C2381A' }}>{vm.ct.error}</p></>) : null}
      
          <button className="btn btn-p" onClick={vm.sendContact}>{vm.t.pages.cSend}</button>
          <p className="muted" style={{ fontSize: '12.5px', lineHeight: '1.7' }}>{vm.t.pages.cPrivacy} <a className="lnk" data-route="privacy" onClick={vm.go} style={{ fontSize: '12.5px', textDecoration: 'underline', textUnderlineOffset: '3px' }} href={routeHref("privacy")}>{vm.t.pages.cPrivacyLink}</a></p>
        </>) : null}
    
      </div>
    </section>
  </>);
}
