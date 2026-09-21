/* The one line that tells a visitor what the site is today. Shown on every
   public page except the home page, whose hero runs edge to edge under the
   header; every route from there into a form passes a page that carries it. */

import type { VM } from '../state/viewModel';
import { LAUNCH_COPY } from './copy';

export default function LaunchNotice({ vm }: { vm: VM }) {
  if (vm.r?.home) return null;
  const copy = LAUNCH_COPY[vm.dir === 'ltr' ? 'en' : 'ar'];
  return (
    <div role="note" style={{ background: '#FFF6F2', borderBottom: '1px solid #FFD9CB' }}>
      <div className="wrap" style={{ paddingBlock: '10px', fontSize: '13px', lineHeight: 1.6, color: '#3A385C', display: 'flex', gap: '8px', alignItems: 'baseline' }}>
        <span aria-hidden="true" style={{ color: '#C2502F', fontWeight: 700 }}>✳</span>
        <span>{copy.notice}</span>
      </div>
    </div>
  );
}
