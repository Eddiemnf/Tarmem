/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function AdminCaseModal({ vm }: { vm: VM }) {
  return (<>
    {vm.av.case ? (<>
    <div className="modalveil" onClick={vm.closeAdminView}></div>
    <div className="modal dv" role="dialog" aria-labelledby="dv-case-title" style={{ width: 'min(640px,calc(100vw - 40px))' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span className="kick">{vm.t.admin.dv.caseTitle} <span className="num">{vm.av.case.id}</span></span>
        <h2 id="dv-case-title" style={{ fontSize: '22px', color: '#1B1464' }}>{vm.av.case.title}</h2>
        <p className="muted" style={{ fontSize: '13px' }}>{vm.av.case.from}</p>
      </div>
      <div className="dv-grid">
        <div><div className="dv-k">{vm.t.admin.dv.mobile}</div><div className="dv-v num"><a className="lnk" href={vm.av.case.tel}>{vm.av.case.mobile}</a></div></div>
        <div><div className="dv-k">{vm.t.admin.dv.email}</div><div className="dv-v"><a className="lnk" href={vm.av.case.mailto}>{vm.av.case.email}</a></div></div>
        <div><div className="dv-k">{vm.t.admin.dv.received}</div><div className="dv-v">{vm.av.case.received}</div></div>
        <div><div className="dv-k">{vm.t.status}</div><div className="dv-v"><span className={`tag ${vm.av.case.cls}`}>{vm.av.case.status}</span></div></div>
      </div>
      <div><div className="dv-k" style={{ marginBottom: '6px' }}>{vm.t.admin.dv.message}</div><p className="dv-msg">{vm.av.case.message}</p></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="dv-k">{vm.t.admin.dv.replies}</div>
        
      {vm.av.case.noReplies ? (<><p className="muted" style={{ fontSize: '13px' }}>{vm.t.admin.dv.noReplies}</p></>) : null}
      
        
      {((vm.av.case.replies) || []).map((rp: any, _i0: number) => (
        <React.Fragment key={_i0}><div className="dv-reply"><div className="muted" style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '12px' }}><span>{rp.when}</span><span className={`tag ${rp.cls}`}>{rp.how}</span></div><p style={{ fontSize: '14px', lineHeight: '1.7', color: '#3A385C', whiteSpace: 'pre-wrap' }}>{rp.text}</p></div></React.Fragment>
      ))}
      
        <textarea className="input" id="dv-reply" rows={3} value={vm.caseReply} onChange={vm.setCaseReply} placeholder={vm.t.admin.dv.replyPh} />
        
      {vm.av.case.replyError ? (<><p style={{ fontSize: '13px', color: '#D9401F' }}>{vm.av.case.replyError}</p></>) : null}
      
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button className="btn btn-s" onClick={vm.closeAdminView}>{vm.t.admin.dv.close}</button>
          
      {vm.av.case.open ? (<><button className="btn btn-s" data-id={vm.av.case.id} onClick={vm.closeCase}>{vm.t.admin.resolve}</button></>) : null}
      
          <button className="btn btn-p" data-id={vm.av.case.id} disabled={vm.av.case.replyDisabled} onClick={vm.sendCaseReply}>{vm.av.case.sendLabel}</button>
        </div>
      </div>
    </div>
  </>) : null}
    </>);
}
