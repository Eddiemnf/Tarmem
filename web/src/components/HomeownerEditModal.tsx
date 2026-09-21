/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function HomeownerEditModal({ vm }: { vm: VM }) {
  return (<>
    {vm.hed.open ? (<>
    <div className="modalveil" onClick={vm.closeHoEdit}></div>
    <div className="modal" role="dialog">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h2 style={{ fontSize: '22px', color: '#1B1464' }}>{vm.t.hprofile.editTitle}</h2>
        <p className="muted" style={{ fontSize: '13px', lineHeight: '1.7' }}>{vm.t.hprofile.editSub}</p>
      </div>
      <div><label className="lbl">{vm.t.hprofile.fName}</label><input className="input" name="name" value={vm.hed.f.name} onChange={vm.setHoEdit} /></div>
      <div><label className="lbl">{vm.t.hprofile.fCity}</label><select className="input" name="city" value={vm.hed.f.city} onChange={vm.setHoEdit}>
      {((vm.cities) || []).map((c: any, _i0: number) => (
        <React.Fragment key={_i0}><option value={c.id}>{c.label}</option></React.Fragment>
      ))}
      </select></div>
      <div><label className="lbl">{vm.t.hprofile.fAbout}</label><textarea className="input" name="about" value={vm.hed.f.about} onChange={vm.setHoEdit} placeholder={vm.t.hprofile.fAboutPh} style={{ minHeight: '110px' }} /></div>
      <p className="muted" style={{ fontSize: '11.5px', lineHeight: '1.7' }}>{vm.t.hprofile.lockedNote}</p>
      
      {vm.hed.error ? (<><p style={{ fontSize: '13px', color: '#D9401F' }}>{vm.hed.error}</p></>) : null}
      
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button className="btn btn-s" onClick={vm.closeHoEdit}>{vm.t.wallet.cancel}</button>
        <button className="btn btn-p" onClick={vm.saveHoEdit}>{vm.t.hprofile.save}</button>
      </div>
    </div>
  </>) : null}
    </>);
}
