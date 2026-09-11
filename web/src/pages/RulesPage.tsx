/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function RulesPage({ vm }: { vm: VM }) {
  return (<>
    <section style={{ background: 'linear-gradient(180deg,#F7F6FC,#fff)' }}>
      <div className="wrap fade" style={{ paddingBlock: '56px 40px', maxWidth: '900px' }}>
        <span className="kick">{vm.t.rules.kicker}</span>
        <h1 style={{ fontSize: 'clamp(30px,3.4vw,44px)', color: '#1B1464', margin: '12px 0 16px', textWrap: 'balance' }}>{vm.t.rules.title}</h1>
        <p style={{ fontSize: '16.5px', color: '#5B5A7A', lineHeight: '1.8', maxWidth: '62ch' }}>{vm.t.rules.intro}</p>
      </div>
    </section>
    <section className="wrap" style={{ paddingBlock: '8px 24px', maxWidth: '900px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        
    {((vm.ruleStages) || []).map((st: any, _i0: number) => (
      <React.Fragment key={_i0}>
          <div className="rstage">
            <div className="rspine"><span className="rsnum num">{st.n}</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '44px' }}>
              <div>
                <h2 style={{ fontSize: '22px', color: '#1B1464', marginBottom: '6px' }}>{st.title}</h2>
                <span className="rspill">{st.sub}</span>
              </div>
              <div className="rgrid">
                
      {((st.items) || []).map((it: any, _i1: number) => (
        <React.Fragment key={_i1}>
                  <div className="ritem"><h3 style={{ fontSize: '15.5px', color: '#1B1464', lineHeight: '1.45', marginBottom: '7px' }}>{it.h}</h3><p style={{ fontSize: '13.5px', color: '#5B5A7A', lineHeight: '1.75' }}>{it.p}</p></div>
                </React.Fragment>
      ))}
      
              </div>
            </div>
          </div>
        </React.Fragment>
    ))}
    
      </div>
    </section>
    <section className="wrap" style={{ paddingBlock: '0 80px', maxWidth: '900px' }}>
      <div style={{ borderRadius: '24px', padding: '40px', background: '#16114F', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <span style={{ position: 'absolute', insetInlineEnd: '-10%', top: '-50%', width: '46%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,120,34,.3),transparent 68%)', pointerEvents: 'none' }}></span>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <h2 style={{ fontSize: '24px' }}>{vm.t.rules.noteTitle}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: '18px 32px' }}>
            
    {((vm.t.rules.notes) || []).map((n: any, _i0: number) => (
      <React.Fragment key={_i0}>
              <div style={{ display: 'flex', gap: '11px', alignItems: 'flex-start' }}><span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#FF8800', marginTop: '8px', flex: 'none' }}></span><span style={{ fontSize: '14px', lineHeight: '1.7', color: 'rgba(255,255,255,.82)' }}>{n}</span></div>
            </React.Fragment>
    ))}
    
          </div>
          <hr style={{ border: '0', borderTop: '1px solid rgba(255,255,255,.16)', margin: '2px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,.7)', maxWidth: '52ch', lineHeight: '1.7' }}>{vm.t.rules.ctaNote}</p>
            <button className="btn btn-on" data-route="contact" onClick={vm.go}>{vm.t.rules.cta}</button>
          </div>
        </div>
      </div>
    </section>
  </>);
}
