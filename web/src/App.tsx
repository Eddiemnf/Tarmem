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
import RealAuthPage from './platform/AuthPage';
import { platformOn } from './platform/client';
import { PLATFORM_COPY } from './platform/copy';
import InboxPage from './platform/InboxPage';
import { PAGES, type Route } from './routes';
import { useLogicState, useViewModel, type VM } from './state/viewModel';

/** Pages that exist only on the public early-access site (see src/launch/). */
const LAUNCH_PAGES: Record<string, (props: { vm: VM }) => React.ReactNode> = {
  join: JoinPage, sent: SentPage,
  // real accounts (src/platform/): email sign-in stands in for the design's mobile code and Nafath
  ...(platformOn ? { auth: RealAuthPage, inbox: InboxPage } : {}),
};

export default function App() {
  const vm = useViewModel();
  const state = useLogicState();

  useEffect(() => {
    document.documentElement.lang = state.lang;
    document.documentElement.dir = vm.dir;
    if (isLaunch) {
      document.title = titleFor(vm, state.route);
      // only the public content pages are for search engines; forms, sign-in and every signed-in page are not
      const indexable = ['home', 'how', 'pricing', 'about', 'help', 'faq', 'contact', 'rules', 'terms', 'privacy', 'join'].includes(state.route);
      let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
      if (!meta) { meta = document.createElement('meta'); meta.name = 'robots'; document.head.appendChild(meta); }
      meta.content = indexable ? 'index,follow' : 'noindex,nofollow';
    }
  }, [state.lang, state.route, vm]);

  // The logic seeds itself when it mounts; until then there is nothing to bind to.
  if (!vm.t) return null;

  const Page = (isLaunch && LAUNCH_PAGES[state.route]) || PAGES[state.route as Route] || PAGES.home;

  return (
    <div dir={vm.dir} data-launch={isLaunch ? '' : undefined} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header vm={vm} />
      <ShellBlocks vm={vm} />
      <main style={{ flex: 1 }}>
        {isLaunch ? <LaunchNotice vm={vm} /> : null}
        {/* The team's way into what has arrived. Only an account the owner marked admin in the database sees it. */}
        {isLaunch && state.user?.admin && state.route !== 'home' && state.route !== 'inbox' ? (
          <div style={{ background: '#1B1464', color: '#fff', fontSize: '13px' }}>
            <div className="wrap" style={{ display: 'flex', gap: '14px', alignItems: 'center', justifyContent: 'space-between', paddingBlock: '9px' }}>
              <span>{vm.dir === 'ltr' ? 'Tarmem team' : 'فريق ترميم'}</span>
              <a className="lnk" data-route="inbox" onClick={vm.go} style={{ color: '#FFB199', fontWeight: 600, cursor: 'pointer' }}>{PLATFORM_COPY[vm.dir === 'ltr' ? 'en' : 'ar'].inboxOpen}</a>
            </div>
          </div>
        ) : null}
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
