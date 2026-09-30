/* A small way into the open projects (supabase/034) from the home page's hero: the converter places it in the hero's
   bottom bar, where the design shows its live-visitor counter (a random walk, hidden on the public site). The demo
   shows the design unchanged. */

import type { VM } from '../state/viewModel';
import { routeHref } from './urls';

export default function HeroBrowseLink({ vm }: { vm: VM }) {
  if (!vm.launch || !vm.accounts) return null;
  return (
    <a className="ph-replay ph-browse" data-route="browse" href={routeHref('browse')} onClick={vm.go}>
      {vm.t.nav.browseProjects} <span aria-hidden="true">{vm.dir === 'ltr' ? '→' : '←'}</span>
    </a>
  );
}
