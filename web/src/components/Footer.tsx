/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import type { VM } from '../state/viewModel';

export default function Footer({ vm }: { vm: VM }) {
  return (<><footer style={{ background: 'linear-gradient(135deg,#FDF3EC 0%,#FCEEE7 48%,#F5EFF7 100%)', color: '#1B1464', marginTop: 'auto' }}>
    <div className="wrap g4" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '28px', paddingBlock: '38px 26px', fontSize: '13.5px' }}>
      <div><img src="assets/tarmem-logo.png" alt="Tarmem" style={{ height: '34px', width: 'auto' }} /><p style={{ color: '#5B5A7A', maxWidth: '34ch', marginTop: '12px', fontSize: '13px', lineHeight: '1.65' }}>{vm.t.footer.tag}</p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <a className="soc" href="https://instagram.com/tarmem_ksa" target="_blank" rel="noopener" aria-label="Instagram">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" /></svg>
          </a>
          <a className="soc" href="https://x.com/Tarmemsa" target="_blank" rel="noopener" aria-label="X">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.7 3h3.2l-7 8 7.4 9.9h-5.6l-4.4-5.8-5 5.8H3.1l7.3-8.4L3.3 3H9l4.1 5.5zm-1.1 15.9h1.8L7.3 4.8H5.4z" /></svg>
          </a>
          <a className="soc" href="https://www.linkedin.com/company/tarmemsa/" target="_blank" rel="noopener" aria-label="LinkedIn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4.6 3a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8zM3 8.4h3.2V21H3zM9.2 8.4h3.1v1.7a3.5 3.5 0 0 1 3.1-1.8c2.4 0 3.9 1.5 3.9 4.4V21h-3.2v-7.6c0-1.5-.6-2.3-1.8-2.3-1.1 0-1.9.8-1.9 2.3V21H9.2z" /></svg>
          </a>
        </div>
        <a className="fmail" href="mailto:support@tarmem.sa">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 7.5l7.4 5.2a2 2 0 0 0 2.2 0l7.4-5.2" /></svg>
          <span dir="ltr">support@tarmem.sa</span>
        </a>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><span className="skick" style={{ fontSize: '12.5px' }}>{vm.t.footer.platform}</span><a className="lnk" style={{ color: '#3A385C' }} data-route="how" onClick={vm.go}>{vm.t.footer.how}</a>{vm.launch ? null : (<a className="lnk" style={{ color: '#3A385C' }} data-route="contractors" onClick={vm.go}>{vm.t.nav.contractors}</a>)}<a className="lnk" style={{ color: '#3A385C' }} data-route="pricing" onClick={vm.go}>{vm.t.nav.pricing}</a></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><span className="skick" style={{ fontSize: '12.5px' }}>{vm.t.footer.company}</span><a className="lnk" style={{ color: '#3A385C' }} data-route="about" onClick={vm.go}>{vm.t.footer.about}</a><a className="lnk" style={{ color: '#3A385C' }} data-route="faq" onClick={vm.go}>{vm.t.nav.faq}</a><a className="lnk" style={{ color: '#3A385C' }} data-route="auth" data-role="contractor" onClick={vm.go}>{vm.t.footer.join}</a></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}><span className="skick" style={{ fontSize: '12.5px' }}>{vm.t.footer.legal}</span><a className="lnk" style={{ color: '#3A385C' }} data-route="rules" onClick={vm.go}>{vm.t.footer.rules}</a><a className="lnk" style={{ color: '#3A385C' }} data-route="terms" onClick={vm.go}>{vm.t.footer.terms}</a><a className="lnk" style={{ color: '#3A385C' }} data-route="privacy" onClick={vm.go}>{vm.t.footer.privacy}</a><a className="lnk" style={{ color: '#3A385C' }} data-route="help" onClick={vm.go}>{vm.t.footer.help}</a><a className="lnk" style={{ color: '#3A385C' }} data-route="contact" onClick={vm.go}>{vm.t.footer.contact}</a></div>
    </div>
    <div className="wrap" style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: '#5B5A7A', paddingBlock: '14px 20px', borderTop: '1px solid rgba(27,20,100,.12)' }}><span>© {vm.year} {vm.t.brand}{vm.t.footer.rights}</span><span>{vm.t.footer.note}</span></div>
  </footer></>);
}
