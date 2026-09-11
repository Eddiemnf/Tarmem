/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function HomePage({ vm }: { vm: VM }) {
  return (<>
    <section className="fade" style={{ background: '#fff' }}>
      <div className="v-wrap v-hero-g" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.06fr) minmax(0,.94fr)', gap: 'clamp(28px,4vw,64px)', alignItems: 'center', paddingBlock: 'clamp(18px,2.2vw,40px) clamp(14px,1.8vw,26px)', paddingTop: '80.05px' }}>

        <div>
          <span className="v-kick">{vm.t.home.kicker}</span>
          <h1 className="v-h1" style={{ margin: '14px 0 0', maxWidth: '17ch', lineHeight: '1.18', fontSize: 'clamp(32px,4.4vw,52px)' }}>{vm.heroTitle}</h1>
          <p className="v-body" style={{ marginTop: '18px', maxWidth: '44ch' }}>{vm.t.home.sub}</p>

          <div style={{ marginTop: 'clamp(26px,3vw,36px)' }}>
            <label className="v-kick" htmlFor="v-ai-in" style={{ display: 'block', color: '#FF5A3C', letterSpacing: '.1em' }}>{vm.t.ai.label}</label>
            <div className="v-ai" style={{ marginTop: '12px' }}>
              <textarea id="v-ai-in" rows={2} value={vm.aiText} onChange={vm.setAi} placeholder={vm.t.ai.ph} />
              <div className="v-aifoot">
                <button className="v-icb" type="button" onClick={vm.aiAttach}>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-4.5-4.5L3 21" /></svg>
                  {vm.aiAttachLabel}
                </button>
                <button className="v-go" type="button" onClick={vm.startPlan} disabled={vm.aiEmpty}>
                  {vm.t.ai.send}
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={vm.arrowPath} /></svg>
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '14px' }}>
              
    {((vm.aiSug) || []).map((g: any, _i0: number) => (
      <React.Fragment key={_i0}>
                <button className="v-chip" type="button" data-q={g.q} onClick={vm.useSug}>{g.q}</button>
              </React.Fragment>
    ))}
    
              
              
            </div>
            
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <div className="v-stage">
            
    {vm.heroOn ? (<>
              <div className="v-inner">
                <div className="v-grid" aria-hidden="true"></div>
                <div className="v-pw">
                  <div className="v-holder">
                    <img className="v-fr v-lines" src="assets/room-01.png" alt={vm.heroAlt} />
                    <img className="v-fr v-color" src="assets/room-final.png" alt="" aria-hidden="true" />
                    <div className="v-plx" aria-hidden="true">
                      <div className="v-scan"><span style={{ top: '0' }}></span><span style={{ bottom: '0' }}></span></div>
                      <div className="v-anno v-a1"><i></i><b></b><em>01 · {vm.annoA}</em></div>
                      <div className="v-anno v-a2"><i></i><b></b><em>02 · {vm.annoB}</em></div>
                      <div className="v-anno v-a3"><i></i><b></b><em>03 · {vm.annoC}</em></div>
                      <div className="v-dim"><div></div><span className="cap"></span><span className="cap2"></span><span className="lbl num">{vm.t.v3.dim}</span></div>
                    </div>
                  </div>
                </div>
              </div>
              <span className="v-cnr v-cnr1" aria-hidden="true"></span>
              <span className="v-cnr v-cnr2" aria-hidden="true"></span>
              <span className="v-cnr v-cnr3" aria-hidden="true"></span>
              <span className="v-cnr v-cnr4" aria-hidden="true"></span>
            </>) : null}
    
          </div>
          <div className="v-stepcard">
            <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#1B1464', flex: 'none' }}>{vm.t.v3.stepsCard}</span>
            <div className="v-steprow">
              
    {((vm.heroSteps) || []).map((st: any, _i0: number) => (
      <React.Fragment key={_i0}>
                <span className="v-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={st.cls}>{st.mark}</span>
                  <span style={{ fontSize: '12.5px', color: st.color }}>{st.label}</span>
                </span>
              </React.Fragment>
    ))}
    
            </div>
          </div>
        </div>
      </div>

      

      <div className="v-arc" style={{ background: '#fff' }}></div>
    </section>

    
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
