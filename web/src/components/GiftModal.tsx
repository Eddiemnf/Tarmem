/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import type { VM } from '../state/viewModel';

export default function GiftModal({ vm }: { vm: VM }) {
  return (<>
    {vm.giftOpen ? (<>
    <div className="modalveil" onClick={vm.giftLater}></div>
    <div className="modal gift" role="dialog" aria-labelledby="gift-title">
      <div className="gift-card">
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <span className="skick" style={{ color: '#FFB27A' }}><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6 6 18" /></svg> {vm.t.gift.kicker}</span>
          <img src="assets/tarmem-logo-white.png" alt="Tarmem" style={{ height: '22px', width: 'auto', opacity: '.9' }} />
        </div>
        <div style={{ position: 'relative' }}><span className="muted" style={{ fontSize: '12px', color: 'rgba(255,255,255,.72)', display: 'block' }}>{vm.t.gift.valueL}</span><span className="num gift-val">{vm.curPre}500{vm.curPost}</span></div>
        <div className="gift-meta"><span>{vm.t.gift.codeL}<b className="code" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', fontSize: '12px', padding: '3px 8px', marginTop: '4px' }}>{vm.giftCode}</b></span><span style={{ textAlign: 'end' }}>{vm.t.gift.expiresL}<b className="num">{vm.t.gift.expires}</b></span></div>
      </div>
      <div className="gift-body">
        <div>
          <h2 id="gift-title" style={{ fontSize: '22px', color: '#1B1464', lineHeight: '1.3' }}>{vm.t.gift.title}</h2>
          <p style={{ fontSize: '14px', color: '#5B5A7A', lineHeight: '1.75', marginTop: '8px' }}>{vm.t.gift.body}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
          <button className="btn btn-p" onClick={vm.giftStart}>{vm.t.gift.cta}</button>
          <button className="btn btn-g" onClick={vm.giftLater}>{vm.t.gift.later}</button>
        </div>
        <p className="muted" style={{ fontSize: '11.5px', lineHeight: '1.6' }}>{vm.t.gift.fine}</p>
      </div>
    </div>
  </>) : null}
    </>);
}
