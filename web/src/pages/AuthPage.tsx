/* Generated from ../../project/Tarmem.dc.html by tools/convert-template.py.
   Edit the design file and re-run the converter, or edit here and keep both in
   step — the markup is a mechanical port of the prototype's template. */
import React from 'react';
import type { VM } from '../state/viewModel';

export default function AuthPage({ vm }: { vm: VM }) {
  return (<>
    <section className="fade" style={{ display: 'flex', justifyContent: 'center', padding: '64px 24px 88px' }}>
      <div style={{ width: '100%', maxWidth: '432px', display: 'flex', flexDirection: 'column', gap: '26px' }}>

        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h1 style={{ fontSize: '27px', lineHeight: '1.3', color: '#1B1464', fontWeight: '600' }}>{vm.authTitle}</h1>
          <p style={{ color: '#7A7994', fontSize: '14px', lineHeight: '1.7', maxWidth: '38ch', margin: '0 auto' }}>{vm.authLede}</p>
        </div>

        <div className="authseg">
          <label><input type="radio" name="mode" value="signin" checked={vm.auth.isSignin} onChange={vm.setMode} /><span>{vm.t.auth.signIn}</span></label>
          <label><input type="radio" name="mode" value="signup" checked={vm.auth.isSignup} onChange={vm.setMode} /><span>{vm.t.auth.signUp}</span></label>
        </div>

        <div className="authcard">
          
    {vm.auth.showSteps ? (<>
            <div className="authprog">
      {((vm.authSteps) || []).map((s: any, _i0: number) => (
        <React.Fragment key={_i0}><span className="authprog-i" data-on={s.on}></span></React.Fragment>
      ))}
      </div>
          </>) : null}
    

          
    {vm.auth.step1 ? (<>
            <div className="authfield">
              <span className="authlbl">{vm.authRoleLabel}</span>
              <div className="authseg authseg-sm">
                <label><input type="radio" name="role" value="homeowner" checked={vm.auth.roleHo} onChange={vm.setAuthField} /><span>{vm.t.roles.homeowner}</span></label>
                <label><input type="radio" name="role" value="contractor" checked={vm.auth.roleCo} onChange={vm.setAuthField} /><span>{vm.t.roles.contractor}</span></label>
              </div>
            </div>
            <div className="authfield">
              <label className="authlbl">{vm.t.auth.mobile}</label>
              <input className="authinput num" name="mobile" type="tel" value={vm.auth.f.mobile} onChange={vm.setAuthField} placeholder={vm.t.auth.mobilePh} />
            </div>
            
      {vm.auth.error ? (<><p className="autherr">{vm.auth.error}</p></>) : null}
      
            <button className="btn btn-p" style={{ width: '100%', padding: '14px' }} onClick={vm.authNext}>{vm.t.auth.sendOtp}</button>
          </>) : null}
    

          
    {vm.auth.step2 ? (<>
            <div className="authfield" style={{ textAlign: 'center', gap: '4px' }}>
              <span style={{ fontSize: '13.5px', color: '#5B5A7A' }}>{vm.t.auth.otpSentTo} <span className="num" style={{ fontWeight: '600', color: '#1B1464', direction: 'ltr', display: 'inline-block' }}>{vm.auth.f.mobile}</span></span>
              <span className="muted" style={{ fontSize: '12px' }}>{vm.t.auth.otpHint}: <span className="num" style={{ fontWeight: '600' }}>{vm.auth.otpCode}</span></span>
            </div>
            <input className="authinput num" name="otp" inputMode="numeric" maxLength={4} value={vm.auth.f.otp} onChange={vm.setAuthField} placeholder="••••" style={{ letterSpacing: '.6em', textAlign: 'center', fontSize: '22px', padding: '16px 14px' }} />
            
      {vm.auth.error ? (<><p className="autherr">{vm.auth.error}</p></>) : null}
      
            <button className="btn btn-p" style={{ width: '100%', padding: '14px' }} onClick={vm.authNext}>{vm.authPrimary}</button>
            <div style={{ display: 'flex', gap: '18px', justifyContent: 'center' }}><button className="lnkbtn" onClick={vm.resendOtp}>{vm.t.auth.otpResend}</button><button className="lnkbtn" onClick={vm.authBack}>{vm.t.auth.changeMobile}</button></div>
          </>) : null}
    

          
    {vm.auth.step3 ? (<>
            <div className="authfield"><label className="authlbl">{vm.t.auth.fullName}</label><input className="authinput" name="name" value={vm.auth.f.name} onChange={vm.setAuthField} /></div>
            <div className="authfield"><label className="authlbl">{vm.t.auth.city}</label><select className="authinput" name="city" value={vm.auth.f.city} onChange={vm.setAuthField}>
      {((vm.cities) || []).map((c: any, _i0: number) => (
        <React.Fragment key={_i0}><option value={c.id}>{c.label}</option></React.Fragment>
      ))}
      </select></div>
            
      {vm.auth.roleCo ? (<>
              <div className="authfield"><label className="authlbl">{vm.t.auth.company}</label><input className="authinput" name="company" value={vm.auth.f.company} onChange={vm.setAuthField} /></div>
              <div className="authfield"><label className="authlbl">{vm.t.auth.trades}</label><input className="authinput" name="trades" value={vm.auth.f.trades} onChange={vm.setAuthField} placeholder={vm.t.auth.tradesPh} /></div>
              <div className="authfield"><label className="authlbl">{vm.t.auth.licence}</label><input className="authinput" name="licence" value={vm.auth.f.licence} onChange={vm.setAuthField} /></div>
            </>) : null}
      
            <div className="authfield">
              <span className="authlbl">{vm.t.auth.tcKicker}</span>
              <div className="tcbox">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#1B1464' }}>{vm.tc.title}</span>
                  <span className="muted num" style={{ fontSize: '11px' }}>{vm.t.auth.tcUpdated}</span>
                </div>
                <ol className="tclist">
                  
      {((vm.tc.secs) || []).map((x: any, _i0: number) => (
        <React.Fragment key={_i0}><li>{x.label}</li></React.Fragment>
      ))}
      
                </ol>
                <a className="lnk" href={vm.tc.href} target="_blank" rel="noopener" style={{ fontSize: '12.5px' }}>{vm.t.auth.tcOpen} ↗</a>
              </div>
              <label className="tcagree">
                <input type="checkbox" name="tc" checked={vm.auth.f.tc} onChange={vm.setAuthField} />
                <span className="dot"></span>
                <span>{vm.tc.agree}</span>
              </label>
              <p className="muted" style={{ fontSize: '11.5px', lineHeight: '1.7', marginTop: '8px' }}>{vm.t.auth.tcNote}</p>
            </div>
            
      {vm.auth.error ? (<><p className="autherr">{vm.auth.error}</p></>) : null}
      
            <div style={{ display: 'flex', gap: '10px' }}><button className="btn btn-s" onClick={vm.authBack}>{vm.t.back}</button><button className="btn btn-p" style={{ flex: '1', padding: '14px' }} onClick={vm.authNext}>{vm.t.auth.finish}</button></div>
          </>) : null}
    
        </div>

        <p className="authnote"><span className="nafmark nafmark-sm">نفاذ</span>{vm.authNafLine}</p>

        
    {vm.auth.isSignup ? (<>
          <p className="authterms">{vm.t.auth.agree} <a className="lnk" data-route="terms" onClick={vm.go}>{vm.t.footer.terms}</a></p>
        </>) : null}
    

        <details className="authdemo">
          <summary><span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>{vm.t.auth.demo}<span className="authcar" aria-hidden="true" style={{ display: 'inline-block', fontSize: '9px', lineHeight: '1', transition: 'transform .18s ease' }}>▼</span></span></summary>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', paddingTop: '12px' }}>
            <button className="btn btn-s btn-sm" data-role="homeowner" onClick={vm.demoSignIn}>{vm.t.roles.homeowner}</button>
            <button className="btn btn-s btn-sm" data-role="contractor" onClick={vm.demoSignIn}>{vm.t.roles.contractor}</button>
            <button className="btn btn-s btn-sm" data-role="admin" onClick={vm.demoSignIn}>{vm.t.roles.admin}</button>
          </div>
        </details>
      </div>
    </section>
  </>);
}
