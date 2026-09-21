/* App shell: header, the current route, footer, and the overlay blocks.

   Routing is in-memory, exactly as the prototype worked — the logic's
   `state.route` picks the page. Everything else the shell used to do by hand
   (the scroll watcher, the hero's pointer parallax) now lives in the design's
   own logic class, which sets those listeners up when it mounts. */

import { useEffect } from 'react';
import type React from 'react';
import BackLink from './components/BackLink';
import ContractorEditModal from './components/ContractorEditModal';
import Footer from './components/Footer';
import GiftModal from './components/GiftModal';
import Header from './components/Header';
import HomeownerEditModal from './components/HomeownerEditModal';
import ShellBlocks from './components/ShellBlocks';
import JoinPage from './launch/JoinPage';
import LaunchNotice from './launch/LaunchNotice';
import SentPage from './launch/SentPage';
import { isLaunch } from './launch/mode';
import { titleFor } from './launch/urls';
import { PAGES, type Route } from './routes';
import { useLogicState, useViewModel, type VM } from './state/viewModel';

/** Pages that exist only on the public early-access site (see src/launch/). */
const LAUNCH_PAGES: Record<string, (props: { vm: VM }) => React.ReactNode> = { join: JoinPage, sent: SentPage };

export default function App() {
  const vm = useViewModel();
  const state = useLogicState();

  useEffect(() => {
    document.documentElement.lang = state.lang;
    document.documentElement.dir = vm.dir;
    if (isLaunch) document.title = titleFor(vm, state.route);
  }, [state.lang, state.route, vm]);

  // The logic seeds itself when it mounts; until then there is nothing to bind to.
  if (!vm.t) return null;

  const Page = (isLaunch && LAUNCH_PAGES[state.route]) || PAGES[state.route as Route] || PAGES.home;

  return (
    <div dir={vm.dir} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header vm={vm} />
      <ShellBlocks vm={vm} />
      <main style={{ flex: 1 }}>
        {isLaunch ? <LaunchNotice vm={vm} /> : null}
        <BackLink vm={vm} />
        <Page vm={vm} />
        <GiftModal vm={vm} />
        <HomeownerEditModal vm={vm} />
        <ContractorEditModal vm={vm} />
      </main>
      <Footer vm={vm} />
    </div>
  );
}
