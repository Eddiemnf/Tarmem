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
        
    {vm.pjSk.show ? (<><div className="strikebar" data-n={vm.pjSk.n} style={{ margin: '0', flexBasis: '100%', padding: '16px 18px', gap: '8px' }}><div className="strikebar-t" style={{ fontSize: '14.5px' }}>{vm.pjSk.title}</div><p className="strikebar-s" style={{ fontSize: '12.5px' }}>{vm.pjSk.sub}</p></div></>) : null}
    
        <div className="num" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', textAlign: 'end' }}><div><div className="muted" style={{ fontSize: '12px' }}>{vm.pj.amountLabel}</div><div style={{ fontSize: '30px', fontWeight: '600', color: '#1B1464', lineHeight: '1.1' }}>{vm.curPre}{vm.pj.amount}{vm.curPost}</div></div>
    {vm.pj.showAddFunds ? (<>{vm.launch ? null : (<button className="btn btn-s btn-sm" data-route="wallet" onClick={vm.go}>{vm.t.wallet.addFunds}</button>)}</>) : null}
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
              
      {vm.pj.showBudgetRow ? (<><tr><td className="muted">{vm.t.post.budget}</td><td className="num">{vm.pj.budgetFull}</td></tr></>) : null}
      
              <tr><td className="muted">{vm.t.post.timing}</td><td>{vm.pj.timingLabel}</td></tr>
              <tr><td className="muted">{vm.t.ws.posted}</td><td>{vm.pj.posted}</td></tr>
              <tr><td className="muted">{vm.t.roles.contractor}</td><td>{vm.pj.contractorName}</td></tr>
              <tr><td className="muted">{vm.t.hprofile.ownerOf}</td><td>{vm.launch ? null : (<a className="lnk" style={{ color: '#FF5A3C', fontWeight: '500' }} data-route="homeowner" data-id={vm.pj.ownerId} onClick={vm.go}>{vm.pj.ownerName}</a>)}</td></tr>
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

            
        {vm.bidF.editing ? (<>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div><label className="lbl" htmlFor="bid-price">{vm.t.ws.price}</label><input id="bid-price" className="input" type="number" name="price" value={vm.bidF.price} onChange={vm.setBidField} placeholder="45000" /></div>
                  <div><label className="lbl" htmlFor="bid-days">{vm.t.ws.days}</label><input id="bid-days" className="input" type="number" name="days" value={vm.bidF.days} onChange={vm.setBidField} placeholder="30" /></div>
                </div>

                <label className="radio" style={{ gap: '10px' }}><input type="checkbox" name="vatReg" checked={vm.bidF.vatReg} onChange={vm.setBidToggle} /><span className="dot" style={{ borderRadius: '5px' }}></span><span style={{ fontSize: '13.5px' }}>{vm.t.ws.vatReg}</span></label>

                <div style={{ background: '#F7F6FC', borderRadius: '12px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '13.5px' }}><span>{vm.t.ws.price}</span><span className="num" style={{ fontWeight: '600', color: '#1B1464' }}>{vm.curPre}{vm.bidF.net}{vm.curPost}</span></div>
                  
          {vm.bidF.vatReg ? (<><div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '13.5px' }}><span>{vm.t.ws.bidVatOn}</span><span className="num" style={{ fontWeight: '600', color: '#1B1464' }}>{vm.curPre}{vm.bidF.vat}{vm.curPost}</span></div></>) : null}
          
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '14.5px', borderTop: '1px solid #E2E0EE', paddingTop: '8px' }}><span style={{ fontWeight: '600', color: '#1B1464' }}>{vm.t.ws.bidGross}</span><span className="num" style={{ fontWeight: '600', color: '#1B1464' }}>{vm.curPre}{vm.bidF.gross}{vm.curPost}</span></div>
                  
          {vm.bidF.noVat ? (<><p className="muted" style={{ fontSize: '11.5px', lineHeight: '1.7', margin: '0' }}>{vm.t.ws.bidNoVat}</p></>) : null}
          
                  
          {vm.bidF.overBudget ? (<><p style={{ fontSize: '12px', lineHeight: '1.7', margin: '0', color: '#8A5A00' }}>{vm.t.ws.bidOverBudget}</p></>) : null}
          
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div><label className="lbl" htmlFor="bid-start">{vm.t.ws.fStart}</label><input id="bid-start" className="input" type="date" name="start" value={vm.bidF.start} onChange={vm.setBidField} /></div>
                  <div><label className="lbl" htmlFor="bid-valid">{vm.t.ws.fValid}</label><select id="bid-valid" className="input" name="valid" value={vm.bidF.valid} onChange={vm.setBidField}><option value="">{vm.t.ws.choose}</option>
          {((vm.bidF.validOpts) || []).map((o: any, _i0: number) => (
            <React.Fragment key={_i0}><option value={o}>{o}</option></React.Fragment>
          ))}
          </select></div>
                </div>

                <div><label className="lbl" htmlFor="bid-incl">{vm.t.ws.fIncl}</label><textarea id="bid-incl" className="input" name="incl" value={vm.bidF.incl} onChange={vm.setBidField} placeholder={vm.t.ws.fInclPh} /></div>
                <div><label className="lbl" htmlFor="bid-excl">{vm.t.ws.fExcl}</label><textarea id="bid-excl" className="input" name="excl" value={vm.bidF.excl} onChange={vm.setBidField} placeholder={vm.t.ws.fExclPh} /></div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div><label className="lbl" htmlFor="bid-brands">{vm.t.ws.fBrands}</label><input id="bid-brands" className="input" name="brands" value={vm.bidF.brands} onChange={vm.setBidField} placeholder={vm.t.ws.fBrandsPh} /></div>
                  <div><label className="lbl" htmlFor="bid-warr">{vm.t.ws.fWarranty}</label><select id="bid-warr" className="input" name="warranty" value={vm.bidF.warranty} onChange={vm.setBidField}><option value="">{vm.t.ws.choose}</option>
          {((vm.bidF.warrantyOpts) || []).map((o: any, _i0: number) => (
            <React.Fragment key={_i0}><option value={o}>{o}</option></React.Fragment>
          ))}
          </select></div>
                </div>

                <div>
                  <label className="lbl">{vm.t.ws.fMs}</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                    
          {((vm.bidF.msRows) || []).map((m: any, _i0: number) => (
            <React.Fragment key={_i0}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}><span className="muted" style={{ fontSize: '12px' }}>{m.label}</span><input className="input num" type="number" name={m.name} value={m.value} onChange={vm.setBidField} /></div>
                    </React.Fragment>
          ))}
          
                  </div>
                  <span className="muted" style={{ fontSize: '11.5px', display: 'block', marginTop: '6px', color: vm.bidF.msColor }}>{vm.bidF.msNote}</span>
                </div>

                <div><label className="lbl" htmlFor="bid-note">{vm.t.ws.scopeNote}</label><textarea id="bid-note" className="input" name="note" value={vm.bidF.note} onChange={vm.setBidField} placeholder={vm.t.ws.scopePh} /></div>

                <label className="radio" style={{ gap: '10px', alignItems: 'flex-start' }}><input type="checkbox" name="visit" checked={vm.bidF.visit} onChange={vm.setBidToggle} /><span className="dot" style={{ borderRadius: '5px', marginTop: '2px' }}></span><span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600', color: '#1B1464' }}>{vm.t.ws.fVisit}</span><span className="muted" style={{ fontSize: '12px', lineHeight: '1.6' }}>{vm.t.ws.fVisitNote}</span></span></label>

                
          {vm.bidF.error ? (<><p style={{ fontSize: '13px', color: '#D9401F' }}>{vm.bidF.error}</p></>) : null}
          
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}><span className="muted" style={{ fontSize: '12.5px', lineHeight: '1.7', maxWidth: '60ch' }}>{vm.t.ws.commissionNote}</span><button className="btn btn-p" onClick={vm.reviewBid}>{vm.t.ws.sendBid}</button></div>
              </div>
            </>) : null}
        

            
        {vm.bidF.reviewing ? (<>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '18px', color: '#1B1464' }}>{vm.t.ws.bidReview}</h3>
                <div style={{ background: '#F7F6FC', borderRadius: '12px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
                  
          {((vm.bidF.summary) || []).map((r: any, _i0: number) => (
            <React.Fragment key={_i0}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '13.5px', lineHeight: '1.65' }}><span className="muted">{r.k}</span><span style={{ fontWeight: '500', color: '#1B1464', textAlign: 'end' }}>{r.v}</span></div>
                  </React.Fragment>
          ))}
          
                </div>
                <div style={{ border: '1px solid #CFE8D9', background: '#F1FBF5', borderRadius: '12px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '14.5px' }}><span style={{ fontWeight: '600', color: '#15703A' }}>{vm.t.ws.bidNet}</span><span className="num" style={{ fontWeight: '600', color: '#15703A' }}>{vm.curPre}{vm.bidF.expectedNet}{vm.curPost}</span></div>
                  <span style={{ fontSize: '11.5px', lineHeight: '1.7', color: '#15703A' }}>{vm.t.ws.bidNetNote}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button className="btn btn-p" onClick={vm.submitBid}>{vm.t.ws.sendFinal}</button>
                  <button className="btn btn-s" onClick={vm.editBid}>{vm.t.ws.bidBack}</button>
                </div>
              </div>
            </>) : null}
        
          </div>
        </>) : null}
      
        
      {vm.alreadyBid ? (<><p className="tag tag-g" style={{ marginBottom: '20px' }}>{vm.t.ws.alreadyBid}</p></>) : null}
      
        
      {vm.noBidsHo ? (<><p className="muted">{vm.t.ws.noBids}</p></>) : null}
      
        
      {vm.hasBids ? (<>
          <div className="card" style={{ padding: '8px' }}>
          <table className="table"><thead><tr><th>{vm.t.ws.hContractor}</th><th>{vm.t.ws.price}</th><th>{vm.t.ws.duration}</th><th>{vm.t.ws.scopeNote}</th><th></th></tr></thead>
            <tbody>
        {((vm.pj.bidRows) || []).map((b: any, _i0: number) => (
          <React.Fragment key={_i0}>
              <tr>
                <td><div data-route="contractor" data-id={b.cid} onClick={vm.go} style={{ cursor: 'pointer', fontWeight: '600', color: '#1B1464' }}>{b.name}</div><div className="muted num" style={{ fontSize: '12.5px' }}>★ {b.rating} · {b.done} {vm.t.projectsWord}
          {b.verified ? (<> · <span className="tag tag-v" style={{ fontSize: '10.5px', padding: '2px 7px', verticalAlign: '1px' }}>✓ {vm.t.verified}</span></>) : null}
          </div></td>
                <td className="num" style={{ whiteSpace: 'nowrap', fontWeight: '600' }}>{vm.curPre}{b.price}{vm.curPost}</td>
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
          <p className="muted" style={{ fontSize: '12.5px', marginTop: '14px' }}>{vm.pj.compareNote}</p>
        </>) : null}
      
      </>) : null}
    

      
    {vm.tab.milestones ? (<>
        
      {vm.lateCase ? (<>
          <div className="decide" role="region" aria-labelledby="decide-title">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div>
                <span className="strike"><i className="on"></i><i className="on"></i><i className="on"></i> {vm.t.pen.strike3}</span>
                <h3 id="decide-title" style={{ fontSize: '20px', color: '#1B1464', marginTop: '8px' }}>{vm.t.pen.hoTitle}</h3>
              </div>
              <span className={`tag ${vm.lateStCls}`}>{vm.lateStL}</span>
            </div>
            
        {vm.lateOpen ? (<>
              <p style={{ fontSize: '14px', color: '#3A385C', lineHeight: '1.75' }}>{vm.t.pen.hoBody}</p>
              <div className="decide-opts">
                <button className="decide-opt" type="button" data-d="continue" aria-pressed={vm.latePickCont} onClick={vm.latePick}><b>{vm.t.pen.hoCont}</b><span>{vm.t.pen.hoContSub}</span></button>
                <button className="decide-opt" type="button" data-d="cancel" aria-pressed={vm.latePickCancel} onClick={vm.latePick}><b>{vm.t.pen.hoCancel}</b><span>{vm.t.pen.hoCancelSub} <b className="num" style={{ fontSize: '12.5px' }}>{vm.curPre}{vm.lateEscrow}{vm.curPost}</b> {vm.t.pen.hoCancelSub2}</span></button>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}><button className="btn btn-p" disabled={vm.lateNoPick} onClick={vm.lateConfirm}>{vm.t.pen.confirm}</button></div>
            </>) : null}
        
            
        {vm.lateDone ? (<>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: '#fff', border: '1px solid #E6E5F0', borderRadius: '12px', padding: '14px 16px' }}>
                <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: '#E8F7EE', color: '#1B7A3E', display: 'grid', placeItems: 'center', flex: 'none', fontWeight: '700' }}>✓</span>
                <div><b style={{ fontSize: '14px', color: '#1B1464' }}>{vm.t.pen.hoDone}</b><p style={{ fontSize: '13.5px', color: '#5B5A7A', lineHeight: '1.7', marginTop: '4px' }}>{vm.lateDoneText}</p></div>
              </div>
            </>) : null}
        
          </div>
        </>) : null}
      
        
      {vm.noMs ? (<><p className="muted">{vm.t.ws.noMs}</p></>) : null}
      
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
      {((vm.pj.msRows) || []).map((m: any, _i0: number) => (
        <React.Fragment key={_i0}>
            <div className="card" style={{ gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '36px minmax(0,1fr) 150px', gap: '16px', alignItems: 'center' }}>
                <span className="num" style={{ width: '32px', height: '32px', borderRadius: '50%', border: `1.5px solid ${m.ring}`, background: m.fill, color: m.ink, display: 'grid', placeItems: 'center', fontSize: '13px', fontWeight: '600' }}>{m.n}</span>
                <div><div style={{ fontWeight: '600', color: '#1B1464', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>{m.name}
        {m.dueL ? (<><span className={`due ${m.dueCls}`}>{m.dueL}</span></>) : null}
        </div><div className="muted" style={{ fontSize: '12.5px' }}>{m.desc}</div></div>
                <div className="num" style={{ textAlign: 'end' }}><div style={{ fontWeight: '600' }}>{vm.curPre}{m.amount}{vm.curPost}</div><span className={`tag ${m.tagClass}`}>{m.statusLabel}</span></div>
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
        
              
        {m.showBrkHo ? (<>
                <div className="num" style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px', padding: '12px 14px', border: '1px solid #EEEDF5', borderRadius: '12px', background: '#FBFBFE' }}>
                  <span className="evlbl">{vm.t.ws.brkHo}</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">{vm.t.ws.brkWork}</span><span>{vm.curPre}{m.bWork}{vm.curPost}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">{vm.t.ws.brkFee}</span><span>+ {vm.curPre}{m.bFee}{vm.curPost}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">{vm.t.ws.brkFeeVat}</span><span>+ {vm.curPre}{m.bFeeVat}{vm.curPost}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', color: '#1B1464', paddingTop: '6px', borderTop: '1px solid #EEEDF5' }}><span>{vm.t.ws.brkHoTotal}</span><span>{vm.curPre}{m.bHoTotal}{vm.curPost}</span></div>
                  <span className="muted" style={{ fontSize: '11.5px' }}>{vm.t.ws.brkNote}</span>
                </div>
              </>) : null}
        
              
        {m.showBrkCo ? (<>
                <div className="num" style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '13px', padding: '12px 14px', border: '1px solid #EEEDF5', borderRadius: '12px', background: '#FBFBFE' }}>
                  <span className="evlbl">{vm.t.ws.brkCo}</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">{vm.t.ws.brkWork}</span><span>{vm.curPre}{m.bWork}{vm.curPost}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">{vm.t.ws.brkComm}</span><span style={{ color: '#8A5A00' }}>− {vm.curPre}{m.bComm}{vm.curPost}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">{vm.t.ws.brkCoGross}</span><span style={{ fontWeight: '600', color: '#1B1464' }}>{vm.curPre}{m.bCoGross}{vm.curPost}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">{vm.t.ws.brkCommVat}</span><span style={{ color: '#8A5A00' }}>− {vm.curPre}{m.bCommVat}{vm.curPost}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', color: '#15703A', paddingTop: '6px', borderTop: '1px solid #EEEDF5' }}><span>{vm.t.ws.brkCoNet}</span><span>{vm.curPre}{m.bCoNet}{vm.curPost}</span></div>
                  <span className="muted" style={{ fontSize: '11.5px' }}>{vm.t.ws.brkNote}</span>
                </div>
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
        <p className="muted" style={{ fontSize: '12.5px', marginTop: '14px' }}>{vm.pj.msNote}</p>
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
    

      
    {vm.tab.changes ? (<>
        <div style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <h3 style={{ fontSize: '20px', color: '#1B1464' }}>{vm.t.ws.cr.title}</h3>
            <p className="muted" style={{ fontSize: '13.5px', lineHeight: '1.75', marginTop: '6px' }}>{vm.t.ws.cr.sub}</p>
          </div>
          
      {vm.pj.crLocked ? (<><p className="muted" style={{ fontSize: '13.5px' }}>{vm.t.ws.cr.locked}</p></>) : null}
      
          
      {vm.pj.crCanCreate ? (<>
            <div><button className="btn btn-p btn-sm" onClick={vm.crToggle}>{vm.t.ws.cr.create}</button></div>
          </>) : null}
      
          
      {vm.crOpen ? (<>
            <div className="card" style={{ padding: '26px', gap: '16px' }}>
              <div><label className="lbl">{vm.t.ws.cr.fDesc}<span style={{ color: '#D9401F', marginInlineStart: '3px' }}>*</span></label><textarea className="input" name="desc" value={vm.crF.desc} onChange={vm.crSet} placeholder={vm.t.ws.cr.fDescPh} /></div>
              <div className="g2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div><label className="lbl">{vm.t.ws.cr.fAmount}</label><input className="input num" type="number" name="amount" value={vm.crF.amount} onChange={vm.crSet} placeholder="0" /><span className="muted" style={{ fontSize: '11.5px', display: 'block', marginTop: '5px' }}>{vm.t.ws.cr.fAmountNote}</span></div>
                <div><label className="lbl">{vm.t.ws.cr.fDays}</label><input className="input num" type="number" name="days" value={vm.crF.days} onChange={vm.crSet} placeholder="0" /></div>
              </div>
              
        {vm.crError ? (<><p className="autherr">{vm.crError}</p></>) : null}
        
              <p className="muted" style={{ fontSize: '11.5px', lineHeight: '1.7', margin: '0' }}>{vm.t.ws.cr.note}</p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn btn-p btn-sm" onClick={vm.crSubmit}>{vm.t.ws.cr.submit}</button>
                <button className="btn btn-s btn-sm" onClick={vm.crToggle}>{vm.t.ws.cr.cancel}</button>
              </div>
            </div>
          </>) : null}
      
          
      {vm.pj.crNone ? (<><p className="muted" style={{ fontSize: '13.5px' }}>{vm.t.ws.cr.none}</p></>) : null}
      
          
      {((vm.pj.crRows) || []).map((c: any, _i0: number) => (
        <React.Fragment key={_i0}>
            <div className="card" style={{ padding: '24px', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <span className="muted" style={{ fontSize: '12px' }}>{vm.t.ws.cr.by} · {c.byLabel}</span>
                <span className={`tag ${c.statusCls}`}>{c.statusLabel}</span>
              </div>
              <p style={{ fontSize: '14.5px', lineHeight: '1.75', color: '#1B1464' }}>{c.desc}</p>
              <div style={{ display: 'flex', gap: '26px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid #EEEDF5' }}>
                <div><div className="muted" style={{ fontSize: '11.5px' }}>{vm.t.ws.cr.amount}</div><div className="num" style={{ fontSize: '16px', fontWeight: '600', color: c.amountColor }}>{c.amountLabel}</div></div>
                
        {c.showDays ? (<><div><div className="muted" style={{ fontSize: '11.5px' }}>{vm.t.ws.cr.days}</div><div className="num" style={{ fontSize: '16px', fontWeight: '600', color: '#1B1464' }}>{c.daysLabel}</div></div></>) : null}
        
                <div><div className="muted" style={{ fontSize: '11.5px' }}>{vm.t.ws.cr.newTotal}</div><div className="num" style={{ fontSize: '16px', fontWeight: '600', color: '#1B1464' }}>{c.totalLabel}</div></div>
              </div>
              
        {c.canApprove ? (<><div><button className="btn btn-p btn-sm" data-id={c.id} onClick={vm.crApprove}>{vm.t.ws.cr.approve}</button></div></>) : null}
        
            </div>
          </React.Fragment>
      ))}
      
        </div>
      </>) : null}
    
      
    {vm.tab.payments ? (<>
        <div className="g3 num" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '16px', marginBottom: '28px' }}>
          
      {((vm.pj.payStats) || []).map((s: any, _i0: number) => (
        <React.Fragment key={_i0}><div className="card" style={{ gap: '4px' }}><div style={{ fontSize: '28px', fontWeight: '600', color: '#1B1464', lineHeight: '1.1' }}>{vm.curPre}{s.v}{vm.curPost}</div><div className="muted" style={{ fontSize: '13px' }}>{s.l}</div></div></React.Fragment>
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
        
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13.5px', borderTop: '1px solid #EEEDF5', paddingTop: '12px' }} className="num">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">{vm.pj.amountLabel}</span><span>{vm.curPre}{vm.pj.amount}{vm.curPost}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', color: '#1B1464', fontSize: '15px', paddingTop: '6px', borderTop: '1px solid #EEEDF5' }}><span>{vm.t.vat.total}</span><span>{vm.curPre}{vm.pj.fundTotal}{vm.curPost}</span></div>
            </div>
            <button className="btn btn-p num" onClick={vm.fundProject}>{vm.t.ws.fundBtn} {vm.curPre}{vm.pj.fundTotal}{vm.curPost}</button>
            <p className="muted" style={{ fontSize: '11.5px' }}>{vm.t.ws.fundFeesNote} {vm.t.ws.fundNote}</p>
          </div>
        </>) : null}
      
        
      {vm.showLedger ? (<>
          <div className="card" style={{ padding: '8px' }}><h3 style={{ fontSize: '18px', color: '#1B1464', padding: '12px 12px 4px' }}>{vm.t.ws.ledger}</h3>
          <table className="table"><thead><tr><th>{vm.t.ws.date}</th><th>{vm.t.ws.entry}</th><th>{vm.t.ws.lgRef}</th><th>{vm.t.ws.lgStatus}</th><th style={{ textAlign: 'end' }}>{vm.t.ws.amount}</th></tr></thead>
            <tbody>
        {((vm.pj.ledger) || []).map((l: any, _i0: number) => (
          <React.Fragment key={_i0}><tr>
              <td className="muted" style={{ whiteSpace: 'nowrap' }}>{l.date}</td>
              <td>
                <div style={{ color: '#1B1464' }}>{l.label}</div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '5px' }}>
                  <button className="lnkbtn" style={{ fontSize: '12px' }} data-li={l.li} data-kind="receipt" onClick={vm.openInv}>{vm.t.ws.lgReceipt}</button>
                  
          {l.isFeeInv ? (<><button className="lnkbtn" style={{ fontSize: '12px' }} data-li={l.li} data-kind="tax" onClick={vm.openInv}>{vm.t.ws.lgInvoice}</button></>) : null}
          
                  
          {l.isWorkInv ? (<><button className="lnkbtn" style={{ fontSize: '12px' }} data-li={l.li} data-kind="work" onClick={vm.openInv}>{vm.t.ws.lgWorkInv}</button></>) : null}
          
                </div>
              </td>
              <td className="num muted" style={{ fontSize: '12.5px', whiteSpace: 'nowrap', unicodeBidi: 'normal', textAlign: 'start' }}>{l.ref}</td>
              <td><span className={`tag ${l.stCls}`}>{l.stL}</span></td>
              <td className="num" style={{ textAlign: 'end', fontWeight: '600', whiteSpace: 'nowrap' }}>{vm.curPre}{l.amount}{vm.curPost}</td>
            </tr></React.Fragment>
        ))}
        </tbody></table></div>
          
        {vm.inv.open ? (<>
            <div className="inv" style={{ marginTop: '16px' }}>
              <div className="inv-h">
                <div><span className="kick">{vm.inv.title}</span><h3 style={{ fontSize: '20px', color: '#1B1464', marginTop: '6px' }} className="num">{vm.inv.no}</h3><span className="muted num" style={{ fontSize: '12.5px' }}>{vm.t.vat.issued} {vm.inv.date}</span></div>
                <div className="inv-qr" aria-hidden="true"></div>
              </div>
              <div className="inv-grid">
                <div><b>{vm.t.vat.seller}</b>{vm.inv.issuer}
          {vm.inv.showVat ? (<><br />{vm.t.vat.sellerAddr}<br /><span className="num">{vm.t.vat.vatNo}: {vm.t.vat.sellerVat}</span></>) : null}
          </div>
                <div><b>{vm.t.vat.buyer}</b>{vm.inv.buyer}<br />{vm.inv.project}</div>
              </div>
              <table className="table num" style={{ fontSize: '13.5px' }}><thead><tr><th>{vm.t.vat.item}</th><th style={{ textAlign: 'end' }}>{vm.curLbl}</th></tr></thead>
                <tbody><tr><td>{vm.inv.item}</td><td style={{ textAlign: 'end' }}>{vm.inv.net}</td></tr>
          {vm.inv.showVat ? (<><tr><td className="muted">{vm.t.vat.label}</td><td style={{ textAlign: 'end' }}>{vm.inv.vat}</td></tr></>) : null}
          <tr><td style={{ fontWeight: '600', color: '#1B1464' }}>{vm.t.vat.total}</td><td style={{ textAlign: 'end', fontWeight: '600', color: '#1B1464' }}>{vm.inv.total}</td></tr></tbody></table>
              
          {vm.inv.note ? (<><p className="muted" style={{ fontSize: '11.5px', lineHeight: '1.7', margin: '0' }}>{vm.inv.note}</p></>) : null}
          
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          {vm.inv.showVat ? (<><span className="muted" style={{ fontSize: '11.5px' }}>{vm.t.vat.zatca}</span></>) : null}
          <div style={{ display: 'flex', gap: '8px', marginInlineStart: 'auto' }}><button className="btn btn-s btn-sm" onClick={vm.printInv}>{vm.t.vat.download}</button><button className="btn btn-g btn-sm" onClick={vm.closeInv}>✕</button></div></div>
            </div>
          </>) : null}
        
        </>) : null}
      
      </>) : null}
    
    </section>
  </>);
}
