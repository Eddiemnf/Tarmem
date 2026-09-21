/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function AboutPage({ vm }: { vm: VM }) {
  return (<>
    <section className="wrap fade" style={{ paddingBlock: '56px 80px' }}>
      <span className="kick">{vm.t.about.kicker}</span>
      <h1 style={{ fontSize: 'clamp(30px,3.4vw,44px)', lineHeight: '1.2', color: '#1B1464', margin: '10px 0 24px', maxWidth: '24ch', textWrap: 'balance' }}>{vm.t.about.title}</h1>
      <div className="gside" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,3fr) minmax(0,2fr)', gap: '48px', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#5B5A7A', fontSize: '16px', lineHeight: '1.85' }}>
          <p>{vm.t.about.p1}</p>
          <p>{vm.t.about.p2}</p>
          <p>{vm.t.about.p2b}</p>
          <p>{vm.t.about.p3}</p>
        </div>
        <div style={{ minHeight: '100%', borderRadius: '24px', overflow: 'hidden', marginTop: '-108px' }}><img draggable="false" src="assets/locked/about.webp" alt={vm.t.about.title} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} /></div>
      </div>
      <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)', gap: '14px', marginTop: '56px', alignItems: 'stretch' }}>
        <div style={{ position: 'relative', overflow: 'hidden', isolation: 'isolate', display: 'flex', flexDirection: 'column', gap: '22px', padding: '40px 40px 36px', borderRadius: '28px', background: 'linear-gradient(135deg,#FFFAF5 0%,#FFF1E6 55%,#FFECE6 100%)', color: '#1B1464' }}>
          <span style={{ position: 'absolute', insetInlineEnd: '-22%', top: '-40%', width: '75%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,136,0,.12),transparent 66%)', pointerEvents: 'none', zIndex: '-1' }}></span>
          <span style={{ position: 'absolute', insetInlineStart: '-14%', bottom: '-55%', width: '65%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,255,255,.7),transparent 68%)', pointerEvents: 'none', zIndex: '-1' }}></span>
          <span className="skick"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6L6 18" /></svg>{vm.t.about.missionK}</span>
          <p style={{ position: 'relative', fontSize: 'clamp(24px,2.6vw,34px)', fontWeight: '600', lineHeight: '1.5', letterSpacing: '-.015em', textWrap: 'pretty', margin: 'auto 0' }}>{vm.t.about.mission}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '14px', padding: '30px 32px', borderRadius: '24px', background: '#F7F6FC' }}>
            <span className="skick"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6L6 18" /></svg>{vm.t.about.visionK}</span>
            <p style={{ fontSize: '16.5px', fontWeight: '500', lineHeight: '1.6', color: '#1B1464', textWrap: 'pretty' }}>{vm.t.about.vision}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0', padding: '26px 32px 22px', borderRadius: '24px', background: '#fff', border: '1px solid #E6E5F0' }}>
            <span className="skick" style={{ marginBottom: '14px' }}><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6L6 18" /></svg>{vm.t.about.growthK}</span>
            
    {((vm.t.about.roadmap) || []).map((r: any, _i0: number) => (
      <React.Fragment key={_i0}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px 0', borderTop: '1px solid #F1F0F8' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '14.5px', fontWeight: '600', color: '#1B1464' }}><span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'linear-gradient(135deg,#FF8800,#FF4455)', flex: 'none' }}></span>{r.k}</span>
                <span style={{ fontSize: '12.5px', color: '#5B5A7A', lineHeight: '1.65' }}>{r.d}</span>
              </div>
            </React.Fragment>
    ))}
    
          </div>
        </div>
      </div>

    </section>
  </>);
}
