/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function ContractorEditModal({ vm }: { vm: VM }) {
  return (<>
    <div className="modalveil" onClick={vm.closeEdit}></div>
    <div className="modal" role="dialog">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h2 style={{ fontSize: '22px', color: '#1B1464' }}>{vm.t.profile.editTitle}</h2>
        <p className="muted" style={{ fontSize: '13px', lineHeight: '1.7' }}>{vm.t.profile.editSub}</p>
      </div>
      <div><label className="lbl">{vm.t.profile.fName}</label><input className="input" name="name" value={vm.ed.f.name} onChange={vm.setEdit} /></div>
      <div><label className="lbl">{vm.t.profile.fCity}</label><select className="input" name="city" value={vm.ed.f.city} onChange={vm.setEdit}>
    {((vm.cities) || []).map((c: any, _i0: number) => (
      <React.Fragment key={_i0}><option value={c.id}>{c.label}</option></React.Fragment>
    ))}
    </select></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span className="lbl">{vm.t.profile.fTrades}</span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          
    {((vm.ed.trades) || []).map((tr: any, _i0: number) => (
      <React.Fragment key={_i0}>
            <button className="tchip" aria-pressed={tr.sel} data-id={tr.id} onClick={vm.toggleEditTrade}>{tr.label}</button>
          </React.Fragment>
    ))}
    
        </div>
      </div>
      <div><label className="lbl">{vm.t.profile.fBio}</label><textarea className="input" name="bio" value={vm.ed.f.bio} onChange={vm.setEdit} placeholder={vm.t.profile.fBioPh} style={{ minHeight: '110px' }} /></div>
      <p className="muted" style={{ fontSize: '11.5px', lineHeight: '1.7' }}>{vm.t.profile.lockedNote}</p>
      
    {vm.ed.error ? (<><p style={{ fontSize: '13px', color: '#D9401F' }}>{vm.ed.error}</p></>) : null}
    
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button className="btn btn-s" onClick={vm.closeEdit}>{vm.t.wallet.cancel}</button>
        <button className="btn btn-p" onClick={vm.saveEdit}>{vm.t.profile.save}</button>
      </div>
    </div>
  </>);
}
