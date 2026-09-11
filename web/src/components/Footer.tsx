/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import type { VM } from '../state/viewModel';

export default function Footer({ vm }: { vm: VM }) {
  return (<><footer style={{ background: '#1B1464', color: '#fff', marginTop: 'auto' }}>
    <div className="wrap g4" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '32px', paddingBlock: '56px 40px', fontSize: '14px' }}>
      <div><img src="assets/tarmem-logo.png" alt="Tarmem" style={{ height: '44px', width: 'auto', background: '#fff', borderRadius: '10px', padding: '6px 10px' }} /><p style={{ color: 'rgba(255,255,255,.72)', maxWidth: '36ch', marginTop: '16px' }}>{vm.t.footer.tag}</p></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}><span className="kick" style={{ color: '#FF9A6B' }}>{vm.t.footer.platform}</span><a className="lnk" style={{ color: 'rgba(255,255,255,.85)' }} data-route="how" onClick={vm.go}>{vm.t.footer.how}</a><a className="lnk" style={{ color: 'rgba(255,255,255,.85)' }} data-route="contractors" onClick={vm.go}>{vm.t.nav.contractors}</a><a className="lnk" style={{ color: 'rgba(255,255,255,.85)' }} data-route="pricing" onClick={vm.go}>{vm.t.nav.pricing}</a></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}><span className="kick" style={{ color: '#FF9A6B' }}>{vm.t.footer.company}</span><a className="lnk" style={{ color: 'rgba(255,255,255,.85)' }} data-route="about" onClick={vm.go}>{vm.t.footer.about}</a><a className="lnk" style={{ color: 'rgba(255,255,255,.85)' }} data-route="faq" onClick={vm.go}>{vm.t.nav.faq}</a><a className="lnk" style={{ color: 'rgba(255,255,255,.85)' }} data-route="auth" data-role="contractor" onClick={vm.go}>{vm.t.footer.join}</a></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}><span className="kick" style={{ color: '#FF9A6B' }}>{vm.t.footer.legal}</span><a className="lnk" style={{ color: 'rgba(255,255,255,.85)' }} data-route="rules" onClick={vm.go}>{vm.t.footer.rules}</a><a className="lnk" style={{ color: 'rgba(255,255,255,.85)' }} data-route="terms" onClick={vm.go}>{vm.t.footer.terms}</a><a className="lnk" style={{ color: 'rgba(255,255,255,.85)' }} data-route="privacy" onClick={vm.go}>{vm.t.footer.privacy}</a><a className="lnk" style={{ color: 'rgba(255,255,255,.85)' }} data-route="contact" onClick={vm.go}>{vm.t.footer.contact}</a></div>
    </div>
    <div className="wrap" style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: 'rgba(255,255,255,.55)', paddingBlock: '16px 28px', borderTop: '1px solid rgba(255,255,255,.12)' }}><span>© 2026 {vm.t.brand}</span><span>{vm.t.footer.note}</span></div>
  </footer></>);
}
