/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';
import AssistantBar from '../components/AssistantBar';
import TarmemHero from '../components/TarmemHero/TarmemHeroSection';

export default function HomePage({ vm }: { vm: VM }) {
  return (<>
    <TarmemHero vm={vm} />
    <AssistantBar vm={vm} />

    
    {vm.showAiPill ? (<>
      <button className="v-pill" type="button" onClick={vm.toAiBar}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v3M12 18v3M4.2 7.5l2.6 1.5M17.2 15l2.6 1.5M4.2 16.5l2.6-1.5M17.2 9l2.6-1.5" /><circle cx="12" cy="12" r="3.4" /></svg>
        {vm.t.v2.startHere}
      </button>
    </>) : null}
    

    <section className="wrap" style={{ paddingBlock: 'clamp(26px,3.2vw,46px) 0' }}>
      <div style={{ maxWidth: '560px', marginBottom: '40px' }}><span className="kick">{vm.t.home.stepsKicker}</span><h2 style={{ fontSize: '36px', color: '#1B1464', marginTop: '10px' }}>{vm.t.home.stepsTitle}</h2></div>
      <div className="g4 steps4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '20px' }}>
        
    {((vm.t.home.steps) || []).map((s: any, _i0: number) => (
      <React.Fragment key={_i0}>
          <div className="card" style={{ gap: '14px', padding: '24px' }}>
            <span className="num stepn" style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'grid', placeItems: 'center', fontWeight: '600', color: '#fff', background: 'linear-gradient(135deg,#FF8800,#FF4455)' }}>{s.n}</span>
            <h3 style={{ fontSize: '20px', color: '#1B1464' }}>{s.title}</h3>
            <p style={{ fontSize: '14px', color: '#5B5A7A' }}>{s.desc}</p>
          </div>
        </React.Fragment>
    ))}
    
      </div>
    </section>

    <section className="wrap g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '20px', paddingBlock: 'clamp(34px,4.2vw,60px) clamp(48px,6vw,88px)', minHeight: '519px', marginTop: '38px', marginBottom: '38px' }}>
      <div style={{ position: 'relative', overflow: 'hidden', background: '#FDF5F1', color: '#1B1464', borderRadius: '24px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <span style={{ position: 'absolute', insetInlineEnd: '-14%', top: '-32%', width: '58%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,120,34,.13),transparent 68%)', pointerEvents: 'none' }}></span>
        <span style={{ position: 'absolute', insetInlineStart: '-12%', bottom: '-38%', width: '50%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,68,85,.09),transparent 70%)', pointerEvents: 'none' }}></span>
        <span className="kick" style={{ position: 'relative', color: '#D9401F' }}>{vm.t.home.hoKicker}</span>
        <h3 style={{ position: 'relative', fontSize: '28px', lineHeight: '38px' }}>{vm.t.home.hoHead}</h3>
        <p style={{ position: 'relative', fontSize: '15px', color: '#5B5A7A', flex: '1' }}>{vm.t.home.hoDesc}</p>
        <div style={{ position: 'relative', paddingTop: '14px', display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap' }}><button className="btn btn-p" data-route="post" onClick={vm.go}>{vm.t.home.hoCta}</button><a className="hlnk" data-route="contractors" onClick={vm.go}>{vm.t.nav.contractors}</a></div>
      </div>
      <div style={{ background: '#F8F7FC', borderRadius: '24px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <span className="kick">{vm.t.home.coKicker}</span>
        <h3 style={{ fontSize: '28px', color: '#1B1464', minHeight: '73px', lineHeight: '38px' }}>{vm.t.home.coHead}</h3>
        <p style={{ fontSize: '15px', color: '#5B5A7A', flex: '1' }}>{vm.t.home.coDesc}</p>
        <div style={{ paddingTop: '14px', display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap' }}><button className="btn btn-s" data-route="auth" data-signup="contractor" onClick={vm.goAuth}>{vm.t.home.coCta}</button><a className="hlnk" data-route="browse" onClick={vm.go}>{vm.t.nav.browseProjects}</a></div>
      </div>
    </section>

  </>);
}
