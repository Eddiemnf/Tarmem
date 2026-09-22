/* The contractor's own portfolio, under the design's "own work" grid on their profile: add photos with a caption,
   remove one. Only the profile's owner sees it; everybody else just sees the photos. (supabase/011) */

import { useState } from 'react';
import { useLaunchActions, type VM } from '../state/viewModel';
import { reloadPortfolio } from './bind';
import { PLATFORM_COPY } from './copy';
import { PORTFOLIO_RULES, addPortfolioPhoto, removePortfolioPhoto, type PortfolioPhoto } from './files';
import { currentAccount } from './session';

export default function PortfolioManager({ vm }: { vm: VM }) {
  const { host } = useLaunchActions();
  const account = currentAccount();
  const state = host.logic.state;
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!account || account.profile.role !== 'contractor' || state.curId !== 'c1' || !account.logicUser.nafath) return null;
  const copy = PLATFORM_COPY[vm.dir === 'ltr' ? 'en' : 'ar'];
  const photos: PortfolioPhoto[] = state.contractorPortfolio?.c1 || [];
  const refresh = () => reloadPortfolio(host, 'c1', account.profile.id);

  const pick = async (e: { target: HTMLInputElement }) => {
    const files = [...(e.target.files || [])].filter((f) => PORTFOLIO_RULES.types.includes(f.type) && f.size <= PORTFOLIO_RULES.maxBytes);
    e.target.value = '';
    if (!files.length) return;
    if (photos.length + files.length > PORTFOLIO_RULES.maxPhotos) return setError(copy.pfFull);
    setBusy(true); setError('');
    const results = await Promise.all(files.map((f, n) => addPortfolioPhoto(account.profile.id, f, caption, photos.length + n)));
    setBusy(false);
    if (results.some((ok) => !ok)) setError(copy.pfFailed);
    refresh();
  };
  const remove = async (path: string) => { if (await removePortfolioPhoto(path)) refresh(); };

  return (
    <div className="card" style={{ marginTop: '16px', padding: '18px 20px', gap: '12px' }}>
      <div><label className="lbl" htmlFor="pf-caption">{copy.pfCaption}</label>
        <input id="pf-caption" className="input" value={caption} onChange={(e) => setCaption(e.currentTarget.value)} placeholder={copy.pfCaptionPh} maxLength={120} /></div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        <label className="btn btn-p btn-sm" style={{ cursor: busy ? 'wait' : 'pointer' }}>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple style={{ display: 'none' }} disabled={busy} onChange={pick} />{busy ? '…' : copy.pfAdd}
        </label>
        <span className="muted" style={{ fontSize: '12px' }}>{copy.pfHint}</span>
      </div>
      {error ? <p className="autherr" role="alert">{error}</p> : null}
      {photos.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {photos.map((p) => (
            <span key={p.path} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', background: '#F4F3FA', borderRadius: '8px', padding: '4px 8px' }}>
              <img src={p.url} alt="" style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '6px' }} />{p.caption || '—'}
              <button type="button" className="lnkbtn" style={{ fontSize: '12px', color: '#D9401F' }} onClick={() => remove(p.path)} aria-label={copy.pfRemove}>✕</button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
