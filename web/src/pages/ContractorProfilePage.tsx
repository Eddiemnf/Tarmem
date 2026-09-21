/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function ContractorProfilePage({ vm }: { vm: VM }) {
  return (<>
    <section className="wrap fade" style={{ paddingBlock: '40px 80px' }}>
      <a className="lnk" data-route="contractors" onClick={vm.go} style={{ fontSize: '13px', color: '#FF5A3C' }}>{vm.backArrow} {vm.t.search.title}</a>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '28px', flexWrap: 'wrap', marginTop: '22px' }}>
        <div style={{ minWidth: '0' }}>
          <span className="kick">{vm.t.roles.contractor}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '10px' }}>
            <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464' }}>{vm.prof.name}</h1>
            
    {vm.prof.verified ? (<><span className="tag tag-v">✓ {vm.t.verified}</span></>) : null}
    
            
    {vm.prof.pending ? (<><span className="tag tag-w">{vm.t.pendingVerification}</span></>) : null}
    
          </div>
          <p className="muted num" style={{ marginTop: '10px', fontSize: '14px' }}>{vm.prof.city} · ★ {vm.prof.rating} ({vm.prof.reviews}) · {vm.prof.doneLine} · {vm.t.hprofile.memberSince} {vm.prof.since}</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px' }}>
    {((vm.prof.tradeLabels) || []).map((tl: any, _i0: number) => (
      <React.Fragment key={_i0}><span className="tag tag-n">{tl}</span></React.Fragment>
    ))}
    </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          
    {vm.isNotContractor ? (<><button className="btn btn-p" data-route="post" onClick={vm.go}>{vm.t.profile.invite}</button><button className="btn btn-s" data-id={vm.prof.id} onClick={vm.toggleSave}>{vm.prof.saveLabel}</button></>) : null}
    
          
    {vm.isContractor ? (<><button className="btn btn-s" onClick={vm.openEdit}>{vm.t.profile.edit}</button></>) : null}
    
        </div>
      </div>

      <div className="rgrid" style={{ marginTop: '32px' }}>
        
    {((vm.prof.stats) || []).map((st: any, _i0: number) => (
      <React.Fragment key={_i0}>
          <div className="ritem num"><div style={{ fontSize: '26px', fontWeight: '600', color: '#1B1464', lineHeight: '1.1' }}>{st.v}</div><div className="muted" style={{ fontSize: '12.5px', marginTop: '6px' }}>{st.l}</div></div>
        </React.Fragment>
    ))}
    
      </div>

      <div style={{ marginTop: '40px', maxWidth: '66ch' }}>
        <h3 style={{ fontSize: '20px', color: '#1B1464' }}>{vm.t.hprofile.about}</h3>
        <p style={{ color: '#5B5A7A', fontSize: '15.5px', lineHeight: '1.85', marginTop: '10px' }}>{vm.prof.bio}</p>
      </div>

      <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '20px', marginTop: '32px' }}>
        <div className="card" style={{ gap: '10px' }}>
          <span className="kick">{vm.t.profile.credentials}</span>
          
    {((vm.prof.creds) || []).map((cr: any, _i0: number) => (
      <React.Fragment key={_i0}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '13.5px', padding: '8px 0', borderBottom: '1px solid #EEEDF5' }}><span>{cr.label}</span><span style={{ fontWeight: '600', color: cr.color }}>{cr.status}</span></div></React.Fragment>
    ))}
    
          <p className="muted" style={{ fontSize: '11.5px', lineHeight: '1.75' }}>{vm.t.profile.credNote}</p>
        </div>
        <div className="card" style={{ gap: '12px', background: '#F7F6FC', border: '0' }}>
          <span className="kick" style={{ color: '#9B9AB4' }}>{vm.t.profile.protectTitle}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            
    {((vm.t.profile.protect) || []).map((pt: any, _i0: number) => (
      <React.Fragment key={_i0}>
              <div style={{ display: 'flex', gap: '9px' }}><span style={{ color: '#FF7722', fontSize: '13px', lineHeight: '1.7' }}>✓</span><p className="muted" style={{ fontSize: '12.5px', lineHeight: '1.7' }}>{pt}</p></div>
            </React.Fragment>
    ))}
    
          </div>
        </div>
      </div>

      <hr className="hair" style={{ margin: '44px 0 0' }} />

      <h3 style={{ fontSize: '20px', color: '#1B1464', marginTop: '36px' }}>{vm.t.profile.tmProjects}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '20px', marginTop: '16px' }}>
        
    {((vm.prof.tmWork) || []).map((p: any, _i0: number) => (
      <React.Fragment key={_i0}><figure style={{ margin: '0' }}><div style={{ position: 'relative', aspectRatio: '4/3', borderRadius: '14px', overflow: 'hidden', background: '#F4F3FA' }}><img src={p.src} alt={p.caption} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /><span className="tag tag-v" style={{ position: 'absolute', insetInlineStart: '10px', bottom: '10px', fontSize: '10.5px', padding: '3px 9px' }}>✓ {vm.t.profile.tmBadge}</span></div><figcaption className="muted" style={{ fontSize: '12.5px', marginTop: '8px' }}>{p.caption}</figcaption></figure></React.Fragment>
    ))}
    
      </div>

      <h3 style={{ fontSize: '20px', color: '#1B1464', marginTop: '36px' }}>{vm.t.profile.ownGallery}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '20px', marginTop: '16px' }}>
        
    {((vm.prof.ownWork) || []).map((p: any, _i0: number) => (
      <React.Fragment key={_i0}><figure style={{ margin: '0' }}><div style={{ aspectRatio: '4/3', borderRadius: '14px', overflow: 'hidden', background: '#F4F3FA' }}><img src={p.src} alt={p.caption} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /></div><figcaption className="muted" style={{ fontSize: '12.5px', marginTop: '8px' }}>{p.caption}</figcaption></figure></React.Fragment>
    ))}
    
      </div>

      <hr className="hair" style={{ margin: '44px 0 0' }} />

      <h3 style={{ fontSize: '20px', color: '#1B1464', marginTop: '36px' }}>{vm.t.profile.reviews}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: '16px', marginTop: '16px' }}>
        
    {((vm.prof.reviewList) || []).map((rv: any, _i0: number) => (
      <React.Fragment key={_i0}>
          <div className="card" style={{ gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: '600', color: '#1B1464', fontSize: '14.5px' }}>{rv.who}</span>
              <span style={{ color: '#FF8800', letterSpacing: '1px' }}>{rv.stars}</span>
            </div>
            <p style={{ fontSize: '14.5px', color: '#5B5A7A', lineHeight: '1.8' }}>{rv.text}</p>
            <span className="muted" style={{ fontSize: '11.5px', borderTop: '1px solid #EEEDF5', paddingTop: '9px' }}>✓ {vm.t.profile.tmBadge} · {rv.when}</span>
          </div>
        </React.Fragment>
    ))}
    
      </div>
      
    {vm.prof.moreReviews ? (<><div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}><button className="btn btn-s btn-sm">{vm.t.profile.allReviews} <span className="num" style={{ opacity: '.6' }}>({vm.prof.reviewTotal})</span></button></div></>) : null}
    
    </section>
  </>);
}
