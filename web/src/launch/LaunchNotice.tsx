/* The one line that tells a visitor what the site is today. App.tsx shows it at the
   top of every public page except the home page, whose hero runs edge to edge under
   the header; there the converter places it directly under the hero (`home`). */

import type { VM } from '../state/viewModel';
import { LAUNCH_COPY } from './copy';

export default function LaunchNotice({ vm, home = false }: { vm: VM; home?: boolean }) {
  if (!vm.launch || Boolean(vm.r?.home) !== home) return null;
  const copy = LAUNCH_COPY[vm.dir === 'ltr' ? 'en' : 'ar'];
  return (
    <div role="note" style={{ background: '#FFF6F2', borderBlock: home ? '1px solid #FFD9CB' : undefined, borderBottom: '1px solid #FFD9CB', marginTop: home ? '10px' : undefined }}>
      <div className="wrap" style={{ paddingBlock: '10px', fontSize: '13px', lineHeight: 1.6, color: '#3A385C', display: 'flex', gap: '8px', alignItems: 'baseline' }}>
        <span aria-hidden="true" style={{ color: '#C2502F', fontWeight: 700 }}>✳</span>
        <span>{copy.notice}</span>
      </div>
    </div>
  );
}
