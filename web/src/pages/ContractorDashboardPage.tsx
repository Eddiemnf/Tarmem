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
        <button className="btn btn-p" data-route="browse" onClick={vm.go}>{vm.t.nav.browse}</button>
      </div>
      <div className="statstrip num">
        
    {((vm.cStats) || []).map((s: any, _i0: number) => (
      <React.Fragment key={_i0}><div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '0' }}><div style={{ fontSize: '22px', fontWeight: '600', color: '#1B1464', lineHeight: '1.15', whiteSpace: 'nowrap' }}>{s.v}</div><div className="muted" style={{ fontSize: '12.5px' }}>{s.l}</div></div></React.Fragment>
    ))}
    
      </div>
      <div className="gside" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: '24px', alignItems: 'start' }}>
        <div className="card" style={{ padding: '8px 8px 4px' }}>
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
      <React.Fragment key={_i0}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '10px 0', borderBottom: '1px solid #EEEDF5', fontSize: '13.5px' }}><span>{p.label}</span><span className="num" style={{ fontWeight: '600', color: p.color }}>SAR {p.amount}</span></div></React.Fragment>
    ))}
    
            <p className="muted" style={{ fontSize: '11.5px' }}>{vm.t.cdash.payNote}</p>
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
