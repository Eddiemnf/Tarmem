/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function BrowseProjectsPage({ vm }: { vm: VM }) {
  return (<>
    <section className="wrap fade" style={{ paddingBlock: '40px 80px' }}>
      <span className="kick">{vm.t.browse.kicker}</span>
      <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464', marginTop: '10px' }}>{vm.t.browse.title}</h1>
      <p style={{ color: '#5B5A7A', maxWidth: '60ch', marginTop: '8px' }}>{vm.t.browse.sub}</p>
      <div className="bfil">
        <span className="evlbl">{vm.t.bfilter.title}</span>
        <select className="input" name="city" value={vm.bf.city} onChange={vm.setBFilter} style={{ maxWidth: '190px' }}><option value="">{vm.t.bfilter.anyCity}</option>
    {((vm.cities) || []).map((c: any, _i0: number) => (
      <React.Fragment key={_i0}><option value={c.id}>{c.label}</option></React.Fragment>
    ))}
    </select>
        <select className="input" name="trade" value={vm.bf.trade} onChange={vm.setBFilter} style={{ maxWidth: '210px' }}><option value="">{vm.t.bfilter.anyTrade}</option>
    {((vm.tradeGroups) || []).map((g: any, _i0: number) => (
      <React.Fragment key={_i0}><optgroup label={g.label}>
      {((g.items) || []).map((c: any, _i1: number) => (
        <React.Fragment key={_i1}><option value={c.id}>{c.label}</option></React.Fragment>
      ))}
      </optgroup></React.Fragment>
    ))}
    </select>
        <select className="input" name="min" value={vm.bf.min} onChange={vm.setBFilter} style={{ maxWidth: '180px' }}><option value="">{vm.t.bfilter.anyBudget}</option><option value="20000">{vm.curPre}20,000+{vm.curPost}</option><option value="50000">{vm.curPre}50,000+{vm.curPost}</option><option value="100000">{vm.curPre}100,000+{vm.curPost}</option></select>
        
    {vm.bf.any ? (<><button className="clearall" onClick={vm.clearBFilter}>{vm.t.bfilter.clear}</button></>) : null}
    
        <span className="muted num" style={{ marginInlineStart: 'auto', fontSize: '12.5px' }}>{vm.bf.countLabel}</span>
      </div>
      
    {vm.bf.empty ? (<><p className="muted" style={{ fontSize: '13.5px', marginTop: '20px' }}>{vm.t.bfilter.none}</p></>) : null}
    
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '20px', marginTop: '24px' }}>
        
    {((vm.openProjects) || []).map((p: any, _i0: number) => (
      <React.Fragment key={_i0}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}><span className="kick">{p.tradeLabel}</span><span className="muted" style={{ fontSize: '12px' }}>{p.postedLabel}</span></div>
            <h3 style={{ fontSize: '20px', color: '#1B1464' }}>{p.title}</h3>
            <p style={{ fontSize: '14px', color: '#5B5A7A', display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: '1' }}>{p.desc}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}><span className="muted num" style={{ fontSize: '13px' }}>{p.cityLabel} · {p.budgetSentence} · {p.bidsLabel}</span><span className="muted" style={{ fontSize: '11.5px', lineHeight: '1.6' }}>{vm.t.browse.vatNote}</span></div>
            <button className="btn btn-p btn-sm" data-route="project" data-id={p.id} data-tab="bids" onClick={vm.go}>{p.bidCta}</button>
          </div>
        </React.Fragment>
    ))}
    
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '28px' }}>
        
    {vm.hasMoreOpen ? (<>
          <button className="btn btn-s btn-sm" onClick={vm.loadMoreOpen} style={{ padding: '8px 18px', fontSize: '12.5px', fontWeight: '500' }}>{vm.t.browse.loadMore} <span className="num" style={{ opacity: '.55' }}>+{vm.moreOpenCount}</span></button>
        </>) : null}
    
        <span className="muted num" style={{ fontSize: '11.5px' }}>{vm.openTally}</span>
      </div>
    </section>
  </>);
}
