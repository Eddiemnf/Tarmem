/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

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
      </div>
      <div className="card" style={{ padding: '30px', gap: '16px' }}>
        
    {vm.ct.sent ? (<>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}><span className="fcheck" style={{ width: '30px', height: '30px', fontSize: '15px' }}>✓</span><p style={{ fontSize: '15px', color: '#1B1464', lineHeight: '1.7' }}>{vm.t.pages.cSent}</p></div>
        </>) : null}
    
        
    {vm.ct.form ? (<>
          <div><label className="lbl">{vm.t.pages.cName}</label><input className="input" name="name" value={vm.ct.f.name} onChange={vm.setContact} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div><label className="lbl">{vm.t.pages.cEmail}</label><input className="input" type="email" name="email" value={vm.ct.f.email} onChange={vm.setContact} /></div>
            <div><label className="lbl">{vm.t.pages.cPhone}</label><input className="input" name="phone" value={vm.ct.f.phone} onChange={vm.setContact} /></div>
          </div>
          <div><label className="lbl">{vm.t.pages.cTopic}</label><select className="input" name="topic" value={vm.ct.f.topic} onChange={vm.setContact}>
      {((vm.t.pages.topics) || []).map((o: any, _i0: number) => (
        <React.Fragment key={_i0}><option value={o}>{o}</option></React.Fragment>
      ))}
      </select></div>
          <div><label className="lbl">{vm.t.pages.cMsg}</label><textarea className="input" name="msg" value={vm.ct.f.msg} onChange={vm.setContact} placeholder={vm.t.pages.cMsgPh} /></div>
          
      {vm.ct.error ? (<><p style={{ fontSize: '13px', color: '#D9401F' }}>{vm.ct.error}</p></>) : null}
      
          <button className="btn btn-p" onClick={vm.sendContact}>{vm.t.pages.cSend}</button>
        </>) : null}
    
      </div>
    </section>
  </>);
}
