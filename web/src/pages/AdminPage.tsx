/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function AdminPage({ vm }: { vm: VM }) {
  return (<>
    <section className="wrap fade gside" style={{ paddingBlock: '40px 80px', maxWidth: '1320px', display: 'grid', gridTemplateColumns: '230px minmax(0,1fr)', gap: '32px', alignItems: 'start' }}>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'sticky', top: '88px' }}>
        <span className="kick" style={{ padding: '0 14px 10px' }}>{vm.t.admin.kicker}</span>
        
    {((vm.adminTabs) || []).map((a: any, _i0: number) => (
      <React.Fragment key={_i0}><span className="side" data-tab={a.id} aria-current={a.cur} onClick={vm.setAdminTab}>{a.label}
      {a.count ? (<><span className="tag tag-a num" style={{ marginInlineStart: 'auto' }}>{a.count}</span></>) : null}
      </span></React.Fragment>
    ))}
    
      </aside>
      <div>
        
    {vm.atab.overview ? (<>
          <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464' }}>{vm.t.admin.overview}</h1>
          <div className="qstrip num">
            
      {((vm.adminQuick) || []).map((s: any, _i0: number) => (
        <React.Fragment key={_i0}>
              <div className="qitem"><span className="qv" style={{ color: s.color }}>{s.v}</span><span className="ql">{s.l}</span></div>
            </React.Fragment>
      ))}
      
          </div>
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '20px', color: '#1B1464' }}>{vm.t.admin.finTitle}</h3>
            <p className="muted" style={{ fontSize: '12.5px', marginTop: '4px' }}>{vm.t.admin.finSub}</p>
          </div>

          <div className="card" style={{ gap: '22px', marginBottom: '20px', padding: '26px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <span className="kick" style={{ color: '#9B9AB4' }}>{vm.t.admin.finFlow}</span>
                <p className="muted" style={{ fontSize: '12.5px', marginTop: '6px', maxWidth: '44ch' }}>{vm.t.admin.finFlowSub}</p>
              </div>
              <div style={{ textAlign: 'end' }}>
                <span className="muted" style={{ fontSize: '12.5px', display: 'block' }}>{vm.t.admin.finPaid}</span>
                <span className="num" style={{ fontSize: '34px', fontWeight: '600', color: '#1B1464', lineHeight: '1.1' }}>SAR {vm.fin.paid}</span>
              </div>
            </div>
            <div style={{ display: 'flex', height: '18px', borderRadius: '10px', overflow: 'hidden', background: '#EEEDF5' }}>
              <span style={{ width: `${vm.fin.coPct}%`, background: 'linear-gradient(90deg,#0F5C2E,#2FA45F)', transition: 'width .45s ease' }}></span>
              <span style={{ width: `${vm.fin.tmPct}%`, background: 'linear-gradient(90deg,#FF8800,#FF4455)', transition: 'width .45s ease' }}></span>
              <span style={{ width: `${vm.fin.escPct}%`, background: '#D9D7E8', transition: 'width .45s ease' }}></span>
            </div>
            <div className="g3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '14px' }}>
              <div className="flowcell">
                <span className="flowdot" style={{ background: '#1B7A3E' }}></span>
                <div><span className="flowlbl">{vm.t.admin.finToCo}</span><span className="num flowval">SAR {vm.fin.coEarned}</span><span className="num flowpct">{vm.fin.coPct}%</span></div>
              </div>
              <div className="flowcell">
                <span className="flowdot" style={{ background: '#FF5A3C' }}></span>
                <div><span className="flowlbl">{vm.t.admin.finToTm}</span><span className="num flowval">SAR {vm.fin.revReal}</span><span className="num flowpct">{vm.fin.tmPct}%</span></div>
              </div>
              <div className="flowcell">
                <span className="flowdot" style={{ background: '#C9C7DC' }}></span>
                <div><span className="flowlbl">{vm.t.admin.finEscrow}</span><span className="num flowval">SAR {vm.fin.held}</span><span className="num flowpct">{vm.fin.escPct}%</span></div>
              </div>
            </div>
          </div>

          <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,1fr)', gap: '20px', marginBottom: '32px' }}>
            <div className="card" style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#0B4A25,#125F31 55%,#17743C)', border: '0', color: '#fff', gap: '16px', padding: '26px' }}>
              <span style={{ position: 'absolute', insetInlineEnd: '-22%', top: '-46%', width: '70%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle,rgba(160,255,190,.3),transparent 68%)', pointerEvents: 'none' }}></span>
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '12.5px', color: '#fff', display: 'block' }}>{vm.t.admin.finRev} · {vm.t.admin.finRealised}</span>
                  <span className="num" style={{ fontSize: '34px', fontWeight: '600', lineHeight: '1.1' }}>SAR {vm.fin.revReal}</span>
                </div>
                <div style={{ textAlign: 'end' }}>
                  <span style={{ fontSize: '12px', color: '#fff', display: 'block' }}>{vm.t.admin.finPipeline}</span>
                  <span className="num" style={{ fontSize: '19px', fontWeight: '600', color: '#EAFFF1' }}>+ SAR {vm.fin.revProj}</span>
                </div>
              </div>
              <div style={{ position: 'relative', display: 'flex', height: '10px', borderRadius: '6px', overflow: 'hidden', background: 'rgba(255,255,255,.22)' }}>
                <span style={{ width: `${vm.fin.realPct}%`, background: '#fff', transition: 'width .45s ease' }}></span>
                <span style={{ width: `${vm.fin.projPct}%`, background: 'repeating-linear-gradient(135deg,rgba(255,255,255,.55) 0 6px,rgba(255,255,255,.2) 6px 12px)', transition: 'width .45s ease' }}></span>
              </div>
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#fff' }}>
                <span>{vm.t.admin.finTotal} · <span className="num" style={{ fontWeight: '600', color: '#fff' }}>SAR {vm.fin.revTotal}</span></span>
                <span className="num">{vm.fin.realPct}% / {vm.fin.projPct}%</span>
              </div>
            </div>
            <div className="card" style={{ gap: '14px', padding: '26px' }}>
              <span className="kick" style={{ color: '#9B9AB4' }}>{vm.t.admin.finRevDetail}</span>
              <div className="finrow"><span>{vm.t.admin.finComm}</span><span className="num">SAR {vm.fin.comm}</span></div>
              <div className="finrow"><span>{vm.t.admin.finFees}</span><span className="num">SAR {vm.fin.fees}</span></div>
              <div className="finrow" style={{ border: '0' }}><span>{vm.t.admin.finAvg}</span><span className="num">SAR {vm.fin.avg}</span></div>
              <p className="muted" style={{ fontSize: '11.5px', marginTop: 'auto' }}>{vm.t.admin.finProjNote}</p>
            </div>
          </div>

          <div className="card" style={{ padding: '8px' }}><h3 style={{ fontSize: '18px', color: '#1B1464', padding: '12px 12px 4px' }}>{vm.t.admin.allProjects}</h3>
          <table className="table"><thead><tr><th>ID</th><th>{vm.t.project}</th><th>{vm.t.roles.homeowner}</th><th>{vm.t.roles.contractor}</th><th>{vm.t.status}</th><th>{vm.t.ws.amount}</th></tr></thead>
            <tbody>
      {((vm.allProjects) || []).map((p: any, _i0: number) => (
        <React.Fragment key={_i0}><tr className="row-h"><td className="muted num">{p.id}</td><td style={{ fontWeight: '500' }}>{p.title}</td><td>{p.ownerName}</td><td>{p.contractorName}</td><td><span className={`tag ${p.tagClass}`}>{p.statusLabel}</span></td><td className="num">SAR {p.amount}</td></tr></React.Fragment>
      ))}
      </tbody></table></div>
        </>) : null}
    
        
    {vm.atab.verification ? (<>
          <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464' }}>{vm.t.admin.verification}</h1>
          <p style={{ color: '#5B5A7A', maxWidth: '60ch', margin: '8px 0 24px' }}>{vm.t.admin.verifSub}</p>
          <div className="card" style={{ padding: '8px' }}><table className="table"><thead><tr><th>{vm.t.roles.contractor}</th><th>{vm.t.admin.checks}</th><th>{vm.t.admin.submitted}</th><th></th></tr></thead>
            <tbody>
      {((vm.verifQueue) || []).map((v: any, _i0: number) => (
        <React.Fragment key={_i0}>
              <tr><td><div style={{ fontWeight: '600', color: '#1B1464' }}>{v.name}</div><div className="muted" style={{ fontSize: '12.5px' }}>{v.city}</div></td>
                <td><div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {((v.checks) || []).map((ch: any, _i1: number) => (
          <React.Fragment key={_i1}><span className={`tag ${ch.cls}`}>{ch.label}</span></React.Fragment>
        ))}
        </div></td>
                <td className="muted">{v.date}</td>
                <td style={{ textAlign: 'end', whiteSpace: 'nowrap' }}><div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}><button className="btn btn-p btn-sm" data-id={v.id} onClick={vm.approveVerif}>{vm.t.admin.approve}</button><button className="btn btn-s btn-sm" data-id={v.id} onClick={vm.rejectVerif}>{vm.t.admin.reject}</button></div></td></tr>
            </React.Fragment>
      ))}
      </tbody></table>
            
      {vm.noVerif ? (<><p className="muted" style={{ padding: '16px 12px' }}>{vm.t.admin.queueEmpty}</p></>) : null}
      </div>
        </>) : null}
    
        
    {vm.atab.support ? (<>
          <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464', marginBottom: '24px' }}>{vm.t.admin.support}</h1>
          <div className="card" style={{ padding: '8px' }}><table className="table"><thead><tr><th>ID</th><th>{vm.t.project}</th><th>{vm.t.admin.issue}</th><th>{vm.t.status}</th><th></th></tr></thead>
            <tbody>
      {((vm.cases) || []).map((c: any, _i0: number) => (
        <React.Fragment key={_i0}><tr><td className="muted num">{c.id}</td><td style={{ fontWeight: '500' }}>{c.project}</td><td style={{ fontSize: '13.5px', color: '#5B5A7A' }}>{c.issue}</td><td><span className={`tag ${c.cls}`}>{c.status}</span></td><td style={{ textAlign: 'end' }}>
        {c.open ? (<><button className="btn btn-s btn-sm" data-id={c.id} onClick={vm.closeCase}>{vm.t.admin.resolve}</button></>) : null}
        </td></tr></React.Fragment>
      ))}
      </tbody></table></div>
        </>) : null}
    
        
    {vm.atab.payments ? (<>
          <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464' }}>{vm.t.admin.payments}</h1>
          <p style={{ color: '#5B5A7A', maxWidth: '60ch', margin: '8px 0 24px' }}>{vm.t.admin.paySub}</p>
          <div className="card" style={{ padding: '8px' }}><table className="table"><thead><tr><th>{vm.t.project}</th><th>{vm.t.ws.milestone}</th><th>{vm.t.ws.amount}</th><th>{vm.t.status}</th></tr></thead>
            <tbody>
      {((vm.payRows) || []).map((p: any, _i0: number) => (
        <React.Fragment key={_i0}><tr><td style={{ fontWeight: '500' }}>{p.project}</td><td>{p.ms}</td><td className="num">SAR {p.amount}</td><td><span className={`tag ${p.cls}`}>{p.status}</span></td></tr></React.Fragment>
      ))}
      </tbody></table></div>
        </>) : null}
    
        
    {vm.atab.users ? (<>
          <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464', marginBottom: '24px' }}>{vm.t.admin.users}</h1>
          <div className="card" style={{ padding: '8px' }}><table className="table"><thead><tr><th>{vm.t.auth.fullName}</th><th>{vm.t.admin.role}</th><th>{vm.t.auth.city}</th><th>{vm.t.status}</th></tr></thead>
            <tbody>
      {((vm.userRows) || []).map((u: any, _i0: number) => (
        <React.Fragment key={_i0}><tr><td style={{ fontWeight: '500' }}>{u.name}</td><td>{u.role}</td><td>{u.city}</td><td><span className={`tag ${u.cls}`}>{u.status}</span></td></tr></React.Fragment>
      ))}
      </tbody></table></div>
        </>) : null}
    
      </div>
    </section>
  </>);
}
