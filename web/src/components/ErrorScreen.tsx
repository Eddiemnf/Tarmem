/* The last line of defence: if anything in the page throws while rendering, the visitor sees a sentence and a button
   instead of a blank screen. React only catches these through a class component. */
import { Component, type ErrorInfo, type ReactNode } from 'react';

export default class ErrorScreen extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo): void { console.error('Tarmem: the page failed to render', error, info.componentStack); }
  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    const ar = (document.documentElement.dir || 'rtl') !== 'ltr';
    return (
      <div dir={ar ? 'rtl' : 'ltr'} style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px 16px', fontFamily: 'system-ui, sans-serif', background: '#FBFAFD', color: '#1B1464' }}>
        <div style={{ maxWidth: '46ch', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
          <img src="assets/tarmem-logo.png" alt="Tarmem" style={{ height: '40px', width: 'auto' }} />
          <h1 style={{ fontSize: '22px', margin: 0 }}>{ar ? 'حدث خطأ غير متوقع في هذه الصفحة' : 'Something went wrong on this page'}</h1>
          <p style={{ margin: 0, color: '#5B5A7A', lineHeight: 1.7 }}>{ar ? 'أعد تحميل الصفحة، وإن تكرر الأمر راسلنا على support@tarmem.sa ونصلحه.' : 'Reload the page. If it happens again, write to support@tarmem.sa and we will fix it.'}</p>
          <button type="button" onClick={() => window.location.reload()} style={{ font: 'inherit', fontWeight: 600, color: '#fff', background: '#FF5A3C', border: 0, borderRadius: '999px', padding: '12px 26px', cursor: 'pointer' }}>{ar ? 'إعادة التحميل' : 'Reload'}</button>
        </div>
      </div>
    );
  }
}
