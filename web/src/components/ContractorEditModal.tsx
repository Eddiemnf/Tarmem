/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function ContractorEditModal({ vm }: { vm: VM }) {
  return (<>
    {vm.ed.open ? (<>
    <div className="modalveil" onClick={vm.closeEdit}></div>
    <div className="modal" role="dialog">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h2 style={{ fontSize: '22px', color: '#1B1464' }}>{vm.t.profile.editTitle}</h2>
        <p className="muted" style={{ fontSize: '13px', lineHeight: '1.7' }}>{vm.t.profile.editSub}</p>
      </div>
      <div><label className="lbl" htmlFor="ed-name">{vm.t.profile.fName}</label><input id="ed-name" className="input" name="name" value={vm.ed.f.name} readOnly style={{ background: '#F4F3FA', color: '#5B5A7A' }} /><div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginTop: '6px' }}><span className="muted" style={{ fontSize: '11.5px' }}>{vm.t.profile.nameLocked}</span><a className="lnkbtn" style={{ fontSize: '11.5px' }} data-route="help" onClick={vm.go}>{vm.t.profile.nameReq}</a></div></div>
      <div><label className="lbl" htmlFor="a11y-city">{vm.t.profile.fCity}</label><select className="input" name="city" value={vm.ed.f.city} onChange={vm.setEdit} id="a11y-city">
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
      <div>
        <label className="lbl" htmlFor="ed-bio">{vm.t.profile.fBio}</label>
        <textarea id="ed-bio" className="input" name="bio" value={vm.ed.f.bio} onChange={vm.setEdit} placeholder={vm.t.profile.fBioPh} maxLength={500} style={{ minHeight: '110px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '6px' }}><span className="muted" style={{ fontSize: '11.5px' }}>{vm.t.profile.bioMin}</span><span className="num" style={{ fontSize: '11.5px', color: vm.ed.bioColor }}>{vm.ed.bioLen} {vm.t.profile.bioCount}</span></div>
      </div>

      <div style={{ background: '#F7F6FC', borderRadius: '12px', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <span className="kick" style={{ color: '#9B9AB4' }}>{vm.t.profile.previewT}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap' }}><b style={{ fontSize: '15px', color: '#1B1464' }}>{vm.ed.f.name}</b><span className="tag tag-v" style={{ fontSize: '10.5px', padding: '2px 8px' }}>✓ {vm.t.verified}</span></div>
        <span className="muted num" style={{ fontSize: '12px' }}>{vm.ed.previewMeta}</span>
        <p className="muted" style={{ fontSize: '12.5px', lineHeight: '1.75', margin: '0' }}>{vm.ed.previewBio}</p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {((vm.ed.selLabels) || []).map((tl: any, _i0: number) => (
        <React.Fragment key={_i0}><span className="tag tag-n" style={{ fontSize: '10.5px', padding: '3px 9px' }}>{tl}</span></React.Fragment>
      ))}
      </div>
      </div>

      <p className="muted" style={{ fontSize: '11.5px', lineHeight: '1.7' }}>{vm.t.profile.lockedNote}</p>
      
      {vm.ed.error ? (<><p style={{ fontSize: '13px', color: '#D9401F' }}>{vm.ed.error}</p></>) : null}
      

      
      {vm.ed.confirmCancel ? (<>
        <div style={{ background: '#FFF6F2', border: '1px solid #FFD9CB', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#B3341A' }}>{vm.t.profile.cancelQ}</span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}><button className="btn btn-s btn-sm" style={{ borderColor: '#E8836A', color: '#B3341A' }} onClick={vm.discardEdit}>{vm.t.profile.cancelYes}</button><button className="btn btn-g btn-sm" onClick={vm.keepEditing}>{vm.t.profile.cancelNo}</button></div>
        </div>
      </>) : null}
      

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button className="btn btn-s" onClick={vm.closeEdit}>{vm.t.wallet.cancel}</button>
        <button className="btn btn-p" onClick={vm.saveEdit}>{vm.t.profile.save}</button>
      </div>
    </div>
  </>) : null}
    </>);
}
