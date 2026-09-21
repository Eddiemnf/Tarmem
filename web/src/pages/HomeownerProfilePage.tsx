/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function HomeownerProfilePage({ vm }: { vm: VM }) {
  return (<>
    <section className="wrap fade" style={{ paddingBlock: '40px 80px' }}>
      <a className="lnk" data-route={vm.hp.backRoute} onClick={vm.go} style={{ fontSize: '13px', color: '#FF5A3C' }}>{vm.backArrow} {vm.hp.backLabel}</a>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '28px', flexWrap: 'wrap', marginTop: '22px' }}>
        <div style={{ minWidth: '0' }}>
          <span className="kick">{vm.t.hprofile.kicker}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '10px' }}>
            <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464' }}>{vm.hp.name}</h1>
            
    {vm.hp.nafath ? (<><span className="tag tag-v">✓ {vm.t.hprofile.nafath}</span></>) : null}
    
            
    {vm.hp.hoMasked ? (<><span className="tag tag-n">{vm.t.hprofile.maskedAlt}</span></>) : null}
    
          </div>
          
    {vm.hp.hoMasked ? (<><p className="muted" style={{ marginTop: '8px', fontSize: '12.5px', lineHeight: '1.7', maxWidth: '56ch' }}>{vm.hp.hoMaskNote}</p></>) : null}
    
          <p className="muted num" style={{ marginTop: '10px', fontSize: '14px' }}>{vm.hp.city} · ★ {vm.hp.rating} ({vm.hp.reviews}) · {vm.hp.done} {vm.t.projectsWord} · {vm.t.hprofile.memberSince} {vm.hp.joined}</p>
        </div>
        
    {vm.hp.isMine ? (<><button className="btn btn-s" onClick={vm.openHoEdit}>{vm.t.hprofile.edit}</button></>) : null}
    
      </div>

      <div className="rgrid" style={{ marginTop: '32px' }}>
        
    {((vm.hp.stats) || []).map((st: any, _i0: number) => (
      <React.Fragment key={_i0}>
          <div className="ritem num"><div style={{ fontSize: '26px', fontWeight: '600', color: '#1B1464', lineHeight: '1.1' }}>{st.v}</div><div className="muted" style={{ fontSize: '12.5px', marginTop: '6px' }}>{st.l}</div></div>
        </React.Fragment>
    ))}
    
      </div>

      <div style={{ marginTop: '40px', maxWidth: '66ch' }}>
        <h3 style={{ fontSize: '20px', color: '#1B1464' }}>{vm.t.hprofile.about}</h3>
        <p style={{ color: '#5B5A7A', fontSize: '15.5px', lineHeight: '1.85', marginTop: '10px' }}>{vm.hp.about}</p>
      </div>

      <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '20px', marginTop: '32px' }}>
        <div className="card" style={{ gap: '12px' }}>
          <span className="kick">{vm.t.hprofile.identity}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span className="fcheck" style={{ width: '26px', height: '26px', fontSize: '13px' }}>✓</span><span style={{ fontSize: '14px', fontWeight: '600', color: '#15703A' }}>{vm.t.hprofile.nafath}</span></div>
          <p className="muted" style={{ fontSize: '11.5px', lineHeight: '1.75' }}>{vm.t.hprofile.verifiedNote}</p>
        </div>
        
    {vm.hp.isMine ? (<>
          <div className="card" style={{ gap: '10px', background: '#F7F6FC', border: '0' }}>
            <span className="kick" style={{ color: '#9B9AB4' }}>{vm.t.hprofile.whatSee}</span>
            <p className="muted" style={{ fontSize: '12.5px', lineHeight: '1.75' }}>{vm.t.hprofile.whatSeeNote}</p>
          </div>
        </>) : null}
    
      </div>

      <hr className="hair" style={{ margin: '44px 0 0' }} />

      <h3 style={{ fontSize: '20px', color: '#1B1464', marginTop: '36px' }}>{vm.t.hprofile.reviews}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '16px', marginTop: '16px' }}>
        
    {((vm.hp.revs) || []).map((rv: any, _i0: number) => (
      <React.Fragment key={_i0}>
          <div className="card" style={{ gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: '600', color: '#1B1464', fontSize: '14.5px' }}>{rv.who}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ color: '#FF8800', letterSpacing: '1px' }}>{rv.stars}</span><span className="muted num" style={{ fontSize: '12px' }}>{rv.when}</span></span>
            </div>
            <div>
              <span className="tag tag-v" style={{ fontSize: '10.5px', padding: '2px 8px' }}>✓ {rv.badge}</span>
            </div>
            <p style={{ fontSize: '14.5px', color: '#5B5A7A', lineHeight: '1.8' }}>{rv.text}</p>
          </div>
        </React.Fragment>
    ))}
    
      </div>
      
    {vm.hp.noRevs ? (<><p className="muted" style={{ fontSize: '13.5px', marginTop: '12px' }}>{vm.t.hprofile.noReviews}</p></>) : null}
    
    </section>
  </>);
}
