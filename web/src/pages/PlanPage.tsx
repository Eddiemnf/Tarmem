/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function PlanPage({ vm }: { vm: VM }) {
  return (<>
    <section className="fade" style={{ background: '#FAF9F7' }}>
      <div className="v-wrap" style={{ paddingBlock: 'clamp(26px,3vw,44px) clamp(56px,7vw,96px)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap' }}>
          <div>
            <span className="v-kick">{vm.t.ai.kicker}</span>
            <h1 className="v-h2" style={{ marginTop: '12px', maxWidth: '26ch' }}>{vm.t.ai.title}</h1>
            <p className="v-sm" style={{ marginTop: '10px', maxWidth: '54ch' }}>{vm.t.ai.sub}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="v-icb" type="button" onClick={vm.restartPlan}>{vm.t.ai.restart}</button>
            <button className="v-icb" type="button" data-route="post" onClick={vm.go}>{vm.t.ai.editForm}</button>
          </div>
        </div>

        <div className="v-plan-g" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.04fr) minmax(0,.96fr)', gap: 'clamp(22px,3vw,48px)', marginTop: 'clamp(26px,3vw,42px)', alignItems: 'start' }}>

          <div style={{ background: '#fff', border: '1px solid #E7E3DC', borderRadius: '20px', padding: 'clamp(20px,2.4vw,30px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
    {vm.pl.isEmpty ? (<><p className="v-msg v-msga" style={{ color: '#6E685E' }}>{vm.t.v3.aiPh}</p></>) : null}
    
            
    {((vm.pl.msgs) || []).map((m: any, _i0: number) => (
      <React.Fragment key={_i0}>
              <p className={`v-msg ${m.cls}`}>{m.text}</p>
            </React.Fragment>
    ))}
    
            
    {vm.pl.busy ? (<><span className="v-dot" aria-label={vm.t.ai.thinking}><i></i><i></i><i></i></span></>) : null}
    
            
    {vm.pl.hasError ? (<><p className="v-sm" style={{ color: '#D9401F', margin: '0' }}>{vm.pl.error}</p></>) : null}
    
            
    {vm.pl.canAnswer ? (<>
              <div style={{ borderTop: '1px solid #F0ECE5', paddingTop: '16px' }}>
                <div className="v-pillbar" style={{ maxWidth: 'none', boxShadow: 'none' }}>
                  <button className="v-round" type="button" style={{ width: '40px', height: '40px' }} onClick={vm.sendAnswer} aria-label={vm.t.ai.send2}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </button>
                  <input className="v-pillin" style={{ fontSize: '15px' }} value={vm.pl.q} onChange={vm.setPlanQ} placeholder={vm.t.ai.answerPh} aria-label={vm.t.ai.answerPh} />
                  <svg className="v-clip" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" onClick={vm.aiAttach}><path d="M21.4 11.05 12.25 20.2a5.5 5.5 0 0 1-7.78-7.78l8.49-8.49a3.67 3.67 0 0 1 5.19 5.19l-8.5 8.49a1.83 1.83 0 0 1-2.59-2.6l7.78-7.77" /></svg>
                </div>
              </div>
            </>) : null}
    
          </div>

          <div style={{ background: '#fff', border: '1px solid #E7E3DC', borderRadius: '20px', padding: 'clamp(20px,2.4vw,30px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
              <span className="v-kick">{vm.t.ai.brief}</span>
              
    {vm.pl.hasMissing ? (<><span className="v-badge">{vm.pl.missingLabel}</span></>) : null}
    
            </div>
            
    {vm.pl.hasTitle ? (<><h2 className="v-h2" style={{ fontSize: 'clamp(22px,2.2vw,30px)', marginTop: '8px' }}>{vm.pl.draftTitle}</h2></>) : null}
    
            <p className="v-sm" style={{ marginTop: '8px', fontSize: '12.5px', color: '#6E685E' }}>{vm.t.ai.briefNote}</p>
            <div style={{ marginTop: '14px' }}>
              
    {((vm.pl.fields) || []).map((f: any, _i0: number) => (
      <React.Fragment key={_i0}>
                <div className="v-fld"><label className="v-fldl" htmlFor={f.dom}>{f.label}</label><span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '0' }}><input className="v-fldi" style={{ flex: '1' }} id={f.dom} name={f.k} value={f.v} onChange={vm.setBriefField} placeholder={f.ph} /><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#B8B2A8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg></span></div>
              </React.Fragment>
    ))}
    
              <div className="v-fld" style={{ alignItems: 'start' }}>
                <span className="v-fldl" style={{ paddingTop: '9px' }}>{vm.t.ai.fFiles}</span>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  
    {((vm.pl.files) || []).map((fl: any, _i0: number) => (
      <React.Fragment key={_i0}>
                    <span className="v-chip" style={{ cursor: 'default', minHeight: '32px', fontSize: '12.5px', gap: '8px' }}>{fl.name}<button type="button" data-i={fl.i} onClick={vm.rmAiFile} aria-label={fl.rm} style={{ border: '0', background: 'none', cursor: 'pointer', color: '#6E685E', font: 'inherit', fontSize: '15px', padding: '0 2px' }}>×</button></span>
                  </React.Fragment>
    ))}
    
                  <button className="v-icb" type="button" onClick={vm.aiAttach}>+ {vm.t.ai.attach}</button>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginTop: '22px' }}>
              <button className="v-go" type="button" style={{ margin: '0' }} onClick={vm.runMatch} disabled={vm.pl.matchDisabled}>{vm.t.ai.matchRun}</button>
              <button className="v-icb" type="button" onClick={vm.toPost}>{vm.t.ai.toPost}</button>
            </div>
            <p className="v-sm" style={{ marginTop: '12px', fontSize: '12.5px', color: '#6E685E' }}>{vm.t.ai.toPostNote}</p>
          </div>
        </div>

        
    {vm.pl.matching ? (<>
          <p className="v-sm" style={{ marginTop: 'clamp(36px,4vw,60px)', display: 'flex', gap: '10px', alignItems: 'center' }}>{vm.t.ai.matching} <span className="v-dot"><i></i><i></i><i></i></span></p>
        </>) : null}
    

        
    {vm.pl.hasMatches ? (<>
          <div style={{ marginTop: 'clamp(40px,5vw,72px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
              <h2 className="v-h2" style={{ fontSize: 'clamp(23px,2.3vw,31px)', maxWidth: '26ch' }}>{vm.t.ai.matchTitle}</h2>
              <span className="v-badge">{vm.t.ai.preview}</span>
            </div>
            <p className="v-sm" style={{ marginTop: '8px', maxWidth: '72ch' }}>{vm.t.ai.matchNote}</p>
            <div style={{ marginTop: '20px' }}>
              
      {((vm.pl.matches) || []).map((m: any, _i0: number) => (
        <React.Fragment key={_i0}>
                <div className="v-tool">
                  <div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <span className="v-h3">{m.name}</span>
                      
        {m.verified ? (<><span className="tag tag-v">✓ {vm.t.verified}</span></>) : null}
        
                      <span className="v-sm num" style={{ color: '#6E685E' }}>{m.meta}</span>
                    </div>
                    <p className="v-sm" style={{ marginTop: '7px', maxWidth: '74ch' }}><span style={{ color: '#6E685E' }}>{m.whyLabel} </span>{m.why}</p>
                  </div>
                  <button className="v-icb" type="button" data-route="contractor" data-id={m.id} onClick={vm.go}>{vm.t.ai.viewProfile}</button>
                </div>
              </React.Fragment>
      ))}
      
              <div className="v-rule" style={{ background: '#E7E3DC' }}></div>
            </div>
          </div>
        </>) : null}
    

        <div style={{ marginTop: 'clamp(48px,6vw,84px)', maxWidth: '960px' }}>
          <span className="v-kick">{vm.t.ai.more}</span>
          <div style={{ marginTop: '16px' }}>
            
    {((vm.t.ai.tools) || []).map((x: any, _i0: number) => (
      <React.Fragment key={_i0}>
              <div className="v-tool">
                <div><h3 className="v-h3" style={{ fontSize: '17px' }}>{x.t}</h3><p className="v-sm" style={{ marginTop: '6px', maxWidth: '76ch' }}>{x.d}</p></div>
                <span className="v-badge">{x.s}</span>
              </div>
            </React.Fragment>
    ))}
    
            <div className="v-rule" style={{ background: '#E7E3DC' }}></div>
          </div>
        </div>
      </div>
    </section>
  </>);
}
