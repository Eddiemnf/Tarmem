/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function WalletPage({ vm }: { vm: VM }) {
  return (<>
    <section className="wrap fade" style={{ paddingBlock: '40px 80px' }}>
      <span className="kick">{vm.t.wallet.kicker}</span>
      <h1 style={{ fontSize: 'clamp(26px,3vw,34px)', color: '#1B1464', margin: '10px 0 12px' }}>{vm.wl.title}</h1>
      <p style={{ color: '#5B5A7A', fontSize: '15.5px', maxWidth: '62ch', lineHeight: '1.8' }}>{vm.wl.sub}</p>
      <div className="rgrid" style={{ marginTop: '28px' }}>
        
    {((vm.wl.stats) || []).map((st: any, _i0: number) => (
      <React.Fragment key={_i0}>
          <div className="ritem"><div className="num" style={{ fontSize: '26px', fontWeight: '600', color: st.color, lineHeight: '1.1' }}>SAR {st.v}</div><div className="muted" style={{ fontSize: '12.5px', marginTop: '6px' }}>{st.l}</div></div>
        </React.Fragment>
    ))}
    
      </div>

      <div className="gside" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '32px', marginTop: '36px', alignItems: 'start' }}>
        
    {vm.wl.isHo ? (<>
          <div className="card" style={{ padding: '28px', gap: '18px' }}>
            <span className="kick">{vm.t.wallet.addFunds}</span>
            <div><label className="lbl">{vm.t.wallet.amount}</label><input className="input num" name="amount" type="number" value={vm.wl.amount} onChange={vm.setWallet} placeholder="20000" /></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span className="lbl">{vm.t.wallet.method}</span>
              
      {((vm.wl.methods) || []).map((m: any, _i0: number) => (
        <React.Fragment key={_i0}>
                <label className="payopt" aria-pressed={m.sel}>
                  <input type="radio" name="wmethod" value={m.id} checked={m.on} onChange={vm.setWallet} style={{ display: 'none' }} />
                  <span className="paydot"></span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '14px', fontWeight: '600', color: '#1B1464' }}>{m.label}</span><span className="muted" style={{ fontSize: '12px' }}>{m.note}</span></span>
                </label>
              </React.Fragment>
      ))}
      
            </div>
            
      {vm.wl.showBank ? (<>
              <div className="nafbox" style={{ gap: '10px' }}>
                <p style={{ fontSize: '12.5px', color: '#5B5A7A', lineHeight: '1.7' }}>{vm.t.wallet.transferHow}</p>
                <table className="table"><tbody>
                  <tr><td className="muted">{vm.t.wallet.bank}</td><td>{vm.wl.bankName}</td></tr>
                  <tr><td className="muted">{vm.t.wallet.beneficiary}</td><td>{vm.wl.beneficiary}</td></tr>
                  <tr><td className="muted">{vm.t.wallet.iban}</td><td className="num" style={{ direction: 'ltr', textAlign: 'start' }}>{vm.wl.escrowIban}</td></tr>
                  <tr><td className="muted">{vm.t.wallet.ref}</td><td className="num" style={{ direction: 'ltr', textAlign: 'start', fontWeight: '600' }}>{vm.wl.ref}</td></tr>
                </tbody></table>
              </div>
            </>) : null}
      
            
      {vm.wl.error ? (<><p style={{ fontSize: '13px', color: '#D9401F' }}>{vm.wl.error}</p></>) : null}
      
            
      {vm.wl.notice ? (<><div className="nafbox" style={{ background: '#F1FBF5', borderColor: '#BFE4CC' }}><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span className="fcheck" style={{ width: '26px', height: '26px', fontSize: '13px' }}>✓</span><span style={{ fontSize: '13.5px', fontWeight: '600', color: '#15703A' }}>{vm.wl.notice}</span></div></div></>) : null}
      
            <button className="btn btn-p" onClick={vm.addFunds}>{vm.t.wallet.confirmAdd}</button>
            <p className="muted" style={{ fontSize: '11.5px', lineHeight: '1.7' }}>{vm.t.wallet.vatNote}</p>
          </div>
        </>) : null}
    
        
    {vm.wl.isCo ? (<>
          <div className="card" style={{ padding: '28px', gap: '18px' }}>
            <span className="kick">{vm.t.wallet.withdraw}</span>
            <div><label className="lbl">{vm.t.wallet.amount}</label><input className="input num" name="amount" type="number" value={vm.wl.amount} onChange={vm.setWallet} placeholder="10000" /></div>
            <button className="lnkbtn" onClick={vm.withdrawAll}>{vm.t.wallet.withdrawAll} · SAR {vm.wl.availableNum}</button>
            <div className="nafbox" style={{ gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <span className="evlbl">{vm.t.wallet.withdrawTo}</span>
                
      {vm.pa.showEdit ? (<><button className="lnkbtn" style={{ fontSize: '12px' }} onClick={vm.editAccount}>{vm.t.wallet.editAccount}</button></>) : null}
      
              </div>
              
      {vm.pa.saved ? (<>
                <table className="table"><tbody>
                  <tr><td className="muted">{vm.t.wallet.bank}</td><td>{vm.pa.bank}</td></tr>
                  <tr><td className="muted">{vm.t.wallet.accountName}</td><td>{vm.pa.holder}</td></tr>
                  <tr><td className="muted">{vm.t.wallet.iban}</td><td className="num" style={{ direction: 'ltr', textAlign: 'start' }}>{vm.pa.ibanMasked}</td></tr>
                </tbody></table>
              </>) : null}
      
              
      {vm.pa.empty ? (<>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#1B1464' }}>{vm.t.wallet.noAccount}</span>
                  <p className="muted" style={{ fontSize: '12px', lineHeight: '1.7' }}>{vm.t.wallet.noAccountNote}</p>
                </div>
                <button className="btn btn-s btn-sm" style={{ alignSelf: 'flex-start' }} onClick={vm.editAccount}>{vm.t.wallet.addAccount}</button>
              </>) : null}
      
              
      {vm.pa.editing ? (<>
                <div><label className="lbl">{vm.t.wallet.selectBank}</label><select className="input" name="bank" value={vm.pa.f.bank} onChange={vm.setAccount}><option value="">{vm.t.wallet.selectBankPh}</option>
        {((vm.t.wallet.banks) || []).map((bk: any, _i0: number) => (
          <React.Fragment key={_i0}><option value={bk}>{bk}</option></React.Fragment>
        ))}
        </select></div>
                <div><label className="lbl">{vm.t.wallet.accountName}</label><input className="input" name="holder" value={vm.pa.f.holder} onChange={vm.setAccount} placeholder={vm.t.wallet.holderPh} /></div>
                <div><label className="lbl">{vm.t.wallet.iban}</label><input className="input num" name="iban" value={vm.pa.f.iban} onChange={vm.setAccount} placeholder={vm.t.wallet.ibanPh} style={{ direction: 'ltr', textAlign: 'start' }} /><span className="muted" style={{ fontSize: '11px' }}>{vm.t.wallet.ibanHint}</span></div>
                
        {vm.pa.error ? (<><p style={{ fontSize: '12.5px', color: '#D9401F' }}>{vm.pa.error}</p></>) : null}
        
                <div style={{ display: 'flex', gap: '10px' }}><button className="btn btn-p btn-sm" onClick={vm.saveAccount}>{vm.t.wallet.saveAccount}</button>
        {vm.pa.canCancel ? (<><button className="btn btn-s btn-sm" onClick={vm.cancelAccount}>{vm.t.wallet.cancel}</button></>) : null}
        </div>
              </>) : null}
      
              <p className="muted" style={{ fontSize: '11.5px', lineHeight: '1.7' }}>{vm.t.wallet.accountNote}</p>
            </div>
            
      {vm.wl.error ? (<><p style={{ fontSize: '13px', color: '#D9401F' }}>{vm.wl.error}</p></>) : null}
      
            
      {vm.wl.notice ? (<><div className="nafbox" style={{ background: '#F1FBF5', borderColor: '#BFE4CC' }}><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span className="fcheck" style={{ width: '26px', height: '26px', fontSize: '13px' }}>✓</span><span style={{ fontSize: '13.5px', fontWeight: '600', color: '#15703A' }}>{vm.wl.notice}</span></div></div></>) : null}
      
            <button className="btn btn-p" onClick={vm.requestWithdraw}>{vm.t.wallet.withdrawBtn}</button>
            <p className="muted" style={{ fontSize: '11.5px', lineHeight: '1.7' }}>{vm.t.wallet.withdrawNote}</p>
          </div>
        </>) : null}
    
        <div>
          <span className="kick">{vm.t.wallet.history}</span>
          <table className="table" style={{ marginTop: '14px' }}><thead><tr>
    {((vm.t.wallet.hHead) || []).map((hd: any, _i0: number) => (
      <React.Fragment key={_i0}><th>{hd}</th></React.Fragment>
    ))}
    </tr></thead>
            <tbody>
    {((vm.wl.rows) || []).map((tx: any, _i0: number) => (
      <React.Fragment key={_i0}>
              <tr><td className="muted num" style={{ fontSize: '12.5px' }}>{tx.date}</td><td>{tx.label}</td><td className="muted" style={{ fontSize: '12.5px' }}>{tx.method}</td><td className="num" style={{ fontWeight: '600', color: tx.color }}>{tx.amount}</td><td><span className={`tag ${tx.tag}`}>{tx.st}</span></td></tr>
            </React.Fragment>
    ))}
    </tbody></table>
          
    {vm.wl.noRows ? (<><p className="muted" style={{ fontSize: '13.5px', marginTop: '12px' }}>{vm.t.wallet.noHistory}</p></>) : null}
    
        </div>
      </div>
    </section>
  </>);
}
