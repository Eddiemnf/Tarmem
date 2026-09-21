/* App shell: header, the current route, footer, and the overlay blocks.

   Routing is in-memory, exactly as the prototype worked — the logic's
   `state.route` picks the page. Everything else the shell used to do by hand
   (the scroll watcher, the hero's pointer parallax) now lives in the design's
   own logic class, which sets those listeners up when it mounts. */

import { useEffect } from 'react';
import BackLink from './components/BackLink';
import ContractorEditModal from './components/ContractorEditModal';
import Footer from './components/Footer';
import GiftModal from './components/GiftModal';
import Header from './components/Header';
import HomeownerEditModal from './components/HomeownerEditModal';
import ShellBlocks from './components/ShellBlocks';
import { PAGES, type Route } from './routes';
import { useLogicState, useViewModel } from './state/viewModel';

export default function App() {
  const vm = useViewModel();
  const state = useLogicState();

  useEffect(() => {
    document.documentElement.lang = state.lang;
    document.documentElement.dir = vm.dir;
  }, [state.lang, vm.dir]);

  // The logic seeds itself when it mounts; until then there is nothing to bind to.
  if (!vm.t) return null;

  const Page = PAGES[state.route as Route] ?? PAGES.home;

  return (
    <div dir={vm.dir} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header vm={vm} />
      <ShellBlocks vm={vm} />
      <main style={{ flex: 1 }}>
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
