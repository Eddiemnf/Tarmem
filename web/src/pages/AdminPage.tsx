/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function AdminPage({ vm }: { vm: VM }) {
  return (<>
    <section className="wrap fade gside" style={{ paddingBlock: '40px 80px', maxWidth: '1320px', display: 'grid', gridTemplateColumns: '230px minmax(0,1fr)', gap: '32px', alignItems: 'start' }}>
      <aside style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'sticky', top: '88px' }}>
        <span className="kick" style={{ padding: '0 14px 10px' }}>{vm.t.admin.kicker}</span>
        
    {((vm.adminTabs) || []).map((a: any, _i0: number) => (
      <React.Fragment key={_i0}><span className="side" data-tab={a.id} aria-current={a.cur} onClick={vm.setAdminTab}>{a.label}
      {a.count ? (<><span className="tag tag-a num" style={{ marginInlineStart: 'auto' }}>{a.count}</span></>) : null}
      </span></React.Fragment>
    ))}
    
      </aside>
      <div>
        
    {vm.atab.late ? (<>
          <div>
            <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464' }}>{vm.t.admin.lr.title}</h1>
            <p className="muted" style={{ fontSize: '13px', marginTop: '6px', maxWidth: '66ch', lineHeight: '1.7' }}>{vm.t.admin.lr.sub}</p>
          </div>
          <div className="qstrip num" style={{ marginTop: '22px' }}>
            
      {((vm.lr.kpis) || []).map((k: any, _i0: number) => (
        <React.Fragment key={_i0}><div className="qitem"><span className="qv" style={{ color: k.c }}>{k.v}</span><span className="ql">{k.l}</span></div></React.Fragment>
      ))}
      
          </div>

          <h3 style={{ fontSize: '18px', color: '#1B1464', marginBottom: '12px' }}>{vm.t.admin.lr.strikesTitle}</h3>
          <div className="card" style={{ padding: '8px 18px 4px', gap: '0', marginBottom: '28px' }}>
            <div className="tbl-wrap"><table className="table">
              <thead><tr><th>{vm.t.admin.lr.hProject}</th><th>{vm.t.admin.lr.hMilestone}</th><th>{vm.t.admin.lr.hStrike}</th><th>{vm.t.admin.lr.hFee}</th><th>{vm.t.admin.lr.hStatus}</th><th></th></tr></thead>
              <tbody>
      {((vm.lr.strikes) || []).map((k: any, _i0: number) => (
        <React.Fragment key={_i0}>
                <tr>
                  <td><div style={{ fontWeight: '600', color: '#1B1464', cursor: 'pointer' }} data-route="project" data-id={k.pid} onClick={vm.go}>{k.title}</div><div className="muted" style={{ fontSize: '12px', marginTop: '3px' }}>{k.co}</div></td>
                  <td className="nw" style={{ fontSize: '13px' }}>{k.ms}<div className="muted num" style={{ fontSize: '12px', marginTop: '3px' }}>{k.late}</div></td>
                  <td className="nw"><span className="strike"><i className={k.d1}></i><i className={k.d2}></i><i className={k.d3}></i> {k.n}</span></td>
                  <td className="nw num" style={{ fontWeight: '600', color: '#1B1464' }}>{k.fee}</td>
                  <td className="nw"><span className={`tag ${k.stCls}`}>{k.stL}</span></td>
                  <td><div className="rowact">
                    
        {k.canRemind ? (<><button className="btn btn-g btn-sm" data-id={k.id} onClick={vm.lrRemind}>{k.remindL}</button></>) : null}
        
                    
        {k.canWaive ? (<><button className="btn btn-g btn-sm" data-id={k.id} onClick={vm.lrWaive}>{vm.t.admin.lr.waive}</button></>) : null}
        
                  </div></td>
                </tr>
              </React.Fragment>
      ))}
      </tbody>
            </table></div>
          </div>

          <h3 style={{ fontSize: '18px', color: '#1B1464', marginBottom: '12px' }}>{vm.t.admin.lr.refundsTitle}</h3>
          <div className="card" style={{ padding: '8px 18px 4px', gap: '0' }}>
            <div className="tbl-wrap"><table className="table">
              <thead><tr><th>{vm.t.admin.lr.hRef}</th><th>{vm.t.admin.lr.hAmount}</th><th>{vm.t.admin.lr.hReason}</th><th>{vm.t.admin.lr.hStatus}</th><th></th></tr></thead>
              <tbody>
      {((vm.lr.refunds) || []).map((rf: any, _i0: number) => (
        <React.Fragment key={_i0}>
                <tr>
                  <td><span className="code" style={{ fontWeight: '500', fontSize: '12px' }}>{rf.id}</span><div style={{ fontWeight: '600', color: '#1B1464', marginTop: '6px', cursor: 'pointer' }} data-route="project" data-id={rf.pid} onClick={vm.go}>{rf.title}</div><div className="muted" style={{ fontSize: '12px', marginTop: '2px' }}>{rf.by} · {rf.age}</div></td>
                  <td className="nw num" style={{ fontWeight: '600', color: '#1B1464' }}>{vm.curPre}{rf.amount}{vm.curPost}</td>
                  <td style={{ fontSize: '13px', maxWidth: '26ch' }}>{rf.reason}</td>
                  <td className="nw"><span className={`tag ${rf.stCls}`}>{rf.stL}</span></td>
                  <td><div className="rowact">
                    
        {rf.canReview ? (<><button className="btn btn-g btn-sm" data-id={rf.id} data-st="review" onClick={vm.lrRefund}>{vm.t.admin.lr.review}</button></>) : null}
        
                    
        {rf.canDecide ? (<><button className="btn btn-g btn-sm" style={{ color: '#1B7A3E' }} data-id={rf.id} data-st="approved" onClick={vm.lrRefund}>{vm.t.admin.lr.approve}</button><button className="btn btn-g btn-sm" style={{ color: '#B3261E' }} data-id={rf.id} data-st="declined" onClick={vm.lrRefund}>{vm.t.admin.lr.decline}</button></>) : null}
        
                    
        {rf.canPay ? (<><button className="btn btn-g btn-sm" style={{ color: '#1B7A3E' }} data-id={rf.id} data-st="paid" onClick={vm.lrRefund}>{vm.t.admin.lr.markPaid}</button></>) : null}
        
                  </div></td>
                </tr>
              </React.Fragment>
      ))}
      </tbody>
            </table></div>
          </div>

          <div className="card" style={{ marginTop: '20px', padding: '22px 26px', gap: '10px', background: '#FAFAFD' }}>
            <span className="kick" style={{ color: '#9B9AB4' }}>{vm.t.admin.lr.policy}</span>
            <ul style={{ margin: '0', paddingInlineStart: '18px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13.5px', color: '#3A385C', lineHeight: '1.6' }}>
      {((vm.t.admin.lr.policyL) || []).map((pl: any, _i0: number) => (
        <React.Fragment key={_i0}><li>{pl}</li></React.Fragment>
      ))}
      </ul>
          </div>
        </>) : null}
    

        
    {vm.atab.promos ? (<>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464' }}>{vm.t.admin.pm.title}</h1>
              <p className="muted" style={{ fontSize: '13px', marginTop: '6px', maxWidth: '60ch', lineHeight: '1.7' }}>{vm.t.admin.pm.sub}</p>
            </div>
            
      {vm.pm.closed ? (<><button className="btn btn-p" onClick={vm.pmOpen}>{vm.t.admin.pm.newBtn}</button></>) : null}
      
          </div>
          <div className="qstrip num" style={{ marginTop: '22px' }}>
            
      {((vm.pm.kpis) || []).map((k: any, _i0: number) => (
        <React.Fragment key={_i0}><div className="qitem"><span className="qv" style={{ color: '#1B1464' }}>{k.v}</span><span className="ql">{k.l}</span></div></React.Fragment>
      ))}
      
          </div>

          
      {vm.pm.open ? (<>
            <div className="card" style={{ padding: '26px', gap: '20px', marginBottom: '20px', borderColor: '#FFD3B4' }}>
              <div className="pm-form">
                <div><label className="lbl" htmlFor="pm-code">{vm.t.admin.pm.fCode}</label>
                  <div style={{ display: 'flex', gap: '8px' }}><input id="pm-code" className="input code" style={{ textTransform: 'uppercase', background: '#fff', fontSize: '14px' }} name="code" value={vm.pm.d.code} onChange={vm.pmSet} maxLength={12} /><button className="btn btn-s" type="button" onClick={vm.pmGen}>{vm.t.admin.pm.gen}</button></div></div>
                <div><span className="lbl">{vm.t.admin.pm.fType}</span>
                  <div className="an-seg">
        {((vm.pm.types) || []).map((ty: any, _i0: number) => (
          <React.Fragment key={_i0}><button type="button" data-v={ty.id} aria-pressed={ty.on} onClick={vm.pmType}>{ty.l}</button></React.Fragment>
        ))}
        </div></div>
                <div><label className="lbl" htmlFor="pm-value">{vm.t.admin.pm.fValue} <span className="muted">({vm.pm.unit})</span></label><input id="pm-value" className="input num" type="number" min="1" name="value" value={vm.pm.d.value} onChange={vm.pmSet} /></div>
                <div><label className="lbl" htmlFor="pm-applies">{vm.t.admin.pm.fApplies}</label>
                  <select id="pm-applies" className="input" name="applies" value={vm.pm.d.applies} onChange={vm.pmSet}>
        {((vm.pm.appliesOpts) || []).map((o: any, _i0: number) => (
          <React.Fragment key={_i0}><option value={o.id}>{o.l}</option></React.Fragment>
        ))}
        </select></div>
                <div><label className="lbl" htmlFor="pm-min">{vm.t.admin.pm.fMin}</label><input id="pm-min" className="input num" type="number" min="0" step="1000" name="min" value={vm.pm.d.min} onChange={vm.pmSet} /></div>
                <div><label className="lbl" htmlFor="pm-max">{vm.t.admin.pm.fMax}</label><input id="pm-max" className="input num" type="number" min="1" name="max" value={vm.pm.d.max} onChange={vm.pmSet} /></div>
                <div><label className="lbl" htmlFor="pm-per">{vm.t.admin.pm.fPer}</label><input id="pm-per" className="input num" type="number" min="1" max="10" name="per" value={vm.pm.d.per} onChange={vm.pmSet} /></div>
                <div><label className="lbl" htmlFor="pm-start">{vm.t.admin.pm.fStart}</label><input id="pm-start" className="input num" type="date" name="start" value={vm.pm.d.start} onChange={vm.pmSet} /></div>
                <div><label className="lbl" htmlFor="pm-end">{vm.t.admin.pm.fEnd}</label><input id="pm-end" className="input num" type="date" name="end" value={vm.pm.d.end} onChange={vm.pmSet} /></div>
                <div className="full"><label className="lbl" htmlFor="pm-note">{vm.t.admin.pm.fNote}</label><input id="pm-note" className="input" name="note" value={vm.pm.d.note} onChange={vm.pmSet} placeholder={vm.t.admin.pm.fNotePh} /></div>
              </div>
              
        {vm.pm.err ? (<><p style={{ fontSize: '13px', color: '#B3261E' }}>{vm.pm.err}</p></>) : null}
        
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}><button className="btn btn-s" onClick={vm.pmClose}>{vm.t.admin.pm.cancel}</button><button className="btn btn-p" onClick={vm.pmSave}>{vm.t.admin.pm.save}</button></div>
            </div>
          </>) : null}
      

          <div className="card" style={{ padding: '8px 18px 4px', gap: '0' }}>
            <div className="tbl-wrap"><table className="table">
              <thead><tr><th>{vm.t.admin.pm.hCode}</th><th>{vm.t.admin.pm.hDiscount}</th><th>{vm.t.admin.pm.hUses}</th><th>{vm.t.admin.pm.hStatus}</th><th></th></tr></thead>
              <tbody>
      {((vm.pm.rows) || []).map((p: any, _i0: number) => (
        <React.Fragment key={_i0}>
                <tr>
                  <td><span className="code">{p.code}</span>
        {p.note ? (<><div className="muted" style={{ fontSize: '12px', marginTop: '5px', maxWidth: '26ch' }}>{p.note}</div></>) : null}
        </td>
                  <td className="nw"><div style={{ fontWeight: '600', color: '#1B1464' }} className="num">{p.disc}</div>
        {p.minL ? (<><div className="muted num" style={{ fontSize: '12px' }}>{p.minL}</div></>) : null}
        <div className="muted" style={{ fontSize: '12px', marginTop: '3px' }}>{p.appliesL}</div></td>
                  <td><div className="num" style={{ fontWeight: '600' }}>{p.usesL}</div><div className="an-bar" style={{ width: '84px', marginTop: '6px' }}><span style={{ width: `${p.usePct}%` }}></span></div></td>
                  <td className="nw"><span className={`tag ${p.stCls}`}>{p.stL}</span><div className="num muted" style={{ fontSize: '12px', marginTop: '6px' }}>{p.window}</div></td>
                  <td><div className="rowact">
                    <button className="btn btn-g btn-sm" data-code={p.code} onClick={vm.pmCopy}>{p.copyL}</button>
                    
        {p.canToggle ? (<><button className="btn btn-g btn-sm" data-id={p.id} onClick={vm.pmToggle}>{p.toggleL}</button></>) : null}
        
                    
        {p.canArchive ? (<><button className="btn btn-g btn-sm" data-id={p.id} onClick={vm.pmArchive}>{vm.t.admin.pm.archive}</button></>) : null}
        
                  </div></td>
                </tr>
              </React.Fragment>
      ))}
      </tbody>
            </table></div>
          </div>

          <div className="card" style={{ marginTop: '20px', padding: '22px 26px', gap: '10px', background: '#FAFAFD' }}>
            <span className="kick" style={{ color: '#9B9AB4' }}>{vm.t.admin.pm.rules}</span>
            <ul style={{ margin: '0', paddingInlineStart: '18px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13.5px', color: '#3A385C', lineHeight: '1.6' }}>
      {((vm.t.admin.pm.rulesL) || []).map((ru: any, _i0: number) => (
        <React.Fragment key={_i0}><li>{ru}</li></React.Fragment>
      ))}
      </ul>
          </div>
        </>) : null}
    

        
    {vm.atab.affiliates ? (<>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464' }}>{vm.t.admin.af.title}</h1>
              <p className="muted" style={{ fontSize: '13px', marginTop: '6px', maxWidth: '64ch', lineHeight: '1.7' }}>{vm.t.admin.af.sub}</p>
            </div>
            
      {vm.af.closed ? (<><button className="btn btn-p" onClick={vm.afOpen}>{vm.t.admin.af.newBtn}</button></>) : null}
      
          </div>
          <div className="qstrip num" style={{ marginTop: '22px' }}>
            
      {((vm.af.kpis) || []).map((k: any, _i0: number) => (
        <React.Fragment key={_i0}><div className="qitem"><span className="qv" style={{ color: k.c }}>{k.v}</span><span className="ql">{k.l}</span></div></React.Fragment>
      ))}
      
          </div>

          
      {vm.af.open ? (<>
            <div className="card" style={{ padding: '26px', gap: '20px', marginBottom: '20px', borderColor: '#FFD3B4' }}>
              <div className="pm-form">
                <div><label className="lbl" htmlFor="af-name">{vm.t.admin.af.fName}</label><input id="af-name" className="input" name="name" value={vm.af.d.name} onChange={vm.afSet} /></div>
                <div><label className="lbl" htmlFor="af-type">{vm.t.admin.af.fType}</label>
                  <select id="af-type" className="input" name="type" value={vm.af.d.type} onChange={vm.afSet}>
        {((vm.af.typeOpts) || []).map((o: any, _i0: number) => (
          <React.Fragment key={_i0}><option value={o.id}>{o.l}</option></React.Fragment>
        ))}
        </select></div>
                <div><label className="lbl" htmlFor="af-rate">{vm.t.admin.af.fRate}</label><input id="af-rate" className="input num" type="number" min="1" max="50" name="rate" value={vm.af.d.rate} onChange={vm.afSet} /></div>
                <div><label className="lbl" htmlFor="af-code">{vm.t.admin.af.fCode}</label><input id="af-code" className="input code" style={{ textTransform: 'uppercase', background: '#fff', fontSize: '14px' }} name="code" value={vm.af.d.code} onChange={vm.afSet} maxLength={12} /></div>
                <div className="full" style={{ gridColumn: 'span 2' }}><label className="lbl" htmlFor="af-contact">{vm.t.admin.af.fContact}</label><input id="af-contact" className="input" style={{ direction: 'ltr' }} name="contact" value={vm.af.d.contact} onChange={vm.afSet} placeholder={vm.t.admin.af.fContactPh} /></div>
              </div>
              
        {vm.af.err ? (<><p style={{ fontSize: '13px', color: '#B3261E' }}>{vm.af.err}</p></>) : null}
        
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}><button className="btn btn-s" onClick={vm.afClose}>{vm.t.admin.af.cancel}</button><button className="btn btn-p" onClick={vm.afSave}>{vm.t.admin.af.save}</button></div>
            </div>
          </>) : null}
      

          <div className="card" style={{ padding: '8px 18px 4px', gap: '0' }}>
            <div className="tbl-wrap"><table className="table">
              <thead><tr><th>{vm.t.admin.af.hPartner}</th><th>{vm.t.admin.af.hFunnel}</th><th>{vm.t.admin.af.hEarned}</th><th>{vm.t.admin.af.hStatus}</th><th></th></tr></thead>
              <tbody>
      {((vm.af.rows) || []).map((a: any, _i0: number) => (
        <React.Fragment key={_i0}>
                <tr>
                  <td><div style={{ fontWeight: '600', color: '#1B1464' }}>{a.name}</div><div className="muted" style={{ fontSize: '12px', margin: '3px 0 6px' }}>{a.typeL} · {a.rate}%</div><span className="code" style={{ fontWeight: '500', fontSize: '12px' }}>{a.link}</span></td>
                  <td className="nw num" style={{ fontSize: '13px' }}><div>{a.clicks} <span className="muted" style={{ fontSize: '11.5px' }}>{vm.t.admin.af.hClicks}</span></div><div>{a.signups} <span className="muted" style={{ fontSize: '11.5px' }}>{vm.t.admin.af.hSignups}</span></div><div style={{ fontWeight: '600', color: '#1B7A3E' }}>{a.projects} <span className="muted" style={{ fontSize: '11.5px', fontWeight: '400' }}>{vm.t.admin.af.hProjects}</span></div></td>
                  <td className="nw num"><div style={{ fontWeight: '600', color: '#1B1464' }}>{vm.curPre}{a.earned}{vm.curPost}</div><div style={{ fontSize: '12.5px', fontWeight: '600', color: a.owedC, marginTop: '4px' }}>{vm.t.admin.af.hOwed} {vm.curPre}{a.owed}{vm.curPost}</div></td>
                  <td className="nw"><span className={`tag ${a.stCls}`}>{a.stL}</span></td>
                  <td><div className="rowact">
                    <button className="btn btn-g btn-sm" data-link={a.link} onClick={vm.afCopy}>{a.copyL}</button>
                    
        {a.canPay ? (<><button className="btn btn-g btn-sm" style={{ color: '#1B7A3E' }} data-id={a.id} onClick={vm.afPay}>{vm.t.admin.af.pay}</button></>) : null}
        
                    <button className="btn btn-g btn-sm" data-id={a.id} onClick={vm.afToggle}>{a.toggleL}</button>
                  </div></td>
                </tr>
              </React.Fragment>
      ))}
      </tbody>
            </table></div>
          </div>

          <div className="card" style={{ marginTop: '20px', padding: '22px 26px', gap: '12px', background: '#FAFAFD' }}>
            <span className="kick" style={{ color: '#9B9AB4' }}>{vm.t.admin.af.terms}</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '14px 24px' }}>
              
      {((vm.af.terms) || []).map((tm: any, _i0: number) => (
        <React.Fragment key={_i0}><div><div style={{ fontSize: '13px', fontWeight: '600', color: '#1B1464' }}>{tm.k}</div><div className="muted" style={{ fontSize: '12.5px', lineHeight: '1.6', marginTop: '3px' }}>{tm.v}</div></div></React.Fragment>
      ))}
      
            </div>
          </div>
        </>) : null}
    

        
    {vm.atab.analytics ? (<>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464' }}>{vm.t.admin.an.title}</h1>
              <p className="muted" style={{ fontSize: '13px', marginTop: '6px', maxWidth: '56ch' }}>{vm.t.admin.an.sub}</p>
            </div>
            <span className={`tag ${vm.an.srcCls}`}>{vm.an.srcLabel}</span>
          </div>

          <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.7fr)', gap: '20px', marginTop: '24px' }}>
            <div className="card an-live">
              <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', fontWeight: '500', letterSpacing: '.04em', textTransform: 'uppercase' }}><i className="an-dot"></i>{vm.t.admin.an.liveNow}</span>
              <span className="num an-big" style={{ position: 'relative' }}>{vm.live.now}</span>
              <span style={{ position: 'relative', fontSize: '12.5px', color: 'rgba(255,255,255,.72)' }}>{vm.t.admin.an.liveSub}</span>
              <div className="an-list" style={{ position: 'relative', marginTop: '10px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.72)' }}>{vm.t.admin.an.devices}</span>
                
      {((vm.live.devices) || []).map((d: any, _i0: number) => (
        <React.Fragment key={_i0}>
                  <div className="an-row"><span>{d.l}</span><span className="num" style={{ fontWeight: '600' }}>{d.pct}%</span><div className="an-bar"><span style={{ width: `${d.pct}%` }}></span></div></div>
                </React.Fragment>
      ))}
      
              </div>
            </div>
            <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '20px' }}>
              <div className="card" style={{ gap: '14px' }}>
                <span className="kick" style={{ color: '#9B9AB4' }}>{vm.t.admin.an.byPage}</span>
                <div className="an-list">
                  
      {((vm.live.pages) || []).map((p: any, _i0: number) => (
        <React.Fragment key={_i0}>
                    <div className="an-row"><span>{p.l}</span><span className="num" style={{ fontWeight: '600', color: '#1B1464' }}>{p.v}</span><div className="an-bar"><span style={{ width: `${p.pct}%` }}></span></div></div>
                  </React.Fragment>
      ))}
      
                </div>
              </div>
              <div className="card" style={{ gap: '10px' }}>
                <span className="kick" style={{ color: '#9B9AB4' }}>{vm.t.admin.an.feed}</span>
                <div className="an-feed">
                  
      {((vm.live.feed) || []).map((f: any, _i0: number) => (
        <React.Fragment key={_i0}>
                    <div><i></i><span style={{ minWidth: '0' }}><span style={{ color: '#1B1464', fontWeight: '500' }}>{f.city}</span> <span className="muted">{f.what}</span></span><span className="muted num" style={{ fontSize: '11.5px', whiteSpace: 'nowrap' }}>{f.when}</span></div>
                  </React.Fragment>
      ))}
      
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '16px', marginTop: '34px', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '20px', color: '#1B1464' }}>{vm.t.admin.an.today}</h3>
            <span className="muted" style={{ fontSize: '12.5px' }}>{vm.t.admin.an.vsYest}</span>
          </div>
          <div className="qstrip an-today num" style={{ marginTop: '14px' }}>
            
      {((vm.an.today) || []).map((k: any, _i0: number) => (
        <React.Fragment key={_i0}>
              <div className="qitem"><span className="qv" style={{ color: '#1B1464' }}>{k.v}</span><span className="ql">{k.l}</span><span className={`an-delta ${k.cls}`} style={{ alignSelf: 'flex-start', marginTop: '6px' }}>{k.d}</span></div>
            </React.Fragment>
      ))}
      
          </div>

          <div className="card" style={{ gap: '18px', padding: '26px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <span className="kick" style={{ color: '#9B9AB4' }}>{vm.t.admin.an.traffic} · {vm.t.admin.an.total}</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '6px' }}>
                  <span className="num" style={{ fontSize: '34px', fontWeight: '600', color: '#1B1464', lineHeight: '1.1' }}>{vm.an.total}</span>
                  <span className={`an-delta ${vm.an.totalCls}`}>{vm.an.totalDelta}</span>
                  <span className="muted" style={{ fontSize: '12px' }}>{vm.t.admin.an.prev}</span>
                </div>
              </div>
              <div className="an-seg" role="group">
                
      {((vm.an.ranges) || []).map((rg: any, _i0: number) => (
        <React.Fragment key={_i0}><button type="button" data-r={rg.id} aria-pressed={rg.on} onClick={vm.setAnRange}>{rg.l}</button></React.Fragment>
      ))}
      
              </div>
            </div>
            <svg className="an-chart" viewBox="0 0 640 200" aria-hidden="true">
              <defs><linearGradient id="anGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FF7722" stopOpacity=".28" /><stop offset="1" stopColor="#FF7722" stopOpacity="0" /></linearGradient></defs>
              <line x1="0" y1="10" x2="640" y2="10" stroke="#F1F0F8" />
              <line x1="0" y1="70" x2="640" y2="70" stroke="#F1F0F8" />
              <line x1="0" y1="130" x2="640" y2="130" stroke="#F1F0F8" />
              <line x1="0" y1="190" x2="640" y2="190" stroke="#E6E5F0" />
              <path d={vm.an.area} fill="url(#anGrad)" />
              <path d={vm.an.line} fill="none" stroke="#FF7722" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              
      {((vm.an.dots) || []).map((p: any, _i0: number) => (
        <React.Fragment key={_i0}><circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#FF7722" strokeWidth="2.5" /></React.Fragment>
      ))}
      
              <circle cx={vm.an.lastX} cy={vm.an.lastY} r="6" fill="#1B1464" />
            </svg>
            <div className="an-x">
      {((vm.an.labels) || []).map((lb: any, _i0: number) => (
        <React.Fragment key={_i0}><span>{lb}</span></React.Fragment>
      ))}
      </div>
          </div>

          <div className="g3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '20px', marginTop: '20px' }}>
            <div className="card" style={{ gap: '14px' }}><span className="kick" style={{ color: '#9B9AB4' }}>{vm.t.admin.an.topPages}</span>
              <div className="an-list">
      {((vm.an.topPages) || []).map((p: any, _i0: number) => (
        <React.Fragment key={_i0}><div className="an-row"><span>{p.l}</span><span className="num" style={{ fontWeight: '600', color: '#1B1464' }}>{p.v}</span><div className="an-bar"><span style={{ width: `${p.pct}%` }}></span></div></div></React.Fragment>
      ))}
      </div>
            </div>
            <div className="card" style={{ gap: '14px' }}><span className="kick" style={{ color: '#9B9AB4' }}>{vm.t.admin.an.sources}</span>
              <div className="an-list">
      {((vm.an.sources) || []).map((p: any, _i0: number) => (
        <React.Fragment key={_i0}><div className="an-row"><span>{p.l}</span><span className="num" style={{ fontWeight: '600', color: '#1B1464' }}>{p.v}</span><div className="an-bar"><span style={{ width: `${p.pct}%`, background: '#1B1464' }}></span></div></div></React.Fragment>
      ))}
      </div>
            </div>
            <div className="card" style={{ gap: '14px' }}><span className="kick" style={{ color: '#9B9AB4' }}>{vm.t.admin.an.cities}</span>
              <div className="an-list">
      {((vm.an.cities) || []).map((p: any, _i0: number) => (
        <React.Fragment key={_i0}><div className="an-row"><span>{p.l}</span><span className="num" style={{ fontWeight: '600', color: '#1B1464' }}>{p.v}</span><div className="an-bar"><span style={{ width: `${p.pct}%`, background: '#1B7A3E' }}></span></div></div></React.Fragment>
      ))}
      </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: '20px', padding: '26px', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ maxWidth: '52ch' }}>
                <h3 style={{ fontSize: '18px', color: '#1B1464' }}>{vm.t.admin.an.ga}</h3>
                <p className="muted" style={{ fontSize: '13px', marginTop: '6px', lineHeight: '1.7' }}>{vm.t.admin.an.gaSub}</p>
              </div>
              
      {vm.an.gaOn ? (<><span className="tag tag-g num">{vm.t.admin.an.gaOn} {vm.an.gaId}</span></>) : null}
      
            </div>
            
      {vm.an.gaOff ? (<>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <input className="input num" style={{ maxWidth: '280px', direction: 'ltr' }} value={vm.an.gaDraft} onChange={vm.setGa} placeholder={vm.t.admin.an.gaPh} aria-label={vm.t.admin.an.ga} />
                <button className="btn btn-p" onClick={vm.connectGa}>{vm.t.admin.an.gaBtn}</button>
              </div>
              
        {vm.an.gaErr ? (<><p style={{ fontSize: '12.5px', color: '#B3261E' }}>{vm.t.admin.an.gaErr}</p></>) : null}
        
              <p className="muted" style={{ fontSize: '12px' }}>{vm.t.admin.an.gaNote}</p>
            </>) : null}
      
            
      {vm.an.gaOn ? (<><button className="btn btn-s btn-sm" style={{ alignSelf: 'flex-start' }} onClick={vm.disconnectGa}>{vm.t.admin.an.gaOff}</button></>) : null}
      
          </div>
        </>) : null}
    
        
    {vm.atab.overview ? (<>
          <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464' }}>{vm.t.admin.overview}</h1>
          <div className="qstrip num">
            
      {((vm.adminQuick) || []).map((s: any, _i0: number) => (
        <React.Fragment key={_i0}>
              <div className="qitem"><span className="qv" style={{ color: s.color }}>{s.v}</span><span className="ql">{s.l}</span></div>
            </React.Fragment>
      ))}
      
          </div>
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '20px', color: '#1B1464' }}>{vm.t.admin.finTitle}</h3>
            <p className="muted" style={{ fontSize: '12.5px', marginTop: '4px' }}>{vm.t.admin.finSub}</p>
          </div>

          <div className="card" style={{ gap: '22px', marginBottom: '20px', padding: '26px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <span className="kick" style={{ color: '#9B9AB4' }}>{vm.t.admin.finFlow}</span>
                <p className="muted" style={{ fontSize: '12.5px', marginTop: '6px', maxWidth: '44ch' }}>{vm.t.admin.finFlowSub}</p>
              </div>
              <div style={{ textAlign: 'end' }}>
                <span className="muted" style={{ fontSize: '12.5px', display: 'block' }}>{vm.t.admin.finPaid}</span>
                <span className="num" style={{ fontSize: '34px', fontWeight: '600', color: '#1B1464', lineHeight: '1.1' }}>{vm.curPre}{vm.fin.paid}{vm.curPost}</span>
              </div>
            </div>
            <div style={{ display: 'flex', height: '18px', borderRadius: '10px', overflow: 'hidden', background: '#EEEDF5' }}>
              <span style={{ width: `${vm.fin.coPct}%`, background: 'linear-gradient(90deg,#0F5C2E,#2FA45F)', transition: 'width .45s ease' }}></span>
              <span style={{ width: `${vm.fin.tmPct}%`, background: 'linear-gradient(90deg,#FF8800,#FF4455)', transition: 'width .45s ease' }}></span>
              <span style={{ width: `${vm.fin.escPct}%`, background: '#D9D7E8', transition: 'width .45s ease' }}></span>
            </div>
            <div className="g3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '14px' }}>
              <div className="flowcell">
                <span className="flowdot" style={{ background: '#1B7A3E' }}></span>
                <div><span className="flowlbl">{vm.t.admin.finToCo}</span><span className="num flowval">{vm.curPre}{vm.fin.coEarned}{vm.curPost}</span><span className="num flowpct">{vm.fin.coPct}%</span></div>
              </div>
              <div className="flowcell">
                <span className="flowdot" style={{ background: '#FF5A3C' }}></span>
                <div><span className="flowlbl">{vm.t.admin.finToTm}</span><span className="num flowval">{vm.curPre}{vm.fin.revReal}{vm.curPost}</span><span className="num flowpct">{vm.fin.tmPct}%</span></div>
              </div>
              <div className="flowcell">
                <span className="flowdot" style={{ background: '#C9C7DC' }}></span>
                <div><span className="flowlbl">{vm.t.admin.finEscrow}</span><span className="num flowval">{vm.curPre}{vm.fin.held}{vm.curPost}</span><span className="num flowpct">{vm.fin.escPct}%</span></div>
              </div>
            </div>
          </div>

          <div className="g2" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,1fr)', gap: '20px', marginBottom: '32px' }}>
            <div className="card" style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg,#0B4A25,#125F31 55%,#17743C)', border: '0', color: '#fff', gap: '16px', padding: '26px' }}>
              <span style={{ position: 'absolute', insetInlineEnd: '-22%', top: '-46%', width: '70%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle,rgba(160,255,190,.3),transparent 68%)', pointerEvents: 'none' }}></span>
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: '12.5px', color: '#fff', display: 'block' }}>{vm.t.admin.finRev} · {vm.t.admin.finRealised}</span>
                  <span className="num" style={{ fontSize: '34px', fontWeight: '600', lineHeight: '1.1' }}>{vm.curPre}{vm.fin.revReal}{vm.curPost}</span>
                </div>
                <div style={{ textAlign: 'end' }}>
                  <span style={{ fontSize: '12px', color: '#fff', display: 'block' }}>{vm.t.admin.finPipeline}</span>
                  <span className="num" style={{ fontSize: '19px', fontWeight: '600', color: '#EAFFF1' }}>+ {vm.curPre}{vm.fin.revProj}{vm.curPost}</span>
                </div>
              </div>
              <div style={{ position: 'relative', display: 'flex', height: '10px', borderRadius: '6px', overflow: 'hidden', background: 'rgba(255,255,255,.22)' }}>
                <span style={{ width: `${vm.fin.realPct}%`, background: '#fff', transition: 'width .45s ease' }}></span>
                <span style={{ width: `${vm.fin.projPct}%`, background: 'repeating-linear-gradient(135deg,rgba(255,255,255,.55) 0 6px,rgba(255,255,255,.2) 6px 12px)', transition: 'width .45s ease' }}></span>
              </div>
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#fff' }}>
                <span>{vm.t.admin.finTotal} · <span className="num" style={{ fontWeight: '600', color: '#fff' }}>{vm.curPre}{vm.fin.revTotal}{vm.curPost}</span></span>
                <span className="num">{vm.fin.realPct}% / {vm.fin.projPct}%</span>
              </div>
            </div>
            <div className="card" style={{ gap: '14px', padding: '26px' }}>
              <span className="kick" style={{ color: '#9B9AB4' }}>{vm.t.admin.finRevDetail}</span>
              <div className="finrow"><span>{vm.t.admin.finComm}</span><span className="num">{vm.curPre}{vm.fin.comm}{vm.curPost}</span></div>
              <div className="finrow"><span>{vm.t.admin.finFees}</span><span className="num">{vm.curPre}{vm.fin.fees}{vm.curPost}</span></div>
              <div className="finrow" style={{ border: '0' }}><span>{vm.t.admin.finAvg}</span><span className="num">{vm.curPre}{vm.fin.avg}{vm.curPost}</span></div>
              <p className="muted" style={{ fontSize: '11.5px', marginTop: 'auto' }}>{vm.t.admin.finProjNote}</p>
            </div>
          </div>

          <div className="card" style={{ padding: '8px' }}><h3 style={{ fontSize: '18px', color: '#1B1464', padding: '12px 12px 4px' }}>{vm.t.admin.allProjects}</h3>
          <table className="table"><thead><tr><th>ID</th><th>{vm.t.project}</th><th>{vm.t.roles.homeowner}</th><th>{vm.t.roles.contractor}</th><th>{vm.t.status}</th><th>{vm.t.ws.amount}</th></tr></thead>
            <tbody>
      {((vm.allProjects) || []).map((p: any, _i0: number) => (
        <React.Fragment key={_i0}><tr className="row-h"><td className="muted num">{p.id}</td><td style={{ fontWeight: '500' }}>{p.title}</td><td>{p.ownerName}</td><td>{p.contractorName}</td><td><span className={`tag ${p.tagClass}`}>{p.statusLabel}</span></td><td className="num">{vm.curPre}{p.amount}{vm.curPost}</td></tr></React.Fragment>
      ))}
      </tbody></table></div>
        </>) : null}
    
        
    {vm.atab.verification ? (<>
          <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464' }}>{vm.t.admin.verification}</h1>
          <p style={{ color: '#5B5A7A', maxWidth: '60ch', margin: '8px 0 24px' }}>{vm.t.admin.verifSub}</p>
          <div className="card" style={{ padding: '8px' }}><table className="table"><thead><tr><th>{vm.t.roles.contractor}</th><th>{vm.t.admin.checks}</th><th>{vm.t.admin.submitted}</th><th></th></tr></thead>
            <tbody>
      {((vm.verifQueue) || []).map((v: any, _i0: number) => (
        <React.Fragment key={_i0}>
              <tr><td><div style={{ fontWeight: '600', color: '#1B1464' }}>{v.name}</div><div className="muted" style={{ fontSize: '12.5px' }}>{v.city}</div></td>
                <td><div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {((v.checks) || []).map((ch: any, _i1: number) => (
          <React.Fragment key={_i1}><span className={`tag ${ch.cls}`}>{ch.label}</span></React.Fragment>
        ))}
        </div></td>
                <td className="muted">{v.date}</td>
                <td style={{ textAlign: 'end', whiteSpace: 'nowrap' }}><div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}><button className="btn btn-p btn-sm" data-id={v.id} onClick={vm.approveVerif}>{vm.t.admin.approve}</button><button className="btn btn-s btn-sm" data-id={v.id} onClick={vm.rejectVerif}>{vm.t.admin.reject}</button></div></td></tr>
            </React.Fragment>
      ))}
      </tbody></table>
            
      {vm.noVerif ? (<><p className="muted" style={{ padding: '16px 12px' }}>{vm.t.admin.queueEmpty}</p></>) : null}
      </div>
        </>) : null}
    
        
    {vm.atab.support ? (<>
          <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464', marginBottom: '24px' }}>{vm.t.admin.support}</h1>
          <div className="card" style={{ padding: '8px' }}><table className="table"><thead><tr><th>ID</th><th>{vm.t.project}</th><th>{vm.t.admin.issue}</th><th>{vm.t.status}</th><th></th></tr></thead>
            <tbody>
      {((vm.cases) || []).map((c: any, _i0: number) => (
        <React.Fragment key={_i0}><tr><td className="muted num">{c.id}</td><td style={{ fontWeight: '500' }}>{c.project}</td><td style={{ fontSize: '13.5px', color: '#5B5A7A' }}>{c.issue}</td><td><span className={`tag ${c.cls}`}>{c.status}</span></td><td style={{ textAlign: 'end' }}>
        {c.open ? (<><button className="btn btn-s btn-sm" data-id={c.id} onClick={vm.closeCase}>{vm.t.admin.resolve}</button></>) : null}
        </td></tr></React.Fragment>
      ))}
      </tbody></table></div>
        </>) : null}
    
        
    {vm.atab.payments ? (<>
          <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464' }}>{vm.t.admin.payments}</h1>
          <p style={{ color: '#5B5A7A', maxWidth: '60ch', margin: '8px 0 24px' }}>{vm.t.admin.paySub}</p>
          <div className="card" style={{ padding: '8px' }}><table className="table"><thead><tr><th>{vm.t.project}</th><th>{vm.t.ws.milestone}</th><th>{vm.t.ws.amount}</th><th>{vm.t.status}</th></tr></thead>
            <tbody>
      {((vm.payRows) || []).map((p: any, _i0: number) => (
        <React.Fragment key={_i0}><tr><td style={{ fontWeight: '500' }}>{p.project}</td><td>{p.ms}</td><td className="num">{vm.curPre}{p.amount}{vm.curPost}</td><td><span className={`tag ${p.cls}`}>{p.status}</span></td></tr></React.Fragment>
      ))}
      </tbody></table></div>
        </>) : null}
    
        
    {vm.atab.users ? (<>
          <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464', marginBottom: '24px' }}>{vm.t.admin.users}</h1>
          <div className="card" style={{ padding: '8px' }}><table className="table"><thead><tr><th>{vm.t.auth.fullName}</th><th>{vm.t.admin.role}</th><th>{vm.t.auth.city}</th><th>{vm.t.status}</th></tr></thead>
            <tbody>
      {((vm.userRows) || []).map((u: any, _i0: number) => (
        <React.Fragment key={_i0}><tr><td style={{ fontWeight: '500' }}>{u.name}</td><td>{u.role}</td><td>{u.city}</td><td><span className={`tag ${u.cls}`}>{u.status}</span></td></tr></React.Fragment>
      ))}
      </tbody></table></div>
        </>) : null}
    
      </div>
    </section>
  </>);
}
