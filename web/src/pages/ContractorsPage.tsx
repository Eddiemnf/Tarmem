/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';
import { ImageSlot } from '../components/ImageSlot';

export default function ContractorsPage({ vm }: { vm: VM }) {
  return (<>
    <section style={{ background: 'linear-gradient(180deg,#F7F6FC,#fff)' }}>
      <div className="wrap fade" style={{ paddingBlock: '56px 36px' }}>
        <span className="kick">{vm.t.search.eyebrow}</span>
        <h1 style={{ fontSize: 'clamp(30px,3.4vw,44px)', color: '#1B1464', margin: '12px 0 12px' }}>{vm.t.search.title}</h1>
        <p style={{ color: '#5B5A7A', fontSize: '16px', maxWidth: '56ch' }}>{vm.t.search.sub}</p>
      </div>
    </section>
    <section className="wrap" style={{ paddingBlock: '8px 80px' }}>
      <div className="gside" style={{ display: 'grid', gridTemplateColumns: '210px minmax(0,1fr)', gap: '28px', alignItems: 'start' }}>
        <aside className="fpanel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="kick" style={{ color: '#9B9AB4' }}>{vm.t.search.filters}</span>
            
    {vm.hasFilters ? (<><button className="clearall" onClick={vm.clearFilters}>{vm.t.search.clearAll}</button></>) : null}
    
          </div>
          <div className="fgrp"><label className="lbl">{vm.t.search.keyword}</label><input className="input" name="q" value={vm.filt.q} onChange={vm.setFilter} placeholder={vm.t.search.keywordPh} /></div>
          <div className="fgrp"><label className="lbl">{vm.t.auth.city}</label><select className="input" name="city" value={vm.filt.city} onChange={vm.setFilter}><option value="">{vm.t.search.allCities}</option>
    {((vm.cities) || []).map((c: any, _i0: number) => (
      <React.Fragment key={_i0}><option value={c.id}>{c.label}</option></React.Fragment>
    ))}
    </select></div>
          <div className="fgrp"><label className="lbl">{vm.t.search.trade}</label><select className="input" name="trade" value={vm.filt.trade} onChange={vm.setFilter}><option value="">{vm.t.search.allTrades}</option>
    {((vm.tradeGroups) || []).map((g: any, _i0: number) => (
      <React.Fragment key={_i0}><optgroup label={g.label}>
      {((g.items) || []).map((c: any, _i1: number) => (
        <React.Fragment key={_i1}><option value={c.id}>{c.label}</option></React.Fragment>
      ))}
      </optgroup></React.Fragment>
    ))}
    </select></div>
          <div className="fgrp"><label className="radio"><input type="checkbox" name="verified" checked={vm.filt.verified} onChange={vm.setFilter} /><span className="dot" style={{ borderRadius: '5px' }}></span>{vm.t.search.verifiedOnly}</label></div>
        </aside>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap', paddingBottom: '18px', borderBottom: '1px solid #EEEDF5' }}>
            <p className="muted num" style={{ fontSize: '13.5px' }}>{vm.t.search.showing} {vm.pageFrom}–{vm.pageTo} {vm.t.search.of} {vm.resultCount} {vm.t.search.results}</p>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#7A7994' }}>{vm.t.search.sort}
              <select className="bareselect" name="sort" value={vm.filt.sort} onChange={vm.setFilter}><option value="rating">{vm.t.search.sortRating}</option><option value="done">{vm.t.search.sortDone}</option></select>
            </label>
          </div>
          <div className="cgrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '28px 24px', marginTop: '32px' }}>
            
    {((vm.results) || []).map((c: any, _i0: number) => (
      <React.Fragment key={_i0}>
              <article className="ccard">
                <div className="cphoto">
                  <ImageSlot id={c.imgId} shape="rect" fit="contain" placeholder="Project photo or logo" style={{ width: '100%', height: '100%' }} />
                  <button className="csave" data-id={c.id} onClick={vm.toggleSave} aria-pressed={c.savedFlag}>{c.saveLabel}</button>
                </div>
                <div className="cbody">
                  <div className="cinfo">
                  <h3 className="cname" data-route="contractor" data-id={c.id} onClick={vm.go}>{c.name}
      {c.verified ? (<><span className="cvcheck" title={vm.t.verified}>✓</span></>) : null}
      </h3>
                  <div className="cmeta num">
                    <span className="crate">★ {c.rating}</span>
                    
      {c.top ? (<><span className="ctop">{vm.t.search.topRated}</span></>) : null}
      
                    <span className="muted">{c.reviews} {vm.t.reviewsWord}</span>
                    <span className="cdot"></span>
                    <span className="muted">{c.city}</span>
                    <span className="cdot"></span>
                    <span className="muted">{c.done} {vm.t.projectsWord}</span>
                  </div>
                  <p className="ctrades">{c.tradeLine}</p>
                  </div>
                  <div className="cfoot">
                    <button className="cview" data-route="contractor" data-id={c.id} onClick={vm.go}><span>{vm.t.search.view}</span></button>
                  </div>
                </div>
              </article>
            </React.Fragment>
    ))}
    
          </div>
          <nav className="pager">
            <button className="pg pg-arrow" disabled={vm.pg.firstDisabled} data-p={vm.pg.prev} onClick={vm.setPage}>{vm.t.search.prev}</button>
            
    {((vm.pg.items) || []).map((p: any, _i0: number) => (
      <React.Fragment key={_i0}>
              <button className="pg num" aria-current={p.cur} disabled={p.gap} data-p={p.n} onClick={vm.setPage}>{p.label}</button>
            </React.Fragment>
    ))}
    
            <button className="pg pg-arrow" disabled={vm.pg.lastDisabled} data-p={vm.pg.next} onClick={vm.setPage}>{vm.t.search.next}</button>
          </nav>
        </div>
      </div>
    </section>
  </>);
}
