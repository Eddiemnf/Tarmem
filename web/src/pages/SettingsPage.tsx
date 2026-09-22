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
        <div><label className="lbl" htmlFor="a11y-mobile">{vm.t.settings.mobile}</label><input className="input num" name="mobile" type="tel" value={vm.st.mobile} onChange={vm.setSetting} style={{ direction: 'ltr', textAlign: 'start' }} placeholder="+966 5X XXX XXXX" id="a11y-mobile" /><span className="muted" style={{ fontSize: '11.5px' }}>{vm.t.settings.mobileNote}</span></div>
        <div><label className="lbl" htmlFor="a11y-email">{vm.t.settings.email}</label><input className="input" type="email" name="email" value={vm.st.email} onChange={vm.setSetting} style={{ direction: 'ltr', textAlign: 'start' }} id="a11y-email" /></div>
      </div>

      {vm.launch && !vm.whatsapp ? null : (<div className="card wa-card" style={{ marginTop: '16px', padding: '26px', gap: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#128C4A' }}><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.6 11.6 0 0 0 4.4 3.9c1.6.7 2.3.7 3.1.6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.2-.3-.2-.5-.3Z" /></svg><span className="kick" style={{ color: '#128C4A' }}>{vm.t.wa.title}</span></div>
          
    {vm.wa.on ? (<><span className="tag tag-g">✓ {vm.t.wa.verified}</span></>) : null}
    
        </div>

        <div>
          <label className="lbl" htmlFor="wa-num">{vm.t.wa.number}</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '10px' }}>
            <input id="wa-num" className="input num" name="waNumber" value={vm.wa.number} onChange={vm.setSetting} style={{ direction: 'ltr', textAlign: 'start' }} placeholder="+966 5X XXX XXXX" />
            <button className="btn btn-p" style={{ background: '#25D366' }} onClick={vm.waVerify}>{vm.t.wa.verify}</button>
          </div>
          <span className="muted" style={{ fontSize: '11.5px', display: 'block', marginTop: '6px' }}>{vm.t.wa.numberNote}</span>
          
    {vm.wa.sentTo ? (<><p style={{ fontSize: '12.5px', color: '#15703A', margin: '8px 0 0' }}>✓ {vm.t.wa.sent} <span className="num">{vm.wa.sentTo}</span></p></>) : null}
    
        </div>

        <div><span className="lbl">{vm.t.wa.channel}</span><div className="an-seg">
    {((vm.wa.channels) || []).map((ch: any, _i0: number) => (
      <React.Fragment key={_i0}><button type="button" data-v={ch.id} aria-pressed={ch.on} onClick={vm.waChannel}>{ch.l}</button></React.Fragment>
    ))}
    </div></div>

        <label className="radio" style={{ gap: '10px', alignItems: 'flex-start' }}><input type="checkbox" name="quiet" checked={vm.wa.quiet} onChange={vm.setPref} /><span className="dot" style={{ borderRadius: '5px', marginTop: '2px' }}></span><span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600', color: '#1B1464' }}>{vm.t.wa.quiet}</span><span style={{ fontSize: '12.5px', color: '#5B5A7A', lineHeight: '1.65' }}>{vm.t.wa.quietNote}</span></span></label>

        <details className="wa-more">
          <summary>{vm.t.wa.preview}</summary>
          <div className="wa-bubble" style={{ marginTop: '12px' }}>{vm.wa.previewMsg}<small className="num">{vm.wa.previewTime} ✓✓</small></div>
        </details>

        <p className="muted" style={{ fontSize: '11.5px', lineHeight: '1.7', margin: '0' }}>{vm.t.wa.optin}</p>
      </div>)}

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
        <div className="seg" style={{ alignSelf: 'flex-start' }}>
          <label><input type="radio" name="uilang" value="ar" checked={vm.st.isAr} onChange={vm.setLang} />العربية</label>
          <label><input type="radio" name="uilang" value="en" checked={vm.st.isEn} onChange={vm.setLang} />English</label>
        </div>
        <p className="muted" style={{ fontSize: '11.5px', lineHeight: '1.7', margin: '0' }}>{vm.t.settings.langNote}</p>
      </div>

      
    {vm.st.notice ? (<><div className="card" style={{ marginTop: '16px', padding: '18px', borderColor: '#BFE4CC', background: '#F1FBF5', flexDirection: 'row', alignItems: 'center', gap: '10px' }}><span className="fcheck" style={{ width: '24px', height: '24px', fontSize: '12px' }}>✓</span><span style={{ fontSize: '13.5px', fontWeight: '600', color: '#15703A' }}>{vm.st.notice}</span></div></>) : null}
    
      <div style={{ marginTop: '20px' }}><button className="btn btn-p" onClick={vm.saveSettings}>{vm.t.settings.save}</button></div>

      <div className="card" style={{ marginTop: '36px', padding: '26px', gap: '12px', borderColor: '#FFD9CB', background: '#FFF8F5' }}>
        <span className="kick" style={{ color: '#B3341A' }}>{vm.t.settings.danger}</span>
        <p style={{ fontSize: '12.5px', color: '#5B5A7A', lineHeight: '1.7', margin: '0', maxWidth: '60ch' }}>{vm.t.settings.dangerNote}</p>
        
    {vm.st.canClose ? (<><div><button className="btn btn-s btn-sm" style={{ borderColor: '#E8836A', color: '#B3341A' }} onClick={vm.askClose}>{vm.t.settings.close}</button></div></>) : null}
    
        
    {vm.st.closeAsk ? (<>
          <div style={{ background: '#fff', border: '1px solid #FFD9CB', borderRadius: '14px', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <b style={{ fontSize: '14.5px', color: '#B3341A' }}>{vm.t.settings.closeQ}</b>
            <p style={{ fontSize: '12.5px', color: '#5B5A7A', lineHeight: '1.75', margin: '0', maxWidth: '62ch' }}>{vm.t.settings.closeBody}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-s btn-sm" style={{ borderColor: '#E8836A', color: '#B3341A' }} onClick={vm.confirmClose}>{vm.t.settings.closeYes}</button>
              <button className="btn btn-g btn-sm" onClick={vm.askClose}>{vm.t.settings.closeNo}</button>
            </div>
          </div>
        </>) : null}
    
        
    {vm.st.closeBlocked ? (<><p style={{ fontSize: '12.5px', fontWeight: '600', color: '#B3341A', margin: '0' }}>{vm.t.settings.blocked}</p></>) : null}
    
      </div>
    </section>
  </>);
}
