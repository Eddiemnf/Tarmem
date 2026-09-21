/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function HowPage({ vm }: { vm: VM }) {
  return (<>
    <section className="wrap fade" style={{ paddingBlock: '56px 8px', textAlign: 'center' }}>
      
      <h1 style={{ fontSize: 'clamp(24px,3.4vw,44px)', color: '#1B1464', margin: '12px auto 12px', letterSpacing: '-.02em', lineHeight: '1.25', maxWidth: '22ch', textWrap: 'balance' }}>{vm.t.how.title2} {vm.t.how.title2b}</h1>
      
      <div className="seg" style={{ padding: '4px', display: 'inline-flex', marginTop: '26px' }}>
        <label><input type="radio" name="howrole" value="ho" checked={vm.howHoOn} onChange={vm.setHowRole} />{vm.t.pricing2.iAmHo}</label>
        <label><input type="radio" name="howrole" value="co" checked={vm.howCoOn} onChange={vm.setHowRole} />{vm.t.pricing2.iAmCo}</label>
      </div>
    </section>

    <section className="wrap" style={{ paddingBlock: '36px 8px' }}>
      <div className="hw-grid">
        
    {((vm.howPhases) || []).map((p: any, _i0: number) => (
      <React.Fragment key={_i0}>
          <div className="hw-ph">
            <div className="hw-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <span className="hw-ic" dangerouslySetInnerHTML={p.icon}></span>
                <span className="hw-num num">{p.n}</span>
              </div>
              <div><h3 style={{ fontSize: '19px', color: '#1B1464', letterSpacing: '-.01em' }}>{p.t}</h3><span style={{ display: 'block', fontSize: '12.5px', color: '#B0612F', fontWeight: '600', marginTop: '3px' }}>{p.s}</span></div>
              <div className="hw-b">
      {((p.b) || []).map((x: any, _i1: number) => (
        <React.Fragment key={_i1}><span><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>{x}</span></React.Fragment>
      ))}
      </div>
            </div>
          </div>
        </React.Fragment>
    ))}
    
      </div>
    </section>

    <section className="wrap" style={{ paddingBlock: '40px 8px' }}>
      <div className="hw-band">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '0' }}>
          <h2 style={{ fontSize: '22px', color: '#1B1464' }}>{vm.t.how.payTitle}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '10px', maxWidth: '440px' }}>
            <span className="hw-pill" style={{ justifyContent: 'flex-start', borderRadius: '16px', padding: '14px 16px', border: '1px solid rgba(255,255,255,.7)', boxShadow: '0 1px 2px rgba(27,20,100,.03),0 10px 24px rgba(255,120,34,.05)', background: 'linear-gradient(115deg,#fffbf7 0%,#fff5ed 48%,#fff1f2 100%)' }}><b>01</b>{vm.payFlow0}</span>
            <span className="hw-pill" style={{ justifyContent: 'flex-start', borderRadius: '16px', padding: '14px 16px', border: '1px solid rgba(255,255,255,.7)', boxShadow: '0 1px 2px rgba(27,20,100,.03),0 10px 24px rgba(255,120,34,.05)', background: 'linear-gradient(115deg,#fff7ee 0%,#fff0e9 48%,#ffeef3 100%)' }}><b>02</b>{vm.payFlow1}</span>
            <span className="hw-pill" style={{ justifyContent: 'flex-start', borderRadius: '16px', padding: '14px 16px', border: '1px solid rgba(255,255,255,.7)', boxShadow: '0 1px 2px rgba(27,20,100,.03),0 10px 24px rgba(255,120,34,.05)', background: 'linear-gradient(115deg,#fff3e9 0%,#ffebe4 48%,#ffe9f1 100%)' }}><b>03</b>{vm.payFlow2}</span>
            <span className="hw-pill" style={{ justifyContent: 'flex-start', borderRadius: '16px', padding: '14px 16px', border: '1px solid rgba(255,255,255,.7)', boxShadow: '0 1px 2px rgba(27,20,100,.03),0 10px 24px rgba(255,120,34,.05)', background: 'linear-gradient(115deg,#ffeee3 0%,#ffe5de 48%,#ffe3ee 100%)' }}><b>04</b>{vm.payFlow3}</span>
          </div>
          <p style={{ fontSize: '13.5px', color: '#5B4A3F', lineHeight: '1.7', maxWidth: '56ch' }}>{vm.t.how.payShort}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '0' }}>
          <span className="kick" style={{ color: '#7A7994' }}>{vm.t.how.splitTitle}</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '22px minmax(0,1fr) auto', gap: '14px', alignItems: 'baseline', padding: '14px 0' }}>
              <span className="num" style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.1em', color: '#FF5A3C' }}>01</span>
              <span style={{ fontSize: '13.5px', color: '#1B1464', minWidth: '0' }}>{vm.ms0}</span>
              <span className="num" style={{ fontSize: '16px', fontWeight: '600', color: '#1B1464', letterSpacing: '-.02em', flex: 'none', direction: 'ltr' }}>30<span style={{ color: '#C9A98F', fontSize: '11.5px', marginInlineStart: '1px' }}>%</span></span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '22px minmax(0,1fr) auto', gap: '14px', alignItems: 'baseline', padding: '14px 0', borderTop: '1px solid #F2EAE3' }}>
              <span className="num" style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.1em', color: '#FF5A3C' }}>02</span>
              <span style={{ fontSize: '13.5px', color: '#1B1464', minWidth: '0' }}>{vm.ms1}</span>
              <span className="num" style={{ fontSize: '16px', fontWeight: '600', color: '#1B1464', letterSpacing: '-.02em', flex: 'none', direction: 'ltr' }}>40<span style={{ color: '#C9A98F', fontSize: '11.5px', marginInlineStart: '1px' }}>%</span></span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '22px minmax(0,1fr) auto', gap: '14px', alignItems: 'baseline', padding: '14px 0', borderTop: '1px solid #F2EAE3' }}>
              <span className="num" style={{ fontSize: '10.5px', fontWeight: '700', letterSpacing: '.1em', color: '#FF5A3C' }}>03</span>
              <span style={{ fontSize: '13.5px', color: '#1B1464', minWidth: '0' }}>{vm.ms2}</span>
              <span className="num" style={{ fontSize: '16px', fontWeight: '600', color: '#1B1464', letterSpacing: '-.02em', flex: 'none', direction: 'ltr' }}>30<span style={{ color: '#C9A98F', fontSize: '11.5px', marginInlineStart: '1px' }}>%</span></span>
            </div>
            <span style={{ display: 'flex', height: '5px', borderRadius: '3px', overflow: 'hidden', gap: '2px', marginTop: '10px' }}>
              <span style={{ flex: '3', background: 'linear-gradient(90deg,#FFE9D9,#FFDCC4)' }}></span><span style={{ flex: '4', background: 'linear-gradient(90deg,#FFC39B,#FF9A6B)' }}></span><span style={{ flex: '3', background: 'linear-gradient(90deg,#FF7F4E,#FF5A3C)' }}></span>
            </span>
          </div>
          <span className="muted" style={{ fontSize: '12px' }}>{vm.t.how.payNote}</span>
        </div>
      </div>
    </section>

    <div style={{ height: '56px' }}></div>
    <section className="wrap" style={{ paddingBlock: '0 80px' }}>
      <div style={{ textAlign: 'center', maxWidth: '56ch', margin: '0 auto 36px' }}>
        <h2 style={{ fontSize: 'clamp(24px,2.8vw,34px)', color: '#1B1464', letterSpacing: '-.02em', lineHeight: '1.25', textWrap: 'balance' }}>{vm.t.home.trustTitle}</h2>
        <p style={{ color: '#5B5A7A', fontSize: '15px', lineHeight: '1.75', marginTop: '12px' }}>{vm.t.home.trustSub}</p>
      </div>
      <div className="tr-grid">
        
    {((vm.trustRules) || []).map((x: any, _i0: number) => (
      <React.Fragment key={_i0}>
          <article className="tr-tile">
            <span className="tr-badge num">{x.n}</span>
            <h4 style={{ fontSize: '16px', color: '#1B1464', lineHeight: '1.35', marginTop: '14px' }}>{x.title}</h4>
            <p style={{ fontSize: '13px', color: '#5B5A7A', lineHeight: '1.7', marginTop: '8px' }}>{x.desc}</p>
          </article>
        </React.Fragment>
    ))}
    
      </div>
    </section>
  </>);
}
