/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function PricingPage({ vm }: { vm: VM }) {
  return (<>
    <section className="wrap fade" style={{ paddingBlock: '56px 40px', maxWidth: '1000px', textAlign: 'center' }}>
      <span className="kick">{vm.t.pricing2.kicker}</span>
      <h1 style={{ fontSize: 'clamp(30px,3.4vw,44px)', color: '#1B1464', margin: '12px auto 16px', maxWidth: '22ch' }}>{vm.t.pricing2.title}</h1>
      <p style={{ color: '#5B5A7A', fontSize: '16.5px', maxWidth: '60ch', margin: '0 auto' }}>{vm.t.pricing2.sub}</p>
    </section>

    <section className="wrap" style={{ paddingBlock: '24px 8px', maxWidth: '1000px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <h2 style={{ fontSize: '28px', color: '#1B1464' }}>{vm.t.pricing2.whoTitle}</h2>
        <div className="seg" style={{ padding: '4px' }}>
          <label><input type="radio" name="prole" value="homeowner" checked={vm.prIsHo} onChange={vm.setPriceRole} />{vm.t.pricing2.iAmHo}</label>
          <label><input type="radio" name="prole" value="contractor" checked={vm.prIsCo} onChange={vm.setPriceRole} />{vm.t.pricing2.iAmCo}</label>
        </div>
      </div>
      <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '20px', marginTop: '28px' }}>
        
    {((vm.priceCards) || []).map((p: any, _i0: number) => (
      <React.Fragment key={_i0}>
          <div className="pcard" style={{ borderColor: p.border }}>
            <span className={`tag ${p.badgeCls}`} style={{ alignSelf: 'flex-start' }}>{p.badge}</span>
            <span className="num" style={{ fontSize: 'clamp(48px,6vw,72px)', fontWeight: '600', lineHeight: '1', color: '#1B1464' }}>{p.rate}</span>
            <span style={{ fontWeight: '600', color: '#1B1464', fontSize: '15.5px' }}>{p.line}</span>
            <p style={{ fontSize: '14.5px', color: '#5B5A7A' }}>{p.desc}</p>
          </div>
        </React.Fragment>
    ))}
    
      </div>
      
    {vm.prIsCo ? (<>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '20px', justifyContent: 'center' }}>
          
      {((vm.t.pricing2.coIncl) || []).map((x: any, _i0: number) => (
        <React.Fragment key={_i0}><span className="tag tag-n" style={{ padding: '7px 14px', fontSize: '12.5px' }}>{x}</span></React.Fragment>
      ))}
      
        </div>
      </>) : null}
    
    </section>

    <section className="wrap" style={{ paddingBlock: '56px 24px', maxWidth: '1000px' }}>
      <div className="calc">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap' }}>
          <div><h2 style={{ fontSize: '26px', color: '#1B1464' }}>{vm.t.pricing2.calcTitle}</h2><p className="muted" style={{ fontSize: '14px', marginTop: '6px' }}>{vm.t.pricing2.calcSub}</p></div>
          <div style={{ textAlign: 'end' }}><span className="muted" style={{ fontSize: '12.5px', display: 'block' }}>{vm.t.pricing2.calcValue}</span><span className="num" style={{ fontSize: '34px', fontWeight: '600', color: '#FF5A3C', lineHeight: '1.1' }}>SAR {vm.calc.value}</span></div>
        </div>
        <input className="range" type="range" min="10000" max="1000000" step="10000" value={vm.calc.raw} onChange={vm.setCalc} onInput={vm.setCalc} />
        <div className="num muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' }}><span>SAR 10,000</span><span>SAR 1,000,000</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '2px' }}>
          <label className="muted" style={{ fontSize: '12.5px' }}>{vm.t.pricing2.calcEdit}</label>
          <input className="calcin num" type="number" min="10000" step="1000" value={vm.calc.draft} onInput={vm.setCalcDraft} onBlur={vm.commitCalc} />
        </div>
        
    {vm.calc.big ? (<>
          <div className="bignote"><span>{vm.t.pricing2.calcBig}</span><button className="btn btn-s btn-sm" data-route="contact" onClick={vm.go}>{vm.t.faq.contact}</button></div>
        </>) : null}
    
        <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '16px', marginTop: '8px' }}>
          <div className="calcbox">
            <span className="kick" style={{ color: '#7A7994' }}>{vm.t.roles.homeowner}</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}><span className="muted">{vm.t.pricing2.calcFee}</span><span className="num" style={{ fontWeight: '600', color: vm.calc.feeColor }}>{vm.calc.feeLabel}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', paddingTop: '10px', borderTop: '1px solid #EEEDF5' }}><span style={{ fontWeight: '600', color: '#1B1464', fontSize: '14.5px' }}>{vm.t.pricing2.calcHoPays}</span><span className="num" style={{ fontSize: '22px', fontWeight: '600', color: '#1B1464' }}>SAR {vm.calc.hoPays}</span></div>
          </div>
          <div className="calcbox">
            <span className="kick" style={{ color: '#7A7994' }}>{vm.t.roles.contractor}</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}><span className="muted">{vm.t.pricing2.calcCoComm}</span><span className="num" style={{ fontWeight: '600', color: '#8A5A00' }}>− SAR {vm.calc.comm}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', paddingTop: '10px', borderTop: '1px solid #EEEDF5' }}><span style={{ fontWeight: '600', color: '#1B1464', fontSize: '14.5px' }}>{vm.t.pricing2.calcCoGets}</span><span className="num" style={{ fontSize: '22px', fontWeight: '600', color: '#15703A' }}>SAR {vm.calc.coGets}</span></div>
          </div>
        </div>
        <div style={{ marginTop: '8px' }}>
          <div style={{ display: 'flex', height: '12px', borderRadius: '8px', overflow: 'hidden', background: '#EEEDF5' }}>
            <span style={{ width: `${vm.calc.coPct}%`, background: 'linear-gradient(90deg,#2FA45F,#1B7A3E)', transition: 'width .35s ease' }}></span>
            <span style={{ width: `${vm.calc.tmPct}%`, background: 'linear-gradient(90deg,#FF8800,#FF4455)', transition: 'width .35s ease' }}></span>
          </div>
          <div style={{ display: 'flex', gap: '20px', marginTop: '10px', fontSize: '12.5px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}><span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#1B7A3E' }}></span>{vm.t.pricing2.barCo} <span className="num muted">{vm.calc.coPct}%</span></span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}><span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#FF5A3C' }}></span>{vm.t.pricing2.barTarmem} <span className="num muted">{vm.calc.tmPct}%</span></span>
          </div>
        </div>
      </div>
      <p className="muted" style={{ fontSize: '12.5px', marginTop: '16px', textAlign: 'center' }}>{vm.t.pricing2.note}</p>
    </section>

    <section className="wrap" style={{ paddingBlock: '8px 80px', maxWidth: '1000px', textAlign: 'center' }}>
      <button className="btn btn-s btn-sm" data-route="faq" onClick={vm.go}>{vm.t.nav.faq}</button>
    </section>
  </>);
}
