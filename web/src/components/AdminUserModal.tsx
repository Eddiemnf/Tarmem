/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function AdminUserModal({ vm }: { vm: VM }) {
  return (<>
    {vm.av.user ? (<>
    <div className="modalveil" onClick={vm.closeAdminView}></div>
    <div className="modal dv" role="dialog" aria-labelledby="dv-user-title" style={{ width: 'min(720px,calc(100vw - 40px))' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span className="kick">{vm.t.admin.dv.userTitle}</span>
        <h2 id="dv-user-title" style={{ fontSize: '22px', color: '#1B1464' }}>{vm.av.user.name}</h2>
        <p className="muted" style={{ fontSize: '13px' }}>{vm.av.user.role} · {vm.av.user.city}</p>
      </div>
      <div className="dv-grid">
        <div><div className="dv-k">{vm.t.admin.dv.mobile}</div><div className="dv-v num"><a className="lnk" href={vm.av.user.tel}>{vm.av.user.mobile}</a></div></div>
        <div><div className="dv-k">{vm.t.admin.dv.email}</div><div className="dv-v"><a className="lnk" href={vm.av.user.mailto}>{vm.av.user.email}</a></div></div>
        <div><div className="dv-k">{vm.t.admin.dv.company}</div><div className="dv-v">{vm.av.user.company}</div></div>
        <div><div className="dv-k">{vm.t.admin.dv.language}</div><div className="dv-v">{vm.av.user.language}</div></div>
        <div><div className="dv-k">{vm.t.admin.dv.joined}</div><div className="dv-v">{vm.av.user.joined}</div></div>
        <div><div className="dv-k">{vm.t.admin.dv.lastSeen}</div><div className="dv-v">{vm.av.user.lastSeen}</div></div>
        <div><div className="dv-k">{vm.t.status}</div><div className="dv-v"><span className={`tag ${vm.av.user.cls}`}>{vm.av.user.status}</span></div></div>
        
      {vm.av.user.isContractor ? (<><div><div className="dv-k">{vm.t.admin.dv.application}</div><div className="dv-v">{vm.av.user.application}</div></div><div><div className="dv-k">{vm.t.admin.dv.portfolio} · {vm.t.admin.dv.reviewsCount}</div><div className="dv-v num">{vm.av.user.portfolio} · {vm.av.user.reviews}</div></div></>) : null}
      
      </div>
      <div>
        <div className="dv-k" style={{ marginBottom: '6px' }}>{vm.t.admin.dv.projects} <span className="num">({vm.av.user.projectCount})</span></div>
        
      {vm.av.user.noProjects ? (<><p className="muted" style={{ fontSize: '13px' }}>{vm.t.admin.dv.noProjects}</p></>) : null}
      
        
      {vm.av.user.hasProjects ? (<><table className="table dv-table"><thead><tr><th>#</th><th>{vm.t.project}</th><th>{vm.t.status}</th><th>{vm.t.admin.dv.bids}</th><th></th></tr></thead><tbody>
          
        {((vm.av.user.projects) || []).map((p: any, _i0: number) => (
          <React.Fragment key={_i0}><tr><td className="muted num">{p.id}</td><td style={{ fontWeight: '500' }}>{p.title}</td><td><span className={`tag ${p.tagClass}`}>{p.statusLabel}</span></td><td className="num">{p.bids}</td><td style={{ textAlign: 'end' }}><button className="lnkbtn" data-id={p.id} onClick={vm.openAdminProject}>{vm.t.admin.dv.openProject}</button></td></tr></React.Fragment>
        ))}
        
        </tbody></table></>) : null}
      
      </div>
      
      {vm.av.user.isContractor ? (<><div>
        <div className="dv-k" style={{ marginBottom: '6px' }}>{vm.t.admin.dv.bids} <span className="num">({vm.av.user.bidCount})</span></div>
        
        {vm.av.user.noBids ? (<><p className="muted" style={{ fontSize: '13px' }}>{vm.t.admin.dv.noBids}</p></>) : null}
        
        
        {vm.av.user.hasBids ? (<><table className="table dv-table"><thead><tr><th>{vm.t.project}</th><th>{vm.t.ws.amount}</th><th>{vm.t.admin.dv.days}</th><th>{vm.t.status}</th><th></th></tr></thead><tbody>
          
          {((vm.av.user.bids) || []).map((b: any, _i0: number) => (
            <React.Fragment key={_i0}><tr><td style={{ fontWeight: '500' }}><span className="muted num">{b.project}</span> {b.title}</td><td className="num">{vm.curPre}{b.price}{vm.curPost}</td><td className="num">{b.days}</td><td>{b.status}</td><td style={{ textAlign: 'end' }}><button className="lnkbtn" data-id={b.project} onClick={vm.openAdminProject}>{vm.t.admin.dv.openProject}</button></td></tr></React.Fragment>
          ))}
          
        </tbody></table></>) : null}
        
      </div></>) : null}
      
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}><button className="btn btn-s" onClick={vm.closeAdminView}>{vm.t.admin.dv.close}</button></div>
    </div>
  </>) : null}
    </>);
}
