/* On a phone the header's "join as a contractor" button does not fit over the hero
   (see the phone-header rule in global.css), which left a contractor's first screen
   with nothing addressed to them. This puts the same link under the hero's button,
   at exactly the widths where the header button steps aside. */

import type { VM } from '../state/viewModel';
import { LAUNCH_COPY } from './copy';

export default function HeroJoinLink({ vm }: { vm: VM }) {
  if (!vm.launch) return null;
  return (
    <a className="hero-join" data-route="auth" data-signup="contractor" onClick={vm.goAuth}>
      {LAUNCH_COPY[vm.dir === 'ltr' ? 'en' : 'ar'].heroJoin}
    </a>
  );
}
