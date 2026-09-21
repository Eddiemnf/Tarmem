/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function HomePage({ vm }: { vm: VM }) {
  return (<>
    <section className="fade" style={{ background: '#fff' }}>
      <div className="ph">
        <video className="ph-vid" src="assets/hero.mp4" poster="assets/hero-poster.webp" autoPlay={true} muted={true} loop={true} playsInline={true} preload="auto" aria-hidden="true" tabIndex={-1}></video>
        
        <div className="ph-in">
          <div>
            <span className="ph-mark">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6 6 18" /></svg>
              {vm.t.hero2.mark}
            </span>
            <h1 className="ph-h1"><span>{vm.t.hero2.l1}</span><span>{vm.t.hero2.l2}</span></h1>
          </div>
          <div>
            <p className="ph-lead">{vm.dir === 'ltr' ? "Every renovation starts with one step. Share your project details," : "كل تجديد جميل يبدأ بخطوة. شاركنا تفاصيل مشروعك،"} <br />{vm.dir === 'ltr' ? "compare contractors' bids, and renovate with confidence." : "وقارن عروض المقاولين، وابدأ تجديد بيتك بثقة."}</p>
            <div className="ph-ctas">
              <button className="ph-b1" type="button" data-route="post" onClick={vm.go}>
                <span className="ph-b1-t">{vm.dir === 'ltr' ? "Start your project now" : "ابدأ مشروعك الآن"}</span>
                <i aria-hidden="true"><span className="ph-b1-a a1"><svg className="ph-ar" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 17 7 7" /><path d="M7 15V7h8" /></svg></span><span className="ph-b1-a a2"><svg className="ph-ar" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 17 7 7" /><path d="M7 15V7h8" /></svg></span></i>
              </button>
              <span className="ph-foot">{vm.t.hero2.foot}</span>
            </div>
          </div>
        </div>
        <div className="ph-rule"></div>
        <div className="ph-bar">
          <span className="ph-bar-i">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 8.2a4.2 4.2 0 0 1 7.5 2.3c0 5.4-7.5 10-7.5 10Z" /></svg>
            {vm.t.hero2.note}
          </span>
          {vm.launch ? null : (<span className="ph-replay ph-live" aria-live="off">
            <span className="ph-livedot" aria-hidden="true"></span>
            <b className="ph-live-n">{vm.onlineNow}</b>
            {vm.t.hero2.liveNow}
          </span>)}
          <button className="ph-down" type="button" onClick={vm.toAiBar}>
            {vm.t.hero2.discover}
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v16" /><path d="M6 14l6 6 6-6" /></svg>
          </button>
        </div>
      </div>
    </section>

    <section className="fade" style={{ background: '#fff' }}>
      <div className="v-wrap ai2">
        <div className="ai2-side">
        <div className="ai2-head">
          <label className="skick" htmlFor="v-ai-in"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6 6 18" /></svg> {vm.t.ai.label}</label>
          <h2 className="sh2 ai2-h">{vm.dir === 'ltr' ? "Describe your project and we'll connect you" : "صف لنا مشروعك، ونوصلك بالمقاول"} <br />{vm.dir === 'ltr' ? "with the right contractor." : "المناسب."}</h2>
        </div>
        {vm.launch ? null : (<div className="ai2-stats">
          <div className="ai2-stat"><span className="ai2-sv">{vm.hsA.v}</span><span className="ai2-sl">{vm.hsA.l}</span></div>
          <div className="ai2-stat"><span className="ai2-sv">{vm.hsB.v}</span><span className="ai2-sl">{vm.hsB.l}</span></div>
          <div className="ai2-stat"><span className="ai2-sv">{vm.hsC.v}</span><span className="ai2-sl">{vm.hsC.l}</span></div>
        </div>)}
        </div>
        <div className="ai2-main">
        <div className="ai2-box">
          <textarea id="v-ai-in" rows={2} value={vm.aiText} onChange={vm.setAi} placeholder={vm.t.ai.ph} />
          <div className="ai2-foot">
            <button className="ai2-att" type="button" onClick={vm.aiAttach}>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-4.5-4.5L3 21" /></svg>
              {vm.aiAttachLabel}
            </button>
            <button className="ai2-go" type="button" onClick={vm.startPlan} disabled={vm.aiEmpty} aria-label={vm.t.ai.send}>
              <span className="ai2-go-t">{vm.t.ai.send}</span>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={vm.arrowPath} /></svg>
            </button>
          </div>
        </div>
        <div className="ai2-chips">
          <span className="ai2-try">{vm.t.ai.try}</span>
          
    {((vm.aiSug) || []).map((g: any, _i0: number) => (
      <React.Fragment key={_i0}>
            <button className="ai2-chip" type="button" data-i={g.i} onClick={vm.useSug}>{g.q}</button>
          </React.Fragment>
    ))}
    
        </div>
        </div>
      </div>
      <div className="v-arc" style={{ background: '#fff' }}></div>
    </section>


    <section className="wrap" style={{ paddingBlock: 'clamp(26px,3.2vw,46px) 0' }}>
      <div style={{ maxWidth: '560px', marginBottom: '40px' }}><span className="skick"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6 6 18" /></svg> {vm.t.home.stepsKicker}</span><h2 className="sh2" style={{ minHeight: '51px', maxWidth: '914px' }}>{vm.dir === 'ltr' ? "Four steps from describing your project to handover" : "أربع خطوات من وصف مشروعك إلى استلامه"}</h2></div>
      <div className="hw-grid hw-relay">
        
    {((vm.homePhases) || []).map((p: any, _i0: number) => (
      <React.Fragment key={_i0}>
          <div className="hw-ph">
            <div className="hw-card">
              <span className="hw-ic" dangerouslySetInnerHTML={p.icon}></span>
              <div><h3 style={{ fontSize: '19px', color: '#1B1464', letterSpacing: '-.01em' }}>{p.t}</h3><span style={{ display: 'block', fontSize: '12.5px', color: '#B0612F', fontWeight: '600', marginTop: '3px' }}>{p.s}</span></div>
              <div className="hw-b">
      {((p.b) || []).map((x: any, _i1: number) => (
        <React.Fragment key={_i1}><span><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>{x}</span></React.Fragment>
      ))}
      </div>
            </div>
          </div>
        </React.Fragment>
    ))}
    
      </div>
    </section>

    <section className="wrap g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '20px', paddingBlock: 'clamp(34px,4.2vw,60px) clamp(48px,6vw,88px)', minHeight: '519px', marginTop: '78px', marginBottom: '78px' }}>
      <div style={{ position: 'relative', overflow: 'hidden', background: '#FDF5F1', color: '#1B1464', borderRadius: '24px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <span style={{ position: 'absolute', insetInlineEnd: '-14%', top: '-32%', width: '58%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,120,34,.13),transparent 68%)', pointerEvents: 'none' }}></span>
        <span style={{ position: 'absolute', insetInlineStart: '-12%', bottom: '-38%', width: '50%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,68,85,.09),transparent 70%)', pointerEvents: 'none' }}></span>
        <span className="skick"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6 6 18" /></svg> {vm.t.home.hoKicker}</span>
        <h3 style={{ position: 'relative', fontSize: 'clamp(22px,2.2vw,28px)', lineHeight: '1.3', color: '#1B1464', margin: '2px 0 0', fontWeight: '600' }}>{vm.t.home.hoHead}</h3>
        <p style={{ position: 'relative', fontSize: '15px', color: '#5B5A7A', flex: '1' }}>{vm.t.home.hoDesc}</p>
        <div style={{ position: 'relative', paddingTop: '14px', display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap' }}><button className="btn btn-p" data-route="post" onClick={vm.go}>{vm.t.home.hoCta}</button>{vm.launch ? null : (<a className="hlnk" data-route="contractors" onClick={vm.go}>{vm.t.nav.contractors}</a>)}</div>
      </div>
      <div style={{ background: '#F8F7FC', borderRadius: '24px', padding: '40px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <span className="skick"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6 6 18" /></svg> {vm.t.home.coKicker}</span>
        <h3 style={{ fontSize: 'clamp(22px,2.2vw,28px)', lineHeight: '1.3', color: '#1B1464', margin: '2px 0 0', fontWeight: '600' }}>{vm.t.home.coHead}</h3>
        <p style={{ fontSize: '15px', color: '#5B5A7A', flex: '1' }}>{vm.t.home.coDesc}</p>
        <div style={{ paddingTop: '14px', display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap' }}><button className="btn btn-s" data-route="auth" data-signup="contractor" onClick={vm.goAuth}>{vm.t.home.coCta}</button>{vm.launch ? null : (<a className="hlnk" data-route="browse" onClick={vm.go}>{vm.t.nav.browseProjects}</a>)}</div>
      </div>
    </section>

    <section className="wrap" style={{ paddingBlock: 'clamp(40px,5vw,72px)', borderTop: '1px solid #EEEDF5' }}>
      <h2 style={{ fontSize: 'clamp(24px,2.8vw,34px)', color: '#1B1464' }}>{vm.t.home.hireTitle}</h2>
      <div className="hire-grid">
          <button type="button" className="hire-c" data-trade={vm.hc0.id} onClick={vm.hireTrade}>
            <img className="hire-img" draggable="false" src="assets/trades/01.jpg" alt={vm.hc0.label} />
            <span className="hire-p"><span>{vm.hc0.label}</span><svg className="hire-ar" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
          </button>
          <button type="button" className="hire-c" data-trade={vm.hc1.id} onClick={vm.hireTrade}>
            <img className="hire-img" draggable="false" src="assets/trades/03.jpg" alt={vm.hc1.label} />
            <span className="hire-p"><span>{vm.hc1.label}</span><svg className="hire-ar" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
          </button>
          <button type="button" className="hire-c" data-trade={vm.hc2.id} onClick={vm.hireTrade}>
            <img className="hire-img" draggable="false" src="assets/trades/02.jpg" alt={vm.hc2.label} />
            <span className="hire-p"><span>{vm.hc2.label}</span><svg className="hire-ar" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
          </button>
          <button type="button" className="hire-c" data-trade={vm.hc3.id} onClick={vm.hireTrade}>
            <img className="hire-img" draggable="false" src="assets/trades/04.jpg" alt={vm.hc3.label} />
            <span className="hire-p"><span>{vm.hc3.label}</span><svg className="hire-ar" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
          </button>
          <button type="button" className="hire-c" data-trade={vm.hc4.id} onClick={vm.hireTrade}>
            <img className="hire-img" draggable="false" src="assets/trades/05.jpg" alt={vm.hc4.label} />
            <span className="hire-p"><span>{vm.hc4.label}</span><svg className="hire-ar" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
          </button>
          <button type="button" className="hire-c" data-trade={vm.hc5.id} onClick={vm.hireTrade}>
            <img className="hire-img" draggable="false" src="assets/trades/06.jpg" alt={vm.hc5.label} />
            <span className="hire-p"><span>{vm.hc5.label}</span><svg className="hire-ar" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
          </button>
          <button type="button" className="hire-c" data-trade={vm.hc6.id} onClick={vm.hireTrade}>
            <img className="hire-img" draggable="false" src="assets/trades/07.jpg" alt={vm.hc6.label} />
            <span className="hire-p"><span>{vm.hc6.label}</span><svg className="hire-ar" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
          </button>
          <button type="button" className="hire-c" data-trade={vm.hc7.id} onClick={vm.hireTrade}>
            <img className="hire-img" draggable="false" src="assets/trades/08.jpg" alt={vm.hc7.label} />
            <span className="hire-p"><span>{vm.hc7.label}</span><svg className="hire-ar" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
          </button>
          <button type="button" className="hire-c" data-trade={vm.hc8.id} onClick={vm.hireTrade}>
            <img className="hire-img" draggable="false" src="assets/trades/09.jpg" alt={vm.hc8.label} />
            <span className="hire-p"><span>{vm.hc8.label}</span><svg className="hire-ar" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
          </button>
          <button type="button" className="hire-c" data-trade={vm.hc9.id} onClick={vm.hireTrade}>
            <img className="hire-img" draggable="false" src="assets/trades/10.jpg" alt={vm.hc9.label} />
            <span className="hire-p"><span>{vm.hc9.label}</span><svg className="hire-ar" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
          </button>
      </div>
    </section>

    {vm.launch ? null : (<section className="wrap" style={{ paddingBlock: 'clamp(44px,5.4vw,80px) clamp(40px,5vw,72px)', borderTop: '1px solid #EEEDF5' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ maxWidth: '560px' }}>
          <span className="skick"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6 6 18" /></svg> {vm.t.home.testiKicker}</span>
          <h2 className="sh2">{vm.t.home.testiTitle}</h2>
        </div>
        <p style={{ fontSize: '15px', color: '#6E685E', margin: '0', maxWidth: '380px', lineHeight: '1.8' }}>{vm.t.home.testiSub}</p>
      </div>
      <div className="tsti-wrap">
        <div className="tsti-track">
          
    {((vm.testimonials) || []).map((tm: any, _i0: number) => (
      <React.Fragment key={_i0}>
            <figure className="tsti">
              <div className="tsti-stars" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z" /></svg>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z" /></svg>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z" /></svg>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z" /></svg>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z" /></svg>
              </div>
              <blockquote className="tsti-q">{tm.quote}</blockquote>
              <figcaption className="tsti-who">
                <span className="tsti-av" aria-hidden="true">{tm.initial}</span>
                <span style={{ textAlign: 'start' }}>
                  <span className="tsti-n" style={{ display: 'block' }}>{tm.n}</span>
                  <span className="tsti-r" style={{ display: 'block' }}>{tm.r}</span>
                </span>
              </figcaption>
            </figure>
          </React.Fragment>
    ))}
    
          
    {((vm.testimonials) || []).map((tm2: any, _i0: number) => (
      <React.Fragment key={_i0}>
            <figure className="tsti" aria-hidden="true">
              <div className="tsti-stars" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z" /></svg>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z" /></svg>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z" /></svg>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z" /></svg>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z" /></svg>
              </div>
              <blockquote className="tsti-q">{tm2.quote}</blockquote>
              <figcaption className="tsti-who">
                <span className="tsti-av" aria-hidden="true">{tm2.initial}</span>
                <span style={{ textAlign: 'start' }}>
                  <span className="tsti-n" style={{ display: 'block' }}>{tm2.n}</span>
                  <span className="tsti-r" style={{ display: 'block' }}>{tm2.r}</span>
                </span>
              </figcaption>
            </figure>
          </React.Fragment>
    ))}
    
        </div>
        
      </div>
    </section>)}

    {vm.launch ? null : (<section className="wrap" style={{ paddingBlock: 'clamp(40px,5vw,72px) clamp(56px,7vw,100px)', borderTop: '1px solid #EEEDF5' }}>
      <div style={{ maxWidth: '520px' }}>
        <span className="skick"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6 6 18" /></svg> {vm.t.home.partnersKicker}</span>
        <h2 className="sh2">{vm.t.home.partnersTitle}</h2>
      </div>
      <div className="prtnrs">
        
    {((vm.partners) || []).map((p: any, _i0: number) => (
      <React.Fragment key={_i0}>
          <div className="prtnr" data-p={p.id}>
            <img draggable="false" src={p.logoSrc} alt={p.n} />
          </div>
        </React.Fragment>
    ))}
    
      </div>
    </section>)}

  </>);
}
