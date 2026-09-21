/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function ContractorDashboardPage({ vm }: { vm: VM }) {
  return (<>
    <section className="wrap fade" style={{ paddingBlock: '40px 80px' }}>
      
    {vm.coNeedsNafath ? (<>
        <div className="card" style={{ marginBottom: '28px', padding: '22px 24px', gap: '14px', borderColor: '#FFD9CB', background: '#FFF8F5', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '60ch' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span className="nafmark">نفاذ</span><span style={{ fontSize: '15px', fontWeight: '600', color: '#1B1464' }}>{vm.t.auth.gateCoTitle}</span></div>
            <p className="muted" style={{ fontSize: '12.5px', lineHeight: '1.7' }}>{vm.t.auth.gateCoNote}</p>
          </div>
          
      {vm.naf.idle ? (<><button className="btn btn-naf" onClick={vm.startNafath}><span className="nafmark">نفاذ</span>{vm.t.auth.nafathVerify}</button></>) : null}
      
          
      {vm.naf.wait ? (<><div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><span className="nafcode num">{vm.naf.code}</span><span className="nafdots"><i></i><i></i><i></i></span></div></>) : null}
      
        </div>
      </>) : null}
    
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', flexWrap: 'wrap', gap: '16px' }}>
        <div><span className="kick">{vm.t.cdash.kicker}</span><h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464', marginTop: '8px' }}>{vm.user.name}</h1></div>
        {vm.launch && !vm.accounts ? null : (<button className="btn btn-p" data-route="browse" onClick={vm.go}>{vm.t.nav.browse}</button>)}
      </div>
      <div className="qa">
        {vm.launch && !vm.accounts ? null : (<button type="button" className="qa-t" data-route="browse" onClick={vm.go}>
          <span className="qa-i" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="6.4" /><path d="M20 20l-4.4-4.4" /></svg></span>
          <span><span className="qa-n" style={{ display: 'block' }}>{vm.t.cdash.qaBrowse}</span><span className="qa-s" style={{ display: 'block' }}>{vm.t.cdash.qaBrowseSub}</span></span>
          
    {vm.qaOpenN ? (<><span className="qa-b">{vm.qaOpenN}</span></>) : null}
    
        </button>)}
        <button type="button" className="qa-t" onClick={vm.qaToWork}>
          <span className="qa-i" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7.4" width="18" height="12.6" rx="2.4" /><path d="M9 7.4V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.4" /><path d="M3 12.4h18" /></svg></span>
          <span><span className="qa-n" style={{ display: 'block' }}>{vm.t.cdash.qaWork}</span><span className="qa-s" style={{ display: 'block' }}>{vm.t.cdash.qaWorkSub}</span></span>
          
    {vm.qaWorkN ? (<><span className="qa-b">{vm.qaWorkN}</span></>) : null}
    
        </button>
        {vm.launch ? null : (<button type="button" className="qa-t" data-route="contractor" data-id="c1" onClick={vm.go}>
          <span className="qa-i" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 19.4v-1.2A3.8 3.8 0 0 1 8.8 14.4h6.4A3.8 3.8 0 0 1 19 18.2v1.2" /><circle cx="12" cy="8" r="3.4" /></svg></span>
          <span><span className="qa-n" style={{ display: 'block' }}>{vm.t.cdash.qaProfile}</span><span className="qa-s" style={{ display: 'block' }}>{vm.t.cdash.qaProfileSub}</span></span>
        </button>)}
        {vm.launch ? null : (<button type="button" className="qa-t" data-route="wallet" onClick={vm.go}>
          <span className="qa-i" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="13" rx="2.6" /><path d="M3 10.5h18" /><path d="M16.5 14.8h2" /></svg></span>
          <span><span className="qa-n" style={{ display: 'block' }}>{vm.t.cdash.qaWallet}</span><span className="qa-s" style={{ display: 'block' }}>{vm.t.cdash.qaWalletSub}</span></span>
        </button>)}
      </div>
      <div className="strikebar" data-n={vm.sk.n} role="status" aria-live="polite">
        <div className="strikebar-head">
          <div className="strikebar-t">{vm.sk.title}</div>
          
    {vm.sk.hasDue ? (<><span className={`due ${vm.sk.dueCls}`}>{vm.sk.dueL}</span></>) : null}
    
        </div>
        <p className="strikebar-s">{vm.sk.sub}</p>
        <div className="strikebar-cta">
          
    {vm.sk.hasProject ? (<>
            <button className="btn btn-p btn-sm" data-route="project" data-id={vm.sk.pid} onClick={vm.go}>{vm.t.strikes.aProof}</button>
            <button className="btn btn-g btn-sm" data-route="project" data-id={vm.sk.pid} onClick={vm.go}>{vm.t.strikes.aExt}</button>
            <button className="btn btn-g btn-sm" data-route="project" data-id={vm.sk.pid} onClick={vm.go}>{vm.t.strikes.aBlock}</button>
          </>) : null}
    
          <a className="lnkbtn" style={{ fontSize: '12px' }} data-route="rules" onClick={vm.go}>{vm.t.strikes.how}</a>
        </div>
      </div>
      <div className="statstrip num">
        
    {((vm.cStats) || []).map((s: any, _i0: number) => (
      <React.Fragment key={_i0}><div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '0' }}><div style={{ fontSize: '22px', fontWeight: '600', color: '#1B1464', lineHeight: '1.15', whiteSpace: 'nowrap' }}>{s.v}</div><div className="muted" style={{ fontSize: '12.5px' }}>{s.l}</div></div></React.Fragment>
    ))}
    
      </div>
      <div className="gside" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: '24px', alignItems: 'start' }}>
        <div className="card" id="cdash-work" style={{ padding: '8px 8px 4px' }}>
          <h3 style={{ fontSize: '18px', color: '#1B1464', padding: '12px 12px 4px' }}>{vm.t.cdash.myWork}</h3>
          <table className="table"><thead><tr><th>{vm.t.project}</th><th>{vm.t.status}</th><th>{vm.t.cdash.myBid}</th><th>{vm.t.cdash.nextMilestone}</th></tr></thead>
            <tbody>
    {((vm.cProjects) || []).map((p: any, _i0: number) => (
      <React.Fragment key={_i0}>
              <tr className="row-h" style={{ cursor: 'pointer' }} data-route="project" data-id={p.id} onClick={vm.go}>
                <td><div style={{ fontWeight: '600', color: '#1B1464' }}>{p.title}</div><div className="muted" style={{ fontSize: '12.5px' }}>{p.cityLabel}</div></td>
                <td><span className={`tag ${p.tagClass}`}>{p.statusLabel}</span></td>
                <td className="num">{p.myBidLabel}</td>
                <td style={{ fontSize: '13.5px' }}>{p.nextMs}</td>
              </tr></React.Fragment>
    ))}
    </tbody></table>
        </div>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card"><span className="kick">{vm.t.cdash.payments}</span>
            
    {((vm.cPayments) || []).map((p: any, _i0: number) => (
      <React.Fragment key={_i0}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 0', borderBottom: '1px solid #EEEDF5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '13.5px' }}><span>{p.label}</span><span className="num" style={{ fontWeight: '600', color: p.color }}>{vm.curPre}{p.amount}{vm.curPost}</span></div>
                <a className="lnkbtn" style={{ fontSize: '11.5px', alignSelf: 'flex-start' }} data-route="project" data-id={p.pid} onClick={vm.go}>{vm.t.cdash.brk}</a>
              </div>
            </React.Fragment>
    ))}
    
            <p className="muted" style={{ fontSize: '11.5px', lineHeight: '1.7' }}>{vm.t.cdash.payNote}</p>
          </div>
          <div className="card"><span className="kick">{vm.t.cdash.performance}</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', padding: '8px 0', borderBottom: '1px solid #EEEDF5' }}><span>{vm.t.cdash.profileViews}</span><span className="num" style={{ fontWeight: '600' }}>128</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', padding: '8px 0', borderBottom: '1px solid #EEEDF5' }}><span>{vm.t.cdash.winRate}</span><span className="num" style={{ fontWeight: '600' }}>31%</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', padding: '8px 0' }}><span>{vm.t.profile.response}</span><span className="num" style={{ fontWeight: '600' }}>4h</span></div>
          </div>
        </aside>
      </div>
    </section>
  </>);
}
