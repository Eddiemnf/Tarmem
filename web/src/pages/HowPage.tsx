/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function HowPage({ vm }: { vm: VM }) {
  return (<>
    <section className="wrap fade" style={{ paddingBlock: '56px clamp(40px,5vw,64px)' }}>
      <span className="kick">{vm.t.how.kicker}</span>
      <h1 style={{ fontSize: 'clamp(30px,3.4vw,44px)', color: '#1B1464', margin: '10px 0 16px', maxWidth: '22ch' }}>{vm.t.how.title}</h1>
      <p style={{ maxWidth: '64ch', color: '#5B5A7A', fontSize: '16px' }}>{vm.t.how.intro}</p>
      <div style={{ marginTop: 'clamp(36px,4.5vw,60px)' }}>
        <div role="tablist" style={{ display: 'flex', gap: '26px', borderBottom: '1px solid #E6E5F0', marginBottom: '6px', overflowX: 'auto' }}>
          <span className="tab" role="tab" data-tab="ho" aria-selected={vm.howHo} onClick={vm.setHowTab}>{vm.t.how.hoTitle}</span>
          <span className="tab" role="tab" data-tab="co" aria-selected={vm.howCo} onClick={vm.setHowTab}>{vm.t.how.coTitle}</span>
        </div>
        <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '0 clamp(30px,4vw,64px)' }}>
          
    {((vm.howSteps) || []).map((s: any, _i0: number) => (
      <React.Fragment key={_i0}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', gap: '0 14px', alignItems: 'start', paddingBlock: '17px', borderBottom: '1px solid #EEEDF5' }}>
              <span className="num" style={{ fontSize: '12.5px', fontWeight: '600', color: '#D9401F', paddingTop: '4px' }}>{s.n}</span>
              <div>
                <h4 style={{ fontSize: '17px', color: '#1B1464' }}>{s.title}</h4>
                <p style={{ fontSize: '14px', lineHeight: '1.7', color: '#5B5A7A', marginTop: '5px', maxWidth: '44ch' }}>{s.desc}</p>
              </div>
            </div>
          </React.Fragment>
    ))}
    
        </div>
      </div>
      <div style={{ marginTop: 'clamp(40px,5vw,68px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '30px', color: '#1B1464', whiteSpace: 'nowrap' }}>{vm.t.how.payTitle}</h2>
          <span style={{ flex: '1', height: '1px', background: 'linear-gradient(90deg,#FF8800,rgba(255,68,85,.15))' }}></span>
        </div>
        <div>
          <p style={{ color: '#5B5A7A', maxWidth: '78ch' }}>{vm.t.how.payIntro}</p>
          <div className="g4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '12px', marginTop: '24px' }}>
            
    {((vm.t.how.payFlow) || []).map((p: any, _i0: number) => (
      <React.Fragment key={_i0}>
              <div className="pay-step"><span className="kick" style={{ color: '#D9401F' }}>{p.k}</span><span style={{ fontWeight: '600', fontSize: '15.5px', color: '#1B1464' }}>{p.title}</span></div>
            </React.Fragment>
    ))}
    
          </div>
          <p className="muted" style={{ fontSize: '12.5px', marginTop: '16px' }}>{vm.t.how.payNote}</p>
        </div>
      </div>
    </section>
    <section className="wrap" style={{ paddingBlock: '0 72px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '10px', paddingTop: '16px' }}>
        <h2 style={{ fontSize: '30px', color: '#1B1464', whiteSpace: 'nowrap' }}>{vm.t.home.trustTitle}</h2>
        <span style={{ flex: '1', height: '1px', background: 'linear-gradient(90deg,#FF8800,rgba(255,68,85,.15))' }}></span>
      </div>
      <p style={{ color: '#5B5A7A', maxWidth: '58ch', marginBottom: '24px' }}>{vm.t.home.trustSub}</p>
      <div className="rules">
        
    {((vm.trustRules) || []).map((x: any, _i0: number) => (
      <React.Fragment key={_i0}>
          <article className="rule">
            <span className="rule-n num">{x.n}</span>
            <span className="rule-k">{x.k}</span>
            <h4 className="rule-t">{x.title}</h4>
            <p className="rule-d">{x.desc}</p>
          </article>
        </React.Fragment>
    ))}
    
      </div>
    </section>
  </>);
}
