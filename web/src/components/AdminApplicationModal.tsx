/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function AdminApplicationModal({ vm }: { vm: VM }) {
  return (<>
    {vm.av.app ? (<>
    <div className="modalveil" onClick={vm.closeAdminView}></div>
    <div className="modal dv" role="dialog" aria-labelledby="dv-app-title" style={{ width: 'min(640px,calc(100vw - 40px))' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span className="kick">{vm.t.admin.dv.appTitle}</span>
        <h2 id="dv-app-title" style={{ fontSize: '22px', color: '#1B1464' }}>{vm.av.app.name}</h2>
        <p className="muted" style={{ fontSize: '13px' }}>{vm.av.app.person} · {vm.av.app.city}</p>
      </div>
      <div className="dv-grid">
        <div><div className="dv-k">{vm.t.admin.dv.mobile}</div><div className="dv-v num"><a className="lnk" href={vm.av.app.tel}>{vm.av.app.mobile}</a></div></div>
        <div><div className="dv-k">{vm.t.admin.dv.email}</div><div className="dv-v"><a className="lnk" href={vm.av.app.mailto}>{vm.av.app.email}</a></div></div>
        <div><div className="dv-k">{vm.t.admin.dv.cr}</div><div className="dv-v num">{vm.av.app.cr}</div></div>
        <div><div className="dv-k">{vm.t.admin.dv.applied}</div><div className="dv-v">{vm.av.app.applied}</div></div>
        <div><div className="dv-k">{vm.t.admin.dv.account}</div><div className="dv-v">{vm.av.app.account}</div></div>
        <div><div className="dv-k">{vm.t.status}</div><div className="dv-v"><span className={`tag ${vm.av.app.cls}`}>{vm.av.app.status}</span></div></div>
      </div>
      <div><div className="dv-k" style={{ marginBottom: '6px' }}>{vm.t.admin.dv.trades}</div><div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {((vm.av.app.trades) || []).map((tr: any, _i0: number) => (
        <React.Fragment key={_i0}><span className="tag tag-w">{tr.label}</span></React.Fragment>
      ))}
      </div></div>
      <div><div className="dv-k" style={{ marginBottom: '6px' }}>{vm.t.admin.checks}</div><div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {((vm.av.app.checks) || []).map((ch: any, _i0: number) => (
        <React.Fragment key={_i0}><span className={`tag ${ch.cls}`}>{ch.label}</span></React.Fragment>
      ))}
      </div></div>
      <div><div className="dv-k" style={{ marginBottom: '6px' }}>{vm.t.admin.dv.note}</div><p className="dv-msg">{vm.av.app.note}</p></div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button className="btn btn-s" onClick={vm.closeAdminView}>{vm.t.admin.dv.close}</button>
        
      {vm.av.app.pending ? (<><button className="btn btn-s" data-id={vm.av.app.id} onClick={vm.rejectVerif}>{vm.t.admin.reject}</button><button className="btn btn-p" data-id={vm.av.app.id} onClick={vm.approveVerif}>{vm.t.admin.approve}</button></>) : null}
      
      </div>
    </div>
  </>) : null}
    </>);
}
