/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function TermsPage({ vm }: { vm: VM }) {
  return (<>
    <section className="wrap fade" style={{ paddingBlock: '56px 80px', maxWidth: '820px' }}>
      <span className="kick">{vm.t.pages.termsKicker}</span>
      <h1 style={{ fontSize: 'clamp(30px,3.4vw,44px)', color: '#1B1464', margin: '12px 0 8px' }}>{vm.t.pages.termsTitle}</h1>
      <p className="muted" style={{ fontSize: '12.5px' }}>{vm.t.pages.termsUpdated}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', marginTop: '32px' }}>
        
    {((vm.t.pages.terms) || []).map((c: any, _i0: number) => (
      <React.Fragment key={_i0}>
          <div><h3 style={{ fontSize: '20px', color: '#1B1464', marginBottom: '8px' }}>{c.h}</h3><p style={{ fontSize: '15px', color: '#5B5A7A', lineHeight: '1.75' }}>{c.p}</p></div>
        </React.Fragment>
    ))}
    
      </div>
    </section>
  </>);
}
