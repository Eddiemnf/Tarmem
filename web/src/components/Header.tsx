/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function Header({ vm }: { vm: VM }) {
  return (<><header className="hdr" data-over={vm.overNav}>
    <div className="wrap" style={{ display: 'flex', alignItems: 'center', gap: '20px', minHeight: '72px', paddingBlock: '10px' }}>
      <div className="brand" data-route="home" onClick={vm.go} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', marginInlineEnd: '14px' }}><img className="lg-dark" src="assets/tarmem-logo.png" alt="Tarmem" style={{ height: '40px', width: 'auto' }} /><img className="lg-light" src="assets/tarmem-logo-white.png" alt="Tarmem" style={{ height: '40px', width: 'auto' }} /></div>
      <button className="burger" aria-expanded={vm.navOpenAttr} onClick={vm.toggleNav} aria-label="Menu"><span></span><span></span><span></span></button>
      
    {vm.isGuest ? (<>
        <nav className="mainnav" data-open={vm.navOpenAttr} style={{ display: 'flex', gap: 'clamp(20px,2.4vw,40px)', alignItems: 'center', marginInline: 'auto' }}>
          <a className="lnk" data-route="how" aria-current={vm.cur.how} onClick={vm.go}>{vm.t.nav.how}</a>
          <a className="lnk" data-route="pricing" aria-current={vm.cur.pricing} onClick={vm.go}>{vm.t.nav.pricing}</a>
          <a className="lnk" data-route="faq" aria-current={vm.cur.faq} onClick={vm.go}>{vm.t.nav.faq}</a>
          <a className="lnk" data-route="about" aria-current={vm.cur.about} onClick={vm.go}>{vm.t.nav.about}</a>
          <a className="lnk hide-over" data-route="help" aria-current={vm.cur.help} onClick={vm.go}>{vm.t.footer.help}</a>
          <span className="mobonly" style={{ width: '100%', height: '1px', background: '#EEEDF5' }}></span>
          <a className="lnk mobonly" data-route="auth" data-signup="contractor" onClick={vm.goAuth}>{vm.t.footer.join}</a>
          {vm.launch && !vm.accounts ? null : (<a className="lnk mobonly" data-route="auth" onClick={vm.go}>{vm.t.nav.signIn}</a>)}
        </nav>
      </>) : null}
    
      
    {vm.isHomeowner ? (<>
        <nav className="mainnav" data-open={vm.navOpenAttr} style={{ display: 'flex', gap: '26px', alignItems: 'center', marginInlineEnd: 'auto' }}>
          <a className="lnk" data-route="hdash" aria-current={vm.cur.hdash} onClick={vm.go}>{vm.t.nav.dashboard}</a>
          {vm.launch ? null : (<a className="lnk" data-route="contractors" aria-current={vm.cur.contractors} onClick={vm.go}>{vm.t.nav.contractors}</a>)}
        </nav>
        <button className="btn btn-p btn-sm" data-route="post" onClick={vm.go} style={{ flex: 'none' }}>{vm.t.nav.post}</button>
      </>) : null}
    
      
    {vm.isContractor ? (<>
        <nav className="mainnav" data-open={vm.navOpenAttr} style={{ display: 'flex', gap: '26px', alignItems: 'center', marginInlineEnd: 'auto' }}>
          <a className="lnk" data-route="cdash" aria-current={vm.cur.cdash} onClick={vm.go}>{vm.t.nav.dashboard}</a>
          {vm.launch && !vm.accounts ? null : (<a className="lnk" data-route="browse" aria-current={vm.cur.browse} onClick={vm.go}>{vm.t.nav.browse}</a>)}
        </nav>
      </>) : null}
    
      
    {vm.isAdmin ? (<>
        <nav className="mainnav" data-open={vm.navOpenAttr} style={{ display: 'flex', gap: '26px', alignItems: 'center', marginInlineEnd: 'auto' }}><a className="lnk" data-route="admin" aria-current={vm.cur.admin} onClick={vm.go}>{vm.t.nav.admin}</a></nav>
      </>) : null}
    
      <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
        
    {vm.isGuest ? (<>
          {vm.launch && !vm.accounts ? null : (<a className="ulnk deskonly hide-over" data-route="auth" onClick={vm.go}>{vm.t.nav.signIn}</a>)}
          <button className="langbtn hide-over" onClick={vm.toggleLang}>{vm.t.langSwitch}</button>
          <button className="btn btn-s btn-sm deskonly join-over" data-route="auth" data-signup="contractor" onClick={vm.goAuth}>{vm.t.footer.join}<svg className="ph-ar join-ar" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 17 7 7" /><path d="M7 15V7h8" /></svg></button>
          <button className="btn btn-p btn-sm hide-over" data-route="post" onClick={vm.go}>{vm.t.nav.post}</button>
        </>) : null}
    
        
    {vm.isNotAdmin ? (<>
          <div style={{ position: 'relative' }}>
            <button className="bell" aria-expanded={vm.nt.open} onClick={vm.toggleNotifs} aria-label={vm.t.notif.title}>
              <svg className="bell-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
              
      {vm.nt.count ? (<><span className="bell-b num">{vm.nt.badge}</span></>) : null}
      
            </button>
            
      {vm.nt.open ? (<>
              <span className="acctveil" onClick={vm.closeNotifs}></span>
              <div className="acctmenu" style={{ width: '320px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 12px 8px' }}>
                  <span className="acctrole" style={{ padding: '0' }}>{vm.t.notif.title}</span>
                  
        {vm.nt.count ? (<><button className="lnkbtn" style={{ fontSize: '11.5px' }} onClick={vm.markAllRead}>{vm.t.notif.markAll}</button></>) : null}
        
                </div>
                
        {vm.nt.empty ? (<><p className="muted" style={{ fontSize: '13px', padding: '6px 12px 10px' }}>{vm.t.notif.empty}</p></>) : null}
        
                
        {((vm.nt.items) || []).map((n: any, _i0: number) => (
          <React.Fragment key={_i0}>
                  <button className="notif" data-route="project" data-id={n.pid} onClick={vm.goMenu}>
                    <span className="notif-dot" aria-hidden={n.unread}></span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '3px', textAlign: 'start', minWidth: '0' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#1B1464', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                      <span className="muted" style={{ fontSize: '11.5px' }}>{n.body}</span>
                    </span>
                    <span className={`tag ${n.cls}`} style={{ marginInlineStart: 'auto', flex: 'none' }}>{n.tag}</span>
                  </button>
                </React.Fragment>
        ))}
        
              </div>
            </>) : null}
      
          </div>
        </>) : null}
    
        
    {vm.isUser ? (<>
          <div style={{ position: 'relative' }}>
            <button className="acct" aria-expanded={vm.menuOpenAttr} onClick={vm.toggleMenu}><span className="acctav">{vm.userInitial}</span><span>{vm.user.name}</span><span className="acctcar">▾</span></button>
            
      {vm.menuOpen ? (<>
              <span className="acctveil" onClick={vm.closeMenu}></span>
              <div className="acctmenu">
                <span className="acctrole">{vm.accountRole}</span>
                
        {vm.isHomeowner ? (<>{vm.launch && !vm.accounts ? null : (<button className="acctitem" data-route="homeowner" data-id="h1" onClick={vm.goMenu}>{vm.t.hprofile.myProfile}</button>)}</>) : null}
        
                
        {vm.isContractor ? (<>{vm.launch && !vm.accounts ? null : (<button className="acctitem" data-route="contractor" data-id="c1" onClick={vm.goMenu}>{vm.t.nav.myProfile}</button>)}</>) : null}
        
                
        {vm.isNotAdmin ? (<>{vm.launch && !vm.wallet ? null : (<button className="acctitem" data-route="wallet" onClick={vm.goMenu}>{vm.t.nav.wallet}</button>)}</>) : null}
        
                
        {vm.isNotAdmin ? (<>{vm.launch && !vm.accounts ? null : (<button className="acctitem" data-route="settings" onClick={vm.goMenu}>{vm.t.nav.settings}</button>)}</>) : null}
        
                <hr className="hair" />
                <button className="acctitem" onClick={vm.signOut}>{vm.t.nav.signOut}</button>
              </div>
            </>) : null}
      
          </div>
        </>) : null}
    
        
    {vm.isUser ? (<><button className="langbtn" onClick={vm.toggleLang}>{vm.t.langSwitch}</button></>) : null}
    
      </div>
    </div>
  </header></>);
}
