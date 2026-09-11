/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function SettingsPage({ vm }: { vm: VM }) {
  return (<>
    <section className="wrap fade" style={{ paddingBlock: '40px 80px', maxWidth: '760px' }}>
      <span className="kick">{vm.t.settings.kicker}</span>
      <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464', margin: '10px 0 10px' }}>{vm.t.settings.title}</h1>
      <p style={{ color: '#5B5A7A', fontSize: '15px', maxWidth: '56ch' }}>{vm.t.settings.sub}</p>

      <div className="card" style={{ marginTop: '28px', padding: '26px', gap: '16px' }}>
        <span className="kick">{vm.t.settings.contact}</span>
        <div><label className="lbl">{vm.t.settings.mobile}</label><input className="input num" name="mobile" value={vm.st.mobile} onChange={vm.setSetting} style={{ direction: 'ltr', textAlign: 'start' }} /><span className="muted" style={{ fontSize: '11.5px' }}>{vm.t.settings.mobileNote}</span></div>
        <div><label className="lbl">{vm.t.settings.email}</label><input className="input" type="email" name="email" value={vm.st.email} onChange={vm.setSetting} style={{ direction: 'ltr', textAlign: 'start' }} /></div>
      </div>

      <div className="card" style={{ marginTop: '16px', padding: '26px', gap: '14px' }}>
        <span className="kick">{vm.t.settings.prefs}</span>
        <p className="muted" style={{ fontSize: '12px', lineHeight: '1.7', margin: '0' }}>{vm.t.settings.prefsNote}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '2px' }}>
          
    {((vm.st.prefs) || []).map((pf: any, _i0: number) => (
      <React.Fragment key={_i0}>
            <label className="radio" style={{ justifyContent: 'space-between', width: '100%' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><input type="checkbox" name={pf.id} checked={pf.on} disabled={pf.locked} onChange={vm.setPref} /><span className="dot" style={{ borderRadius: '5px' }}></span>{pf.label}</span>
              
      {pf.locked ? (<><span className="tag tag-n">{vm.t.settings.locked}</span></>) : null}
      
            </label>
          </React.Fragment>
    ))}
    
        </div>
      </div>

      <div className="card" style={{ marginTop: '16px', padding: '26px', gap: '12px' }}>
        <span className="kick">{vm.t.settings.lang}</span>
        <div style={{ display: 'flex', gap: '10px' }}><button className="btn btn-s btn-sm" onClick={vm.toggleLang}>{vm.st.otherLang}</button></div>
        <p className="muted" style={{ fontSize: '11.5px', lineHeight: '1.7', margin: '0' }}>{vm.t.settings.langNote}</p>
      </div>

      
    {vm.st.notice ? (<><div className="card" style={{ marginTop: '16px', padding: '18px', borderColor: '#BFE4CC', background: '#F1FBF5', flexDirection: 'row', alignItems: 'center', gap: '10px' }}><span className="fcheck" style={{ width: '24px', height: '24px', fontSize: '12px' }}>✓</span><span style={{ fontSize: '13.5px', fontWeight: '600', color: '#15703A' }}>{vm.st.notice}</span></div></>) : null}
    
      <div style={{ marginTop: '20px' }}><button className="btn btn-p" onClick={vm.saveSettings}>{vm.t.settings.save}</button></div>

      <div className="card" style={{ marginTop: '36px', padding: '26px', gap: '12px', borderColor: '#FFD9CB', background: '#FFF8F5' }}>
        <span className="kick" style={{ color: '#B3341A' }}>{vm.t.settings.danger}</span>
        <p style={{ fontSize: '12.5px', color: '#5B5A7A', lineHeight: '1.7', margin: '0', maxWidth: '60ch' }}>{vm.t.settings.dangerNote}</p>
        
    {vm.st.canClose ? (<><div><button className="btn btn-s btn-sm" style={{ borderColor: '#E8836A', color: '#B3341A' }}>{vm.t.settings.close}</button></div></>) : null}
    
        
    {vm.st.closeBlocked ? (<><p style={{ fontSize: '12.5px', fontWeight: '600', color: '#B3341A', margin: '0' }}>{vm.t.settings.blocked}</p></>) : null}
    
      </div>
    </section>
  </>);
}
