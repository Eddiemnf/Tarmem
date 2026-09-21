/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function HelpPage({ vm }: { vm: VM }) {
  return (<>
    <section style={{ background: 'linear-gradient(180deg,#F7F6FC,#fff)' }}>
      <div className="wrap fade" style={{ paddingBlock: '56px 36px', maxWidth: '960px' }}>
        <span className="skick"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6 6 18" /></svg> {vm.t.help.kicker}</span>
        <h1 style={{ fontSize: 'clamp(30px,3.4vw,44px)', color: '#1B1464', margin: '12px 0 10px' }}>{vm.t.help.title}</h1>
        <p style={{ fontSize: '16px', color: '#5B5A7A', maxWidth: '56ch' }}>{vm.t.help.sub}</p>
        <div style={{ position: 'relative', maxWidth: '560px', marginTop: '22px' }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" style={{ position: 'absolute', insetInlineStart: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9B9AB4' }}><circle cx="11" cy="11" r="6.4" /><path d="M20 20l-4.4-4.4" /></svg>
          <input className="input" style={{ minHeight: '52px', paddingInlineStart: '46px', borderRadius: '14px', fontSize: '15px' }} value={vm.hc.q} onChange={vm.hcSearch} placeholder={vm.t.help.searchPh} aria-label={vm.t.help.searchPh} />
        </div>
      </div>
    </section>
    <section className="wrap" style={{ paddingBlock: '8px 24px', maxWidth: '960px' }}>
      <div className="hc-grid">
        
    {((vm.hc.cats) || []).map((c: any, _i0: number) => (
      <React.Fragment key={_i0}><button type="button" className="hc-cat" data-c={c.id} aria-pressed={c.on} onClick={vm.hcCat}><b>{c.t}</b><span>{c.d}</span></button></React.Fragment>
    ))}
    
      </div>
    </section>
    <section className="wrap" style={{ paddingBlock: '24px 40px', maxWidth: '960px' }}>
      <span className="kick" style={{ color: '#9B9AB4' }}>{vm.hc.listTitle}</span>
      <div style={{ marginTop: '8px', maxWidth: '760px' }}>
        
    {((vm.hc.articles) || []).map((a: any, _i0: number) => (
      <React.Fragment key={_i0}><details className="hc-q"><summary>{a.q}</summary><p>{a.a}</p></details></React.Fragment>
    ))}
    
        
    {vm.hc.empty ? (<><p className="muted" style={{ fontSize: '14px', padding: '16px 0' }}>{vm.t.help.noResults}</p></>) : null}
    
      </div>
    </section>
    <section className="wrap" style={{ paddingBlock: '8px 72px', maxWidth: '960px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '24px 40px', alignItems: 'center', padding: '28px 32px', borderRadius: '24px', background: '#fff', border: '1.5px solid transparent', backgroundImage: 'linear-gradient(#fff,#fff),linear-gradient(135deg,#FFE4CF 0%,#FFC9A8 55%,#FFC4BC 100%)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box,border-box' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '0' }}>
          <h3 style={{ fontSize: '20px', color: '#1B1464' }}>{vm.t.help.contact}</h3>
          <p style={{ fontSize: '13.5px', color: '#5B4A3F', lineHeight: '1.7' }}>{vm.t.help.contactSub} · <a style={{ color: '#1B1464', textDecoration: 'underline', textUnderlineOffset: '3px' }} href="mailto:support@tarmem.sa">support@tarmem.sa</a></p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <a className="btn" style={{ background: '#1B1464', color: '#fff', gap: '10px', textDecoration: 'none', borderRadius: '999px', padding: '12px 20px' }} href="https://wa.me/966500000000" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="18" height="18" fill="#25D366" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.6 11.6 0 0 0 4.4 3.9c1.6.7 2.3.7 3.1.6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.2-.3-.2-.5-.3Z" /></svg> {vm.t.help.wa}</a>
          <button className="btn btn-s" style={{ borderRadius: '999px', padding: '12px 20px', background: 'transparent' }} data-route="contact" onClick={vm.go}>{vm.t.help.form}</button>
        </div>
      </div>
    </section>
  </>);
}
