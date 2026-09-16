/* Site wiring for the approved hero.

   Keeps `TarmemHero` itself a plain props component (as the export intends) and
   holds everything specific to this app in one place: the bilingual copy, the
   reading direction, the asset URLs, and the two existing flows the buttons run.

   - Primary button  → «انشر مشروعك», the same flow as the header's post button,
     including its redirect to homeowner sign-up for a contractor or admin.
   - Second button   → «انضم كمقاول», sign-up with the contractor role selected.

   `header={false}` keeps this site's own header above the hero: it is shared by
   all 22 routes and carries the account menu, notifications and the language
   toggle, so it cannot move inside a component that only the landing page
   renders. The export documents this as the supported alternative. */

import type { VM } from '../../state/viewModel';
import TarmemHero from './TarmemHero';

export default function TarmemHeroSection({ vm }: { vm: VM }) {
  return (
    <TarmemHero
      onStartProject={vm.startProject}
      onJoinContractor={vm.joinContractor}
      header={false}
      copy={vm.hero.copy}
      dir={vm.hero.dir}
      lang={vm.hero.lang}
      videoSrc={vm.hero.videoSrc}
      posterSrc={vm.hero.posterSrc}
    />
  );
}
