/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function PricingPage({ vm }: { vm: VM }) {
  return (<>
    <section className="wrap fade" style={{ paddingBlock: '64px 8px', maxWidth: '1000px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <h2 style={{ fontSize: '28px', color: '#1B1464' }}>{vm.t.pricing2.whoTitle}</h2>
        <div className="seg" style={{ padding: '4px' }}>
          <label><input type="radio" name="prole" value="homeowner" checked={vm.prIsHo} onChange={vm.setPriceRole} />{vm.t.pricing2.iAmHo}</label>
          <label><input type="radio" name="prole" value="contractor" checked={vm.prIsCo} onChange={vm.setPriceRole} />{vm.t.pricing2.iAmCo}</label>
        </div>
      </div>
      <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.45fr) minmax(0,1fr)', gap: '14px', marginTop: '32px', alignItems: 'stretch' }}>
        <div style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '18px', background: 'linear-gradient(135deg,#FFFAF5 0%,#FFF1E6 55%,#FFECE6 100%)', color: '#1B1464', borderRadius: '28px', padding: '34px 36px', isolation: 'isolate' }}>
          <span style={{ position: 'absolute', insetInlineEnd: '-18%', top: '-45%', width: '70%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,136,0,.12),transparent 66%)', pointerEvents: 'none', zIndex: '-1' }}></span>
          <span style={{ position: 'absolute', insetInlineStart: '-10%', bottom: '-50%', width: '60%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,255,255,.7),transparent 68%)', pointerEvents: 'none', zIndex: '-1' }}></span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', letterSpacing: '.12em', textTransform: 'uppercase', color: '#B0612F' }}>{vm.paidCard.badge}</span>
            
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', flexWrap: 'wrap' }}>
            <span className="num" style={{ fontSize: 'clamp(64px,8vw,104px)', fontWeight: '600', lineHeight: '.9', letterSpacing: '-.045em', background: 'linear-gradient(120deg,#FF8800,#FF5A3C 60%,#FF4455)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{vm.paidCard.rate}</span>
            <span style={{ fontSize: '15.5px', fontWeight: '600', lineHeight: '1.35', maxWidth: '22ch', textWrap: 'balance' }}>{vm.paidCard.line}</span>
          </div>
          <p style={{ fontSize: '13.5px', color: '#5B4A3F', lineHeight: '1.7', maxWidth: '52ch', textWrap: 'pretty' }}>{vm.paidCard.desc}</p>
          
    {vm.paidCard.desc2 ? (<><p style={{ fontSize: '13.5px', color: '#5B4A3F', lineHeight: '1.7', maxWidth: '52ch', textWrap: 'pretty' }}>{vm.paidCard.desc2}</p></>) : null}
    
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '8px 18px', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(176,97,47,.2)' }}>
            
    {((vm.inclList) || []).map((x: any, _i0: number) => (
      <React.Fragment key={_i0}>
              <span style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12.5px', color: '#1B1464', lineHeight: '1.5' }}><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#FF5A3C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', marginTop: '3px' }}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>{x}</span>
            </React.Fragment>
    ))}
    
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: '#F7F6FC', borderRadius: '28px', padding: '34px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', letterSpacing: '.12em', textTransform: 'uppercase', color: '#7A7994' }}>{vm.freeCard.badge}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', flexWrap: 'wrap' }}>
            <span className="num" style={{ fontSize: 'clamp(64px,8vw,104px)', fontWeight: '600', lineHeight: '.9', letterSpacing: '-.045em', color: '#1B1464' }}>{vm.freeCard.rate}</span>
            <span style={{ fontSize: '15.5px', fontWeight: '600', color: '#1B1464', lineHeight: '1.35', maxWidth: '22ch', textWrap: 'balance' }}>{vm.freeCard.line}</span>
          </div>
          <p style={{ fontSize: '13.5px', color: '#5B5A7A', lineHeight: '1.7', maxWidth: '52ch', textWrap: 'pretty' }}>{vm.freeCard.desc}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #E6E5F0' }}>
            
    {((vm.t.pricing2.free) || []).map((x: any, _i0: number) => (
      <React.Fragment key={_i0}><span style={{ fontSize: '12.5px', color: '#1B1464', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#FF7722', flex: 'none' }}></span>{x}</span></React.Fragment>
    ))}
    
          </div>
        </div>
      </div>
    </section>


    <section className="wrap" style={{ paddingBlock: '56px 24px', maxWidth: '1000px' }}>
      <div className="calc">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap' }}>
          <div><h2 style={{ fontSize: '26px', color: '#1B1464' }}>{vm.t.pricing2.calcTitle}</h2><p className="muted" style={{ fontSize: '14px', marginTop: '6px' }}>{vm.t.pricing2.calcSub}</p></div>
          <div style={{ textAlign: 'end' }}><span className="muted" style={{ fontSize: '12.5px', display: 'block' }}>{vm.t.pricing2.calcValue}</span><span className="num" style={{ fontSize: '34px', fontWeight: '600', color: '#FF5A3C', lineHeight: '1.1' }}>{vm.curPre}{vm.calc.value}{vm.curPost}</span></div>
        </div>
        <input className="range" type="range" min="10000" max="1000000" step="10000" value={vm.calc.raw} onChange={vm.setCalc} onInput={vm.setCalc} aria-label={vm.dir === 'ltr' ? 'Project value' : 'قيمة المشروع'} />
        <div className="num muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}><span>{vm.curPre}10,000{vm.curPost}</span><span>{vm.curPre}1,000,000{vm.curPost}</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '2px' }}>
          <label className="muted" style={{ fontSize: '12.5px' }}>{vm.t.pricing2.calcEdit}</label>
          <input className="calcin num" type="number" min="10000" step="1000" value={vm.calc.draft} onInput={vm.setCalcDraft} onBlur={vm.commitCalc} aria-label={vm.dir === 'ltr' ? 'Project value' : 'قيمة المشروع'} />
        </div>
        
    {vm.calc.big ? (<>
          <div className="bignote"><span>{vm.t.pricing2.calcBig}</span><button className="btn btn-s btn-sm" data-route="contact" onClick={vm.go}>{vm.t.faq.contact}</button></div>
        </>) : null}
    
        <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '16px', marginTop: '8px' }}>
          <div className="calcbox">
            <span className="kick" style={{ color: '#7A7994' }}>{vm.t.roles.homeowner}</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}><span className="muted">{vm.t.pricing2.calcWork}</span><span className="num" style={{ color: '#1B1464' }}>{vm.curPre}{vm.calc.value}{vm.curPost}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}><span className="muted">{vm.t.pricing2.calcFeeNet}</span><span className="num" style={{ fontWeight: '600', color: '#1B1464' }}>+ {vm.curPre}{vm.calc.fee}{vm.curPost}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}><span className="muted">{vm.t.pricing2.calcBeforeVat}</span><span className="num" style={{ fontWeight: '600', color: '#1B1464' }}>{vm.curPre}{vm.calc.beforeVat}{vm.curPost}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span className="muted">{vm.t.pricing2.calcVat}</span><span className="num" style={{ color: '#5B5A7A' }}>+ {vm.curPre}{vm.calc.feeVat}{vm.curPost}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', paddingTop: '10px', borderTop: '1px solid #EEEDF5' }}><span style={{ fontWeight: '600', color: '#1B1464', fontSize: '14.5px' }}>{vm.t.pricing2.calcHoPays}</span><span className="num" style={{ fontSize: '22px', fontWeight: '600', color: '#1B1464' }}>{vm.curPre}{vm.calc.hoPays}{vm.curPost}</span></div>
          </div>
          <div className="calcbox">
            <span className="kick" style={{ color: '#7A7994' }}>{vm.t.roles.contractor}</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}><span className="muted">{vm.t.pricing2.calcWork}</span><span className="num" style={{ color: '#1B1464' }}>{vm.curPre}{vm.calc.value}{vm.curPost}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}><span className="muted">{vm.t.pricing2.calcCommNet}</span><span className="num" style={{ fontWeight: '600', color: '#8A5A00' }}>− {vm.curPre}{vm.calc.comm}{vm.curPost}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}><span className="muted">{vm.t.pricing2.calcCoBeforeVat}</span><span className="num" style={{ fontWeight: '600', color: '#1B1464' }}>{vm.curPre}{vm.calc.coBeforeVat}{vm.curPost}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}><span className="muted">{vm.t.pricing2.calcCommVat}</span><span className="num" style={{ color: '#8A5A00' }}>− {vm.curPre}{vm.calc.commVat}{vm.curPost}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', paddingTop: '10px', borderTop: '1px solid #EEEDF5' }}><span style={{ fontWeight: '600', color: '#1B1464', fontSize: '14.5px' }}>{vm.t.pricing2.calcCoGets}</span><span className="num" style={{ fontSize: '22px', fontWeight: '600', color: '#15703A' }}>{vm.curPre}{vm.calc.coGets}{vm.curPost}</span></div>
          </div>
        </div>
        <div style={{ marginTop: '12px', paddingTop: '18px', borderTop: '1px solid #EEEDF5' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <span className="kick" style={{ color: '#7A7994' }}>{vm.t.pricing2.calcBeforeVat}</span>
            <span className="num" style={{ fontSize: '18px', fontWeight: '600', color: '#1B1464' }}>{vm.curPre}{vm.calc.beforeVat}{vm.curPost}</span>
          </div>
          <div style={{ display: 'flex', height: '10px', borderRadius: '6px', overflow: 'hidden', background: '#EEEDF5', gap: '2px' }}>
            <span style={{ width: `${vm.calc.coPct}%`, background: '#1B7A3E', transition: 'width .35s ease' }}></span>
            <span style={{ width: `${vm.calc.tmPct}%`, background: '#FF5A3C', transition: 'width .35s ease' }}></span>
          </div>
          <div style={{ display: 'flex', gap: '10px 24px', marginTop: '12px', fontSize: '13px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#1B7A3E', flex: 'none' }}></span>{vm.t.pricing2.barCo}<span className="num" style={{ fontWeight: '600', color: '#1B1464' }}>{vm.curPre}{vm.calc.coBeforeVat}{vm.curPost}</span></span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#FF5A3C', flex: 'none' }}></span>{vm.t.pricing2.barTarmem}<span className="num" style={{ fontWeight: '600', color: '#1B1464' }}>{vm.curPre}{vm.calc.tmFees}{vm.curPost}</span></span>
          </div>
          <p className="muted" style={{ fontSize: '12px', marginTop: '10px' }}>{vm.t.pricing2.barBase}</p>
          <p className="muted" style={{ fontSize: '12px', marginTop: '6px', lineHeight: '1.7' }}>{vm.t.pricing2.barBase2}</p>
        </div>
      </div>
    </section>

    <section className="wrap" style={{ paddingBlock: '16px 32px', maxWidth: '1000px' }}>
      <div className="pol-card">
        <span className="skick" style={{ padding: '0 4px 4px' }}><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6 6 18" /></svg>{vm.t.pricing2.policiesTitle}</span>
        
    {((vm.t.pricing2.policies) || []).map((p: any, _i0: number) => (
      <React.Fragment key={_i0}>
          <details className="pol">
            <summary><span style={{ minWidth: '0' }}>{p.t}</span><i aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg></i></summary>
            
      {p.d ? (<><p>{p.d}</p></>) : null}
      
            
      {((p.parts) || []).map((pt: any, _i1: number) => (
        <React.Fragment key={_i1}>
              <p><b style={{ color: '#1B1464', fontWeight: '600' }}>{pt.lbl}</b>{pt.txt}</p>
            </React.Fragment>
      ))}
      
          </details>
        </React.Fragment>
    ))}
    
      </div>
    </section>

    <div style={{ height: '56px' }}></div>
  </>);
}
