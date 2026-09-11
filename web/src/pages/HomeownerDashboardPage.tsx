/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function HomeownerDashboardPage({ vm }: { vm: VM }) {
  return (<>
    <section className="wrap fade" style={{ paddingBlock: '40px 80px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', flexWrap: 'wrap', gap: '16px' }}>
        <div><span className="kick">{vm.t.hdash.kicker}</span><h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464', marginTop: '8px' }}>{vm.t.hdash.hello}{vm.t.comma} {vm.user.name}</h1></div>
        <button className="btn btn-s" data-route="contractors" onClick={vm.go}>{vm.t.nav.contractors}</button>
      </div>
      <div className="statstrip num">
        
    {((vm.hStats) || []).map((s: any, _i0: number) => (
      <React.Fragment key={_i0}><div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '0' }}><div style={{ fontSize: '22px', fontWeight: '600', color: '#1B1464', lineHeight: '1.15', whiteSpace: 'nowrap' }}>{s.v}</div><div className="muted" style={{ fontSize: '12.5px' }}>{s.l}</div></div></React.Fragment>
    ))}
    
      </div>
      <div className="gside" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: '24px', alignItems: 'start' }}>
        <div className="card" style={{ padding: '8px 8px 4px' }}>
          <h3 style={{ fontSize: '18px', color: '#1B1464', padding: '12px 12px 4px' }}>{vm.t.hdash.projects}</h3>
          <table className="table"><thead><tr><th>{vm.t.project}</th><th>{vm.t.status}</th><th>{vm.t.bidsWord}</th><th>{vm.t.progress}</th><th></th></tr></thead>
            <tbody>
    {((vm.myProjects) || []).map((p: any, _i0: number) => (
      <React.Fragment key={_i0}>
              <tr className="row-h" style={{ cursor: 'pointer' }} data-route="project" data-id={p.id} onClick={vm.go}>
                <td><div style={{ fontWeight: '600', color: '#1B1464' }}>{p.title}</div><div className="muted num" style={{ fontSize: '12.5px' }}>{p.cityLabel} · SAR {p.budgetLabel}</div></td>
                <td><span className={`tag ${p.tagClass}`}>{p.statusLabel}</span></td>
                <td className="num">{p.bidCount}</td>
                <td style={{ minWidth: '130px' }}><div style={{ height: '5px', background: '#EEEDF5', borderRadius: '3px' }}><div style={{ height: '5px', borderRadius: '3px', background: 'linear-gradient(90deg,#FF8800,#FF4455)', width: `${p.pct}%` }}></div></div><div className="muted num" style={{ fontSize: '11.5px', marginTop: '4px' }}>{p.pct}%</div></td>
                <td style={{ textAlign: 'end', color: '#FF5A3C' }}>→</td>
              </tr></React.Fragment>
    ))}
    </tbody></table>
        </div>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card"><span className="kick">{vm.t.hdash.actions}</span>
            
    {((vm.hActions) || []).map((a: any, _i0: number) => (
      <React.Fragment key={_i0}><div data-route="project" data-id={a.pid} data-tab={a.tab} onClick={vm.go} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #EEEDF5', cursor: 'pointer', fontSize: '13.5px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FF5A3C', marginTop: '6px', flex: 'none' }}></span><span>{a.text}</span></div></React.Fragment>
    ))}
    
            
    {vm.noHActions ? (<><p className="muted" style={{ fontSize: '13.5px' }}>{vm.t.hdash.noActions}</p></>) : null}
    
          </div>
          <div className="card"><span className="kick">{vm.t.hdash.saved}</span>
            
    {((vm.savedList) || []).map((c: any, _i0: number) => (
      <React.Fragment key={_i0}><div data-route="contractor" data-id={c.id} onClick={vm.go} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #EEEDF5', cursor: 'pointer', fontSize: '14px' }}><span style={{ fontWeight: '500' }}>{c.name}</span><span className="muted num">★ {c.rating}</span></div></React.Fragment>
    ))}
    
            
    {vm.noSaved ? (<><p className="muted" style={{ fontSize: '13.5px' }}>{vm.t.hdash.noSaved}</p></>) : null}
    
          </div>
        </aside>
      </div>
    </section>
  </>);
}
