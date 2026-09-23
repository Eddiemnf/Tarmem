/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function PostProjectPage({ vm }: { vm: VM }) {
  return (<>
    
    {vm.post.done ? (<>
    <section className="wrap fade" style={{ paddingBlock: '56px 80px', maxWidth: '760px' }}>
      <div className="card post-done" style={{ padding: '40px 32px', gap: '16px' }}>
        <span className="post-done-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 10 17.5 19 7" /></svg></span>
        <span className="kick">{vm.t.post.doneKicker}</span>
        <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464', marginTop: '2px', textWrap: 'balance' }}>{vm.post.doneTitle}</h1>
        <p style={{ color: '#5B5A7A', fontSize: '15.5px', lineHeight: '1.8', maxWidth: '52ch', margin: '0' }}>{vm.t.post.doneLede}</p>
        <div className="post-done-code"><span className="muted">{vm.t.post.doneCode}</span><strong className="num">{vm.post.doneId}</strong></div>
        <ol className="post-done-next">
          
      {((vm.post.doneSteps) || []).map((d: any, _i0: number) => (
        <React.Fragment key={_i0}><li><span className="num">{d.n}</span><span>{d.text}</span></li></React.Fragment>
      ))}
      
        </ol>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '6px' }}>
          <button className="btn btn-p" onClick={vm.postOpenDone}>{vm.t.post.doneOpen}</button>
          <button className="btn btn-s" onClick={vm.postAnother}>{vm.t.post.doneAnother}</button>
        </div>
      </div>
    </section>
    </>) : null}
    
    
    {vm.post.editing ? (<>
    <section className="wrap fade" style={{ paddingBlock: '56px 80px', maxWidth: '760px' }}>
      <span className="kick">{vm.t.post.kicker}</span>
      <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464', marginTop: '10px' }}>{vm.t.post.title}</h1>
      <ol style={{ display: 'flex', gap: '20px', listStyle: 'none', padding: '0', margin: '24px 0 28px', fontSize: '13px', fontWeight: '500', flexWrap: 'wrap' }}>
        
      {((vm.postSteps) || []).map((s: any, _i0: number) => (
        <React.Fragment key={_i0}><li style={{ display: 'flex', alignItems: 'center', gap: '8px', color: s.color, fontWeight: s.weight }}><span className="num" style={{ width: '26px', height: '26px', borderRadius: '50%', border: `1.5px solid ${s.ring}`, background: s.fill, color: s.ink, display: 'grid', placeItems: 'center', fontSize: '12px', boxShadow: s.glow }}>{s.n}</span>{s.label}</li></React.Fragment>
      ))}
      
      </ol>
      <div className="card" style={{ padding: '32px', gap: '18px' }}>
        
      {vm.post.step1 ? (<>
          <div><label className="lbl" htmlFor="a11y-title">{vm.t.post.ptitle}<span style={{ color: '#D9401F', marginInlineStart: '3px' }}>*</span></label><input className="input" name="title" value={vm.post.f.title} onChange={vm.setPostField} placeholder={vm.t.post.ptitlePh} id="a11y-title" /></div>
          <div><label className="lbl" htmlFor="a11y-trade">{vm.t.post.category}</label><select className="input" name="trade" value={vm.post.f.trade} onChange={vm.setPostField} id="a11y-trade">
        {((vm.tradeGroups) || []).map((g: any, _i0: number) => (
          <React.Fragment key={_i0}><optgroup label={g.label}>
          {((g.items) || []).map((c: any, _i1: number) => (
            <React.Fragment key={_i1}><option value={c.id}>{c.label}</option></React.Fragment>
          ))}
          </optgroup></React.Fragment>
        ))}
        </select></div>
          <div><label className="lbl" htmlFor="a11y-desc">{vm.t.post.desc}<span style={{ color: '#D9401F', marginInlineStart: '3px' }}>*</span></label><textarea className="input" name="desc" value={vm.post.f.desc} onChange={vm.setPostField} placeholder={vm.t.post.descPh} id="a11y-desc" /></div>
        </>) : null}
      
        
      {vm.post.step2 ? (<>
          <div><label className="lbl" htmlFor="a11y-city">{vm.t.auth.city}</label><select className="input" name="city" value={vm.post.f.city} onChange={vm.setPostField} id="a11y-city">
        {((vm.cities) || []).map((c: any, _i0: number) => (
          <React.Fragment key={_i0}><option value={c.id}>{c.label}</option></React.Fragment>
        ))}
        </select></div>
          <div><label className="lbl" htmlFor="a11y-address">{vm.t.post.address}</label><input className="input" name="address" value={vm.post.f.address} onChange={vm.setPostField} id="a11y-address" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div><label className="lbl" htmlFor="a11y-min">{vm.t.post.budgetMin}<span style={{ color: '#D9401F', marginInlineStart: '3px' }}>*</span></label><input className="input" type="number" name="min" value={vm.post.f.min} onChange={vm.setPostField} placeholder="20000" id="a11y-min" /></div>
            <div><label className="lbl" htmlFor="a11y-max">{vm.t.post.budgetMax}<span style={{ color: '#D9401F', marginInlineStart: '3px' }}>*</span></label><input className="input" type="number" name="max" max="1000000" value={vm.post.f.max} onChange={vm.setPostField} placeholder="60000" id="a11y-max" /></div>
          </div>
          <div className="sugbox">
            <span className="evlbl">{vm.t.post.sugTitle}</span>
            
        {vm.post.sug.has ? (<>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div className="num" style={{ fontSize: '22px', fontWeight: '600', color: '#1B1464' }}>{vm.post.sug.range}</div>
                <button className="sugbtn" onClick={vm.useSuggestion}>{vm.t.post.sugUse}</button>
              </div>
              <div className="sugbar"><span className="sugbar-fill" style={{ insetInlineStart: `${vm.post.sug.left}%`, width: `${vm.post.sug.width}%` }}></span></div>
              <p className="muted" style={{ fontSize: '11.5px', lineHeight: '1.7', margin: '0' }}>{vm.post.sug.note}</p>
            </>) : null}
        
            
        {vm.post.sug.none ? (<><p className="muted" style={{ fontSize: '12px', margin: '0' }}>{vm.t.post.sugFew}</p></>) : null}
        
          </div>
          
        {vm.post.overCap ? (<><div className="pledge" style={{ background: '#FFF1EC', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}><span style={{ fontSize: '13px', color: '#8A2B12', maxWidth: '46ch' }}>{vm.t.post.capNote}</span><button className="btn btn-s btn-sm" data-route="contact" onClick={vm.go}>{vm.t.faq.contact}</button></div></>) : null}
        
          <div><span className="lbl">{vm.t.post.timing}</span><div className="seg"><label><input type="radio" name="timing" value="asap" checked={vm.post.tAsap} onChange={vm.setPostField} />{vm.t.post.asap}</label><label><input type="radio" name="timing" value="month" checked={vm.post.tMonth} onChange={vm.setPostField} />{vm.t.post.month}</label><label><input type="radio" name="timing" value="flexible" checked={vm.post.tFlex} onChange={vm.setPostField} />{vm.t.post.flexible}</label></div></div>
        </>) : null}
      
        
      {vm.post.step3 ? (<>
          <p style={{ fontSize: '13.5px', color: '#5B5A7A' }}>{vm.t.post.filesIntro}</p>
          {vm.launch && !vm.uploads ? null : (<label className="drop" style={{ padding: '36px' }}><input type="file" multiple style={{ display: 'none' }} onChange={vm.postUpload} />{vm.t.post.drop}</label>)}
          <p className="muted" style={{ fontSize: '12px', lineHeight: '1.7', margin: '0' }}>{vm.t.post.fileTypes}</p>
          
        {vm.post.hasFiles ? (<><ul style={{ margin: '0', padding: '0', listStyle: 'none', fontSize: '13.5px' }}>
          {((vm.post.files) || []).map((f: any, _i0: number) => (
            <React.Fragment key={_i0}><li style={{ padding: '8px 0', borderBottom: '1px solid #EEEDF5' }}>{f}</li></React.Fragment>
          ))}
          </ul></>) : null}
        
        </>) : null}
      
        
      {vm.post.step4 ? (<>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingBottom: '6px' }}>
            <span className="kick" style={{ color: '#9B9AB4' }}>{vm.post.secDetails}</span>
            <button className="lnkbtn" data-step="1" onClick={vm.postGoStep}>{vm.t.post.edit}</button>
          </div>
          <table className="table" style={{ marginBottom: '22px' }}><tbody>
            <tr><td className="muted">{vm.t.post.ptitle}</td><td style={{ fontWeight: '600', color: '#1B1464' }}>{vm.post.f.title}</td></tr>
            <tr><td className="muted">{vm.t.post.category}</td><td>{vm.post.tradeLabel}</td></tr>
            <tr><td className="muted">{vm.t.post.desc}</td><td style={{ color: '#5B5A7A' }}>{vm.post.f.desc}</td></tr>
          </tbody></table>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingBottom: '6px' }}>
            <span className="kick" style={{ color: '#9B9AB4' }}>{vm.post.secLocation}</span>
            <button className="lnkbtn" data-step="2" onClick={vm.postGoStep}>{vm.t.post.edit}</button>
          </div>
          <table className="table" style={{ marginBottom: '22px' }}><tbody>
            <tr><td className="muted">{vm.t.auth.city}</td><td>{vm.post.cityLabel}</td></tr>
            <tr><td className="muted">{vm.t.post.address}</td><td>{vm.post.addressLabel}</td></tr>
            <tr><td className="muted">{vm.t.post.budget}</td><td className="num">{vm.post.budgetLine}</td></tr>
            <tr><td className="muted">{vm.t.post.timing}</td><td>{vm.post.timingLabel}</td></tr>
          </tbody></table>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingBottom: '6px' }}>
            <span className="kick" style={{ color: '#9B9AB4' }}>{vm.post.secFiles}</span>
            <button className="lnkbtn" data-step="3" onClick={vm.postGoStep}>{vm.t.post.edit}</button>
          </div>
          <table className="table"><tbody>
            <tr><td className="muted">{vm.t.post.files}</td><td className="num">{vm.post.fileCount}</td></tr>
          </tbody></table>
          <p className="muted" style={{ fontSize: '12.5px' }}>{vm.post.feeReminder}</p>
          <div className="pledge">
            <span className="evlbl">{vm.t.post.pledgeTitle}<span style={{ color: '#D9401F', marginInlineStart: '3px' }}>*</span></span>
            <label className="radio" style={{ alignItems: 'flex-start', gap: '10px' }}><input type="checkbox" checked={vm.post.pledge} onChange={vm.togglePledge} /><span className="dot" style={{ borderRadius: '5px', marginTop: '3px' }}></span><span style={{ fontSize: '13.5px', lineHeight: '1.7', color: '#1B1464' }}>{vm.t.post.pledgeText}</span></label>
            <p className="muted" style={{ fontSize: '11.5px' }}>{vm.t.post.pledgeNote}</p>
          </div>
        </>) : null}
      
        
      {vm.post.error ? (<><p style={{ fontSize: '13px', color: '#D9401F' }}>{vm.post.error}</p></>) : null}
      
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          
      {vm.post.canBack ? (<><button className="btn btn-s" onClick={vm.postBack}>{vm.t.back}</button></>) : null}
      
          <button className="btn btn-p" disabled={vm.post.nextDisabled} onClick={vm.postNext}>{vm.post.nextLabel}</button>
        </div>
      </div>
    </section>
    </>) : null}
    
  </>);
}
