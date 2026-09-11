/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function FaqPage({ vm }: { vm: VM }) {
  return (<>
    <section className="wrap fade" style={{ paddingBlock: '56px 80px', maxWidth: '820px' }}>
      <span className="kick">{vm.t.faq.kicker}</span>
      <h1 style={{ fontSize: 'clamp(30px,3.4vw,44px)', color: '#1B1464', margin: '10px 0 24px' }}>{vm.t.faq.title}</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        
    {((vm.faqs) || []).map((q: any, _i0: number) => (
      <React.Fragment key={_i0}>
          <div className="card" style={{ padding: '0', gap: '0', overflow: 'hidden' }}>
            <button data-i={_i0} onClick={vm.toggleFaq} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', background: 'none', border: '0', padding: '18px 22px', cursor: 'pointer', textAlign: 'start', font: 'inherit', color: '#1B1464' }}><span style={{ fontWeight: '600', fontSize: '16px' }}>{q.q}</span><span style={{ color: '#FF5A3C', fontSize: '22px', lineHeight: '1', flex: 'none' }}>{q.sign}</span></button>
            
      {q.open ? (<><p style={{ fontSize: '14.5px', color: '#5B5A7A', padding: '0 22px 20px' }}>{q.a}</p></>) : null}
      
          </div>
        </React.Fragment>
    ))}
    
      </div>
      <div className="card" style={{ marginTop: '32px', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', background: '#F7F6FC', border: '0' }}><span style={{ fontWeight: '500', color: '#1B1464' }}>{vm.t.faq.more}</span><button className="btn btn-p btn-sm" data-route="contact" onClick={vm.go}>{vm.t.faq.contact}</button></div>
    </section>
  </>);
}
