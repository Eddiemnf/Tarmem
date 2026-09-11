/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function ProjectPage({ vm }: { vm: VM }) {
  return (<>
    <section className="wrap fade" style={{ paddingBlock: '40px 80px' }}>
      
    {vm.agr.open ? (<>
        <div className="agrveil">
          <div className="agrbox">
            <div style={{ padding: '22px 26px 16px', borderBottom: '1px solid #EEEDF5' }}>
              <span className="kick">{vm.t.agr.kicker}</span>
              <h2 style={{ fontSize: '21px', color: '#1B1464', marginTop: '8px' }}>{vm.t.agr.title}</h2>
              <p className="muted" style={{ fontSize: '12.5px', marginTop: '6px' }}>{vm.t.agr.sub}</p>
            </div>
            <div className="agrbody" onScroll={vm.agrScroll}>
              <div>
                <span className="evlbl" style={{ display: 'block', marginBottom: '8px' }}>{vm.t.agr.partsTitle}</span>
                
      {((vm.agr.rows) || []).map((r: any, _i0: number) => (
        <React.Fragment key={_i0}>
                  <div className="agrrow"><span>{r.k}</span><span className="num" style={{ fontWeight: '600', color: '#1B1464' }}>{r.v}</span></div>
                </React.Fragment>
      ))}
      
              </div>
              <div>
                <span className="evlbl" style={{ display: 'block', marginBottom: '10px' }}>{vm.t.agr.secsTitle}</span>
                <ol className="agrsecs">
                  
      {((vm.agr.secs) || []).map((x: any, _i0: number) => (
        <React.Fragment key={_i0}><li>{x.label}</li></React.Fragment>
      ))}
      
                </ol>
              </div>
              <p className="muted" style={{ fontSize: '12.5px', lineHeight: '1.8', margin: '0' }}>{vm.t.agr.fullNote}</p>
            </div>
            <div style={{ padding: '16px 26px 20px', borderTop: '1px solid #EEEDF5', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
      {vm.agr.notRead ? (<><p className="muted" style={{ fontSize: '12px', margin: '0' }}>{vm.t.agr.scrollHint}</p></>) : null}
      
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-p" onClick={vm.signAgreement} disabled={vm.agr.notRead} style={{ padding: '13px 22px' }}>
                  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 10v12" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" /></svg>
                  {vm.agr.signLabel}
                </button>
                <button className="btn btn-s" onClick={vm.closeAgreement}>{vm.t.agr.cancel}</button>
                <a className="hlnk hlnk-i" href="assets/tarmem-services-agreement.pdf" target="_blank" rel="noopener" style={{ marginInlineStart: 'auto' }}>{vm.t.agr.openPdf} ↗</a>
              </div>
            </div>
          </div>
        </div>
      </>) : null}
    
      <a className="lnk" data-route={vm.backRoute} onClick={vm.go} style={{ fontSize: '13px', color: '#FF5A3C' }}>{vm.backArrow} {vm.t.nav.dashboard}</a>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap', marginTop: '16px' }}>
        <div><div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}><span className={`tag ${vm.pj.tagClass}`}>{vm.pj.statusLabel}</span><span className="muted" style={{ fontSize: '13px' }}>{vm.pj.tradeLabel} · {vm.pj.cityLabel}</span></div><h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464', marginTop: '10px' }}>{vm.pj.title}</h1></div>
        <div className="num" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', textAlign: 'end' }}><div><div className="muted" style={{ fontSize: '12px' }}>{vm.pj.amountLabel}</div><div style={{ fontSize: '30px', fontWeight: '600', color: '#1B1464', lineHeight: '1.1' }}>SAR {vm.pj.amount}</div></div>
    {vm.pj.showAddFunds ? (<><button className="btn btn-s btn-sm" data-route="wallet" onClick={vm.go}>{vm.t.wallet.addFunds}</button></>) : null}
    </div>
      </div>
      <div role="tablist" style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #E6E5F0', margin: '24px 0 32px', overflowX: 'auto' }}>
        
    {((vm.pTabs) || []).map((tb: any, _i0: number) => (
      <React.Fragment key={_i0}><span className="tab" role="tab" data-tab={tb.id} aria-selected={tb.sel} onClick={vm.setTab}>{tb.label}
      {tb.count ? (<> <span className="num" style={{ fontSize: '12px', color: '#7A7994', marginInlineStart: '4px' }}>{tb.count}</span></>) : null}
      </span></React.Fragment>
    ))}
    
      </div>

      
    {vm.tab.overview ? (<>
        
      {vm.agrPend.show ? (<>
          <div className="card" style={{ marginBottom: '24px', padding: '20px 22px', gap: '14px', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', borderColor: '#FFD9CB', background: '#FFF8F5' }}>
            <div>
              <span className="kick">{vm.t.agr.kicker}</span>
              <p style={{ fontSize: '14px', color: '#3A385C', margin: '6px 0 0', maxWidth: '60ch' }}>{vm.agrPend.text}</p>
            </div>
            
        {vm.agrPend.canSign ? (<><button className="btn btn-p btn-sm" onClick={vm.openAgreementCo}>{vm.t.agr.review}</button></>) : null}
        
          </div>
        </>) : null}
      
        
      {vm.agrCard.show ? (<>
          <div className="card" style={{ marginBottom: '24px', padding: '20px 22px', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
              <span className="kick">{vm.t.agr.signedTitle}</span>
              <a className="hlnk hlnk-i" href="assets/tarmem-services-agreement.pdf" target="_blank" rel="noopener" style={{ fontSize: '12.5px' }}>{vm.t.agr.openPdf} ↗</a>
            </div>
            <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '16px' }}>
              
        {((vm.agrCard.rows) || []).map((r: any, _i0: number) => (
          <React.Fragment key={_i0}>
                <div style={{ display: 'flex', gap: '11px', alignItems: 'flex-start' }}>
                  <span className="tag tag-g" style={{ flex: 'none' }}>✓</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '0' }}>
                    <span className="muted" style={{ fontSize: '11.5px' }}>{r.who}</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1B1464' }}>{r.name}</span>
                    <span className="muted num" style={{ fontSize: '11.5px' }}>{vm.t.agr.signedAt} {r.at}</span>
                  </span>
                </div>
              </React.Fragment>
        ))}
        
            </div>
          </div>
        </>) : null}
      
        
      {vm.pe.canWithdraw ? (<>
          <div className="card" style={{ marginBottom: '24px', padding: '20px 22px', gap: '12px', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <p className="muted" style={{ fontSize: '12.5px', margin: '0', maxWidth: '52ch', lineHeight: '1.7' }}>{vm.t.pedit.cancelNote}</p>
            
        {vm.pe.idle ? (<><button className="btn btn-s btn-sm" onClick={vm.askWithdraw}>{vm.t.pedit.cancel}</button></>) : null}
        
            
        {vm.pe.asking ? (<>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#1B1464' }}>{vm.t.pedit.cancelQ}</span>
                <button className="btn btn-p btn-sm" onClick={vm.doWithdraw}>{vm.t.pedit.cancelYes}</button>
                <button className="btn btn-s btn-sm" onClick={vm.keepProject}>{vm.t.pedit.keep}</button>
              </div>
            </>) : null}
        
          </div>
        </>) : null}
      
        
      {vm.pe.locked ? (<>
          <p className="muted" style={{ fontSize: '12px', margin: '0 0 20px' }}>{vm.t.pedit.locked}</p>
        </>) : null}
      
        
      {vm.rev.show ? (<>
          <div className="card" style={{ marginBottom: '24px', padding: '26px', gap: '16px', borderColor: '#FFD9CB', background: '#FFF8F5' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span className="kick" style={{ color: '#B26B00' }}>{vm.t.rev.pending}</span>
              <h3 style={{ fontSize: '19px', color: '#1B1464' }}>{vm.t.rev.title}</h3>
              <p className="muted" style={{ fontSize: '13px', lineHeight: '1.7', maxWidth: '60ch' }}>{vm.rev.sub}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <span className="lbl" style={{ margin: '0' }}>{vm.t.rev.stars}</span>
              <div className="stars">
                
        {((vm.rev.starList) || []).map((st: any, _i0: number) => (
          <React.Fragment key={_i0}>
                  <button className="starbtn" aria-pressed={st.on} data-n={st.n} onClick={vm.setStars}>★</button>
                </React.Fragment>
        ))}
        
              </div>
              <span className="muted" style={{ fontSize: '12.5px' }}>{vm.rev.hint}</span>
            </div>
            <div><label className="lbl">{vm.t.rev.comment}</label><textarea className="input" value={vm.rev.text} onChange={vm.setRevText} placeholder={vm.t.rev.commentPh} /></div>
            
        {vm.rev.error ? (<><p style={{ fontSize: '13px', color: '#D9401F' }}>{vm.rev.error}</p></>) : null}
        
            <div><button className="btn btn-p" onClick={vm.submitReview}>{vm.t.rev.submit}</button></div>
          </div>
        </>) : null}
      
        
      {vm.rev.done ? (<>
          <div className="card" style={{ marginBottom: '24px', padding: '22px', gap: '10px', borderColor: '#BFE4CC', background: '#F1FBF5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span className="fcheck" style={{ width: '26px', height: '26px', fontSize: '13px' }}>✓</span><span style={{ fontSize: '14px', fontWeight: '600', color: '#15703A' }}>{vm.t.rev.done}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ color: '#FF8800', letterSpacing: '1px' }}>{vm.rev.myStars}</span><span className="muted" style={{ fontSize: '13px' }}>{vm.rev.myText}</span></div>
          </div>
        </>) : null}
      
        <div className="gside" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: '24px', alignItems: 'start' }}>
          <div className="card" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '20px', color: '#1B1464' }}>{vm.t.ws.brief}</h3>
            <p style={{ color: '#5B5A7A' }}>{vm.pj.desc}</p>
            <table className="table" style={{ marginTop: '8px' }}><tbody>
              
      {vm.pj.showBudgetRow ? (<><tr><td className="muted">{vm.t.post.budget}</td><td className="num">SAR {vm.pj.budgetLabel}</td></tr></>) : null}
      
              <tr><td className="muted">{vm.t.post.timing}</td><td>{vm.pj.timingLabel}</td></tr>
              <tr><td className="muted">{vm.t.ws.posted}</td><td>{vm.pj.posted}</td></tr>
              <tr><td className="muted">{vm.t.roles.contractor}</td><td>{vm.pj.contractorName}</td></tr>
              <tr><td className="muted">{vm.t.hprofile.ownerOf}</td><td><a className="lnk" style={{ color: '#FF5A3C', fontWeight: '500' }} data-route="homeowner" data-id={vm.pj.ownerId} onClick={vm.go}>{vm.pj.ownerName} →</a></td></tr>
            </tbody></table>
          </div>
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="card"><span className="kick">{vm.t.progress}</span><div className="num" style={{ fontSize: '40px', fontWeight: '600', color: '#1B1464', lineHeight: '1' }}>{vm.pj.pct}%</div><div style={{ height: '6px', background: '#EEEDF5', borderRadius: '3px' }}><div style={{ height: '6px', borderRadius: '3px', background: 'linear-gradient(90deg,#FF8800,#FF4455)', width: `${vm.pj.pct}%` }}></div></div><span className="muted" style={{ fontSize: '12.5px' }}>{vm.pj.msSummary}</span></div>
            <div className="card" style={{ background: '#1B1464', color: '#fff', border: '0' }}><span className="kick" style={{ color: '#FF9A6B' }}>{vm.t.ws.nextStep}</span><p style={{ fontSize: '14.5px' }}>{vm.pj.nextStep}</p></div>
          </aside>
        </div>
      </>) : null}
    

      
    {vm.tab.bids ? (<>
        
      {vm.bidNeedsNafath ? (<>
          <div className="card" style={{ maxWidth: '560px', padding: '28px', gap: '16px', borderColor: '#FFD9CB', background: '#FFF8F5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span className="nafmark">نفاذ</span><span className="evlbl">{vm.t.auth.nafath}</span></div>
            <h3 style={{ fontSize: '20px', color: '#1B1464' }}>{vm.t.auth.gateCoTitle}</h3>
            <p style={{ fontSize: '13.5px', color: '#5B5A7A', lineHeight: '1.75' }}>{vm.t.auth.gateCoNote}</p>
            
        {vm.naf.idle ? (<><button className="btn btn-naf" onClick={vm.startNafath}><span className="nafmark">نفاذ</span>{vm.t.auth.nafathVerify}</button></>) : null}
        
            
        {vm.naf.wait ? (<>
              <div className="nafbox">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}><span className="evlbl">{vm.t.auth.nafath}</span><span className="nafdots"><i></i><i></i><i></i></span></div>
                <p style={{ fontSize: '13px', color: '#5B5A7A', lineHeight: '1.7' }}>{vm.t.auth.nafathStep}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}><span className="nafcode num">{vm.naf.code}</span><span className="muted" style={{ fontSize: '12.5px' }}>{vm.t.auth.nafathWait}</span></div>
              </div>
            </>) : null}
        
          </div>
        </>) : null}
      
        
      {vm.canBid ? (<>
          <div className="card" style={{ marginBottom: '28px', padding: '28px', gap: '16px' }}>
            <span className="kick">{vm.t.ws.submitBid}</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div><label className="lbl">{vm.t.ws.price}</label><input className="input" type="number" name="price" value={vm.bidF.price} onChange={vm.setBidField} placeholder="45000" /></div>
              <div><label className="lbl">{vm.t.ws.days}</label><input className="input" type="number" name="days" value={vm.bidF.days} onChange={vm.setBidField} placeholder="30" /></div>
            </div>
            <div><label className="lbl">{vm.t.ws.scopeNote}</label><textarea className="input" name="note" value={vm.bidF.note} onChange={vm.setBidField} placeholder={vm.t.ws.scopePh} /></div>
            
        {vm.bidF.error ? (<><p style={{ fontSize: '13px', color: '#D9401F' }}>{vm.bidF.error}</p></>) : null}
        
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}><span className="muted" style={{ fontSize: '12.5px' }}>{vm.t.ws.commissionNote}</span><button className="btn btn-p" onClick={vm.submitBid}>{vm.t.ws.sendBid}</button></div>
          </div>
        </>) : null}
      
        
      {vm.alreadyBid ? (<><p className="tag tag-g" style={{ marginBottom: '20px' }}>{vm.t.ws.alreadyBid}</p></>) : null}
      
        
      {vm.noBids ? (<><p className="muted">{vm.t.ws.noBids}</p></>) : null}
      
        
      {vm.hasBids ? (<>
          <div className="card" style={{ padding: '8px' }}>
          <table className="table"><thead><tr><th>{vm.t.roles.contractor}</th><th>{vm.t.ws.price}</th><th>{vm.t.ws.duration}</th><th>{vm.t.ws.scopeNote}</th><th></th></tr></thead>
            <tbody>
        {((vm.pj.bidRows) || []).map((b: any, _i0: number) => (
          <React.Fragment key={_i0}>
              <tr>
                <td><div data-route="contractor" data-id={b.cid} onClick={vm.go} style={{ cursor: 'pointer', fontWeight: '600', color: '#1B1464' }}>{b.name}</div><div className="muted num" style={{ fontSize: '12.5px' }}>★ {b.rating} · {b.done} {vm.t.projectsWord}
          {b.verified ? (<> · ✓ {vm.t.verified}</>) : null}
          </div></td>
                <td className="num" style={{ whiteSpace: 'nowrap', fontWeight: '600' }}>SAR {b.price}</td>
                <td className="num">{b.days} {vm.t.daysWord}</td>
                <td style={{ fontSize: '13.5px', color: '#5B5A7A', maxWidth: '320px' }}>{b.note}</td>
                <td style={{ textAlign: 'end', whiteSpace: 'nowrap' }}>
          {b.accepted ? (<><span className="tag tag-g">{vm.t.ws.accepted}</span></>) : null}
          
          {b.canAccept ? (<><button className="btn btn-p btn-sm" data-cid={b.cid} onClick={vm.acceptBid}>{vm.t.ws.accept}</button></>) : null}
          </td>
              </tr></React.Fragment>
        ))}
        </tbody></table>
          </div>
          <p className="muted" style={{ fontSize: '12.5px', marginTop: '14px' }}>{vm.t.ws.compareNote}</p>
        </>) : null}
      
      </>) : null}
    

      
    {vm.tab.milestones ? (<>
        
      {vm.noMs ? (<><p className="muted">{vm.t.ws.noMs}</p></>) : null}
      
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
      {((vm.pj.msRows) || []).map((m: any, _i0: number) => (
        <React.Fragment key={_i0}>
            <div className="card" style={{ gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '36px minmax(0,1fr) 150px', gap: '16px', alignItems: 'center' }}>
                <span className="num" style={{ width: '32px', height: '32px', borderRadius: '50%', border: `1.5px solid ${m.ring}`, background: m.fill, color: m.ink, display: 'grid', placeItems: 'center', fontSize: '13px', fontWeight: '600' }}>{m.n}</span>
                <div><div style={{ fontWeight: '600', color: '#1B1464' }}>{m.name}</div><div className="muted" style={{ fontSize: '12.5px' }}>{m.desc}</div></div>
                <div className="num" style={{ textAlign: 'end' }}><div style={{ fontWeight: '600' }}>SAR {m.amount}</div><span className={`tag ${m.tagClass}`}>{m.statusLabel}</span></div>
              </div>
              
        {m.showCoEv ? (<>
                <div className="evbar">
                  <span className="evlbl">{vm.t.ws.evTitle}</span>
                  <label className="evchip" aria-pressed={m.evP}><input type="file" accept="image/*" multiple style={{ display: 'none' }} data-i={m.i} data-k="p" onChange={vm.addEv} />{vm.t.ws.evPhoto} · {m.photoLabel}</label>
                  <label className="evchip" aria-pressed={m.evV}><input type="file" accept="video/*" style={{ display: 'none' }} data-i={m.i} data-k="v" onChange={vm.addEv} />{vm.t.ws.evVideo} · {m.videoLabel}</label>
                  <div style={{ display: 'flex', gap: '8px', marginInlineStart: 'auto' }}>
                    
          {m.canSubmit ? (<><button className="btn btn-p btn-sm" data-i={m.i} onClick={vm.submitMs}>{vm.t.ws.submitEvidence}</button></>) : null}
          
                    
          {m.submitBlocked ? (<><button className="btn btn-p btn-sm" disabled={true}>{vm.t.ws.submitEvidence}</button></>) : null}
          
                  </div>
                </div>
                
          {m.submitBlocked ? (<><p className="muted" style={{ fontSize: '12px' }}>{vm.t.ws.evNeed}</p></>) : null}
          
              </>) : null}
        
              
        {m.showOwnerEv ? (<>
                <div className="evbar">
                  <span className="evlbl">{vm.t.ws.evOwner}</span>
                  <label className="evchip" aria-pressed={m.evO}><input type="file" accept="image/*" style={{ display: 'none' }} data-i={m.i} data-k="o" onChange={vm.addEv} />{vm.t.ws.evPhoto} · {m.ownerLabel}</label>
                  <div style={{ display: 'flex', gap: '8px', marginInlineStart: 'auto', flexWrap: 'wrap' }}>
                    
          {m.canApprove ? (<><button className="btn btn-p btn-sm" data-i={m.i} onClick={vm.approveMs}>{vm.t.ws.approveRelease}</button></>) : null}
          
                    
          {m.approveBlocked ? (<><button className="btn btn-p btn-sm" disabled={true}>{vm.t.ws.approveRelease}</button></>) : null}
          
                    <button className="btn btn-s btn-sm" data-i={m.i} onClick={vm.disputeMs}>{vm.t.ws.raiseIssue}</button>
                  </div>
                </div>
                
          {m.approveBlocked ? (<><p className="muted" style={{ fontSize: '12px' }}>{vm.t.ws.evOwnerNeed}</p></>) : null}
          
              </>) : null}
        
              
        {m.showAuto ? (<>
                <div className="autobar"><span className="autodot"></span><span><strong style={{ fontWeight: '600', color: '#8A5A00' }}>{vm.t.auto.badge} {m.autoLabel}</strong> — {m.autoNote}</span></div>
              </>) : null}
        
              
        {m.lockedNote ? (<><p className="muted" style={{ fontSize: '12px' }}>{m.lockedNote}</p></>) : null}
        
              
        {m.canResolve ? (<><div><button className="btn btn-s btn-sm" data-i={m.i} onClick={vm.resolveMs}>{vm.t.ws.markResolved}</button></div></>) : null}
        
            </div>
          </React.Fragment>
      ))}
      
        </div>
        <p className="muted" style={{ fontSize: '12.5px', marginTop: '14px' }}>{vm.t.ws.msNote}</p>
      </>) : null}
    

      
    {vm.tab.messages ? (<>
        <div className="card" style={{ maxWidth: '760px', padding: '24px', gap: '14px' }}>
          
      {((vm.pj.msgRows) || []).map((m: any, _i0: number) => (
        <React.Fragment key={_i0}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: m.align, gap: '4px' }}><span className="muted" style={{ fontSize: '12px' }}>{m.who} · {m.time}</span><div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: '14px', background: m.bg, color: m.ink, fontSize: '14px' }}>{m.text}</div></div>
          </React.Fragment>
      ))}
      
          
      {vm.canMessage ? (<><div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}><input className="input" value={vm.msgDraft} onChange={vm.setMsgDraft} onKeyDown={vm.msgKey} placeholder={vm.t.ws.msgPh} /><button className="btn btn-p" onClick={vm.sendMsg}>{vm.t.ws.send}</button></div><p className="muted" style={{ fontSize: '11.5px' }}>{vm.t.ws.msgPolicy}</p></>) : null}
      
        </div>
      </>) : null}
    

      
    {vm.tab.files ? (<>
        <div className="card" style={{ padding: '8px' }}><table className="table"><thead><tr><th>{vm.t.ws.file}</th><th>{vm.t.ws.uploadedBy}</th><th>{vm.t.ws.date}</th></tr></thead>
          <tbody>
      {((vm.pj.files) || []).map((f: any, _i0: number) => (
        <React.Fragment key={_i0}><tr><td style={{ fontWeight: '500' }}>{f.name}</td><td>{f.by}</td><td className="muted">{f.date}</td></tr></React.Fragment>
      ))}
      </tbody></table></div>
        
      {vm.canMessage ? (<><label className="btn btn-s" style={{ marginTop: '20px' }}><input type="file" style={{ display: 'none' }} onChange={vm.wsUpload} />{vm.t.ws.upload}</label></>) : null}
      
      </>) : null}
    

      
    {vm.tab.payments ? (<>
        <div className="g3 num" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '16px', marginBottom: '28px' }}>
          
      {((vm.pj.payStats) || []).map((s: any, _i0: number) => (
        <React.Fragment key={_i0}><div className="card" style={{ gap: '4px' }}><div style={{ fontSize: '28px', fontWeight: '600', color: '#1B1464', lineHeight: '1.1' }}>SAR {s.v}</div><div className="muted" style={{ fontSize: '13px' }}>{s.l}</div></div></React.Fragment>
      ))}
      
        </div>
        
      {vm.fundNeedsNafath ? (<>
          <div className="card" style={{ maxWidth: '560px', padding: '28px', gap: '16px', borderColor: '#FFD9CB', background: '#FFF8F5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span className="nafmark">نفاذ</span><span className="evlbl">{vm.t.auth.nafath}</span></div>
            <h3 style={{ fontSize: '20px', color: '#1B1464' }}>{vm.t.auth.gateHoTitle}</h3>
            <p style={{ fontSize: '13.5px', color: '#5B5A7A', lineHeight: '1.75' }}>{vm.t.auth.gateHoNote}</p>
            
        {vm.naf.idle ? (<><button className="btn btn-naf" onClick={vm.startNafath}><span className="nafmark">نفاذ</span>{vm.t.auth.nafathVerify}</button></>) : null}
        
            
        {vm.naf.wait ? (<>
              <div className="nafbox">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}><span className="evlbl">{vm.t.auth.nafath}</span><span className="nafdots"><i></i><i></i><i></i></span></div>
                <p style={{ fontSize: '13px', color: '#5B5A7A', lineHeight: '1.7' }}>{vm.t.auth.nafathStep}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}><span className="nafcode num">{vm.naf.code}</span><span className="muted" style={{ fontSize: '12.5px' }}>{vm.t.auth.nafathWait}</span></div>
              </div>
            </>) : null}
        
          </div>
        </>) : null}
      
        
      {vm.needsFunding ? (<>
          <div className="card" style={{ maxWidth: '560px', padding: '28px', gap: '16px' }}>
            <span className="kick">{vm.t.ws.fundTitle}</span>
            <p style={{ fontSize: '14.5px', color: '#5B5A7A' }}>{vm.t.ws.fundDesc}</p>
            <div className="seg" style={{ alignSelf: 'flex-start' }}><label><input type="radio" name="pay" value="card" checked={vm.payIsCard} onChange={vm.setPay} />{vm.t.ws.card}</label><label><input type="radio" name="pay" value="apple" checked={vm.payIsApple} onChange={vm.setPay} />Apple Pay</label><label><input type="radio" name="pay" value="mada" checked={vm.payIsMada} onChange={vm.setPay} />mada</label></div>
            
        {vm.payIsCard ? (<><div><label className="lbl">{vm.t.ws.cardNumber}</label><input className="input" placeholder="•••• •••• •••• ••••" /></div></>) : null}
        
            <button className="btn btn-p num" onClick={vm.fundProject}>{vm.t.ws.fundBtn} SAR {vm.pj.amount}</button>
            <p className="muted" style={{ fontSize: '11.5px' }}>{vm.t.ws.fundNote}</p>
          </div>
        </>) : null}
      
        
      {vm.showLedger ? (<>
          <div className="card" style={{ padding: '8px' }}><h3 style={{ fontSize: '18px', color: '#1B1464', padding: '12px 12px 4px' }}>{vm.t.ws.ledger}</h3>
          <table className="table"><thead><tr><th>{vm.t.ws.date}</th><th>{vm.t.ws.entry}</th><th style={{ textAlign: 'end' }}>{vm.t.ws.amount}</th></tr></thead>
            <tbody>
        {((vm.pj.ledger) || []).map((l: any, _i0: number) => (
          <React.Fragment key={_i0}><tr><td className="muted">{l.date}</td><td>{l.label}</td><td className="num" style={{ textAlign: 'end', fontWeight: '600' }}>SAR {l.amount}</td></tr></React.Fragment>
        ))}
        </tbody></table></div>
        </>) : null}
      
      </>) : null}
    
    </section>
  </>);
}
