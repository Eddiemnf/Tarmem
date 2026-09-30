/* App shell: header, the current route, footer, and the overlay blocks.

   Routing is in-memory, exactly as the prototype worked — the logic's
   `state.route` picks the page. Everything else the shell used to do by hand
   (the scroll watcher, the hero's pointer parallax) now lives in the design's
   own logic class, which sets those listeners up when it mounts.

   What the shell adds for keyboards and screen readers: a skip link to the page's
   content, focus on the new page's heading after every page change (without a
   scroll jump), and a phone menu that takes focus when it opens and closes on Escape. */

import { Suspense, lazy, useEffect, useRef, type ComponentType, type LazyExoticComponent } from 'react';
import BackLink from './components/BackLink';
import ContractorEditModal from './components/ContractorEditModal';
import Footer from './components/Footer';
import GiftModal from './components/GiftModal';
import Header from './components/Header';
import HomeownerEditModal from './components/HomeownerEditModal';
import AdminApplicationModal from './components/AdminApplicationModal';
import AdminCaseModal from './components/AdminCaseModal';
import AdminUserModal from './components/AdminUserModal';
import ShellBlocks from './components/ShellBlocks';
import JoinPage from './launch/JoinPage';
import LaunchNotice from './launch/LaunchNotice';
import SentPage from './launch/SentPage';
import { isLaunch } from './launch/mode';
import { SITE_ORIGIN, routeHref, titleFor } from './launch/urls';
import RealAuthPage from './platform/AuthPage';
import { platformOn } from './platform/client';
import { PLATFORM_COPY } from './platform/copy';
import VerifyBanner from './platform/VerifyBanner';
import { confirmEmailVerification, currentAccount, refreshAccount, twoStepPending } from './platform/session';
import { PAGES, type Route } from './routes';
import { LAUNCH_COPY } from './launch/copy';
import { useLaunchActions, useLogicState, useViewModel, type VM } from './state/viewModel';

// signed-in only: loaded when first opened
const InboxPage = lazy(() => import('./platform/InboxPage'));
const ResetPage = lazy(() => import('./platform/ResetPage'));
const AdminTwoStep = lazy(() => import('./platform/AdminTwoStep'));
// (034) the open projects as everyone sees them: the list for all but verified contractors, and one project by its code
const PublicProjects = lazy(() => import('./launch/PublicProjects'));

type Page = ComponentType<{ vm: VM }> | LazyExoticComponent<ComponentType<{ vm: VM }>>;

/** Pages that exist only on the public early-access site (see src/launch/). */
const LAUNCH_PAGES: Record<string, Page> = {
  join: JoinPage, sent: SentPage,
  // real accounts (src/platform/): email sign-in stands in for the design's mobile code and Nafath
  ...(platformOn ? { auth: RealAuthPage, inbox: InboxPage, reset: ResetPage, listing: PublicProjects } : {}),
};

/** Only the public content pages are for search engines; sign-in and every signed-in page are not. */
const INDEXABLE = ['home', 'how', 'pricing', 'about', 'help', 'faq', 'contact', 'rules', 'terms', 'privacy', 'post', 'join'];

function setMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.content = content;
}

function setCanonical(href: string): void {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) { el = document.createElement('link'); el.rel = 'canonical'; document.head.appendChild(el); }
  el.href = href;
}

/** Waits (briefly: a page may still be loading) for an element, then hands it over. */
function whenPresent(find: () => HTMLElement | null, then: (el: HTMLElement | null) => void): () => void {
  let tries = 0;
  let timer = 0;
  const look = () => {
    const el = find();
    if (el || tries >= 40) { then(el); return; }
    tries += 1;
    timer = window.setTimeout(look, 50);
  };
  timer = window.setTimeout(look, 0);
  return () => window.clearTimeout(timer);
}

export default function App() {
  const vm = useViewModel();
  const state = useLogicState();
  const { host } = useLaunchActions();
  const lang = vm.dir === 'ltr' ? 'en' : 'ar';

  useEffect(() => {
    document.documentElement.lang = state.lang;
    document.documentElement.dir = vm.dir;
    if (!isLaunch || !vm.t) return;
    const meta = LAUNCH_COPY[lang].meta;
    const route = String(state.route);
    document.title = route === 'home' ? meta.homeTitle : titleFor(vm, route);
    // a mistyped address shows the home page with a note: that page is not the home page for search engines
    setMeta('name', 'robots', INDEXABLE.includes(route) && !state.notFound ? 'index,follow' : 'noindex,nofollow');
    const description = meta.descriptions[route] || meta.descriptions.home;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', document.title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:locale', lang === 'en' ? 'en_US' : 'ar_SA');
    const url = SITE_ORIGIN + (routeHref(route, state.curId as string | null) ?? routeHref('home'));
    setCanonical(url);
    setMeta('property', 'og:url', url);
  }, [state.lang, state.route, state.curId, state.notFound, vm, lang]);

  // After a page change, focus moves to the new page's heading (or the section its address names, /rules#refunds),
  // so a screen reader starts there and a keyboard continues from there. The logic has already scrolled to the top.
  // Until the visitor first presses a key or taps, the page is still settling (the address, a restored sign-in): a fresh
  // visit starts at the top of the document, as any page does, and an address with #section only scrolls there.
  const routeKey = `${String(state.route)}|${String(state.curId ?? '')}`;
  const interacted = useRef(false);
  useEffect(() => {
    const mark = () => { interacted.current = true; };
    window.addEventListener('pointerdown', mark, true);
    window.addEventListener('keydown', mark, true);
    return () => { window.removeEventListener('pointerdown', mark, true); window.removeEventListener('keydown', mark, true); };
  }, []);
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    const settling = !interacted.current;
    if (settling && !hash) return undefined;
    return whenPresent(
      () => (hash && document.getElementById(hash)) || (settling ? null : document.querySelector<HTMLElement>('main h1')),
      (target) => {
        if (settling) { target?.scrollIntoView({ block: 'start' }); return; }
        const el = target || document.getElementById('main');
        if (!el) return;
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
        el.focus({ preventScroll: true });
      },
    );
  }, [routeKey]);

  // The phone menu: opening it moves focus to its first link; Escape closes it and returns focus to the menu button.
  const navOpen = Boolean(state.navOpen);
  useEffect(() => {
    if (!navOpen) return undefined;
    const cancel = whenPresent(() => document.querySelector<HTMLElement>('.mainnav[data-open="true"] a[href], .mainnav[data-open="true"] button'), (el) => el?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      host.setLogicState({ navOpen: false });
      document.querySelector<HTMLElement>('.hdr .burger')?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => { cancel(); document.removeEventListener('keydown', onKey); };
  }, [navOpen, host]);

  // (031) the link in the "confirm your email" mail: https://www.tarmem.sa/?verify=<token>. It works signed in or not;
  // the address loses the token at once, and the page says what happened.
  useEffect(() => {
    if (!isLaunch || !platformOn) return;
    const url = new URL(window.location.href);
    const token = url.searchParams.get('verify');
    if (!token) return;
    url.searchParams.delete('verify');
    window.history.replaceState(window.history.state, '', url.pathname + (url.search || '') + url.hash);
    const copy = PLATFORM_COPY[lang];
    void confirmEmailVerification(token).then(async (r) => {
      if (r.ok) {
        if (currentAccount()) await refreshAccount();
        host.setLogicState({ siteNotice: currentAccount() ? copy.verifiedNow : copy.verifiedSignIn, siteNoticeTone: 'ok' });
        return;
      }
      host.setLogicState({ siteNotice: r.error === 'expired' ? copy.verifyExpired : r.error === 'network' ? copy.err.network : copy.verifyInvalid, siteNoticeTone: 'warn' });
    });
    // once, as the page opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The logic seeds itself when it mounts; until then there is nothing to bind to.
  if (!vm.t) return null;

  // (032) the console and the inbox open only once this session has passed the team's second step: the code from the app
  const secondStep = isLaunch && platformOn && (state.route === 'admin' || state.route === 'inbox') && twoStepPending();
  // (034) /projects: a verified contractor gets the full list, with bidding; everyone else, the team included, the public one
  const publicBrowse = isLaunch && platformOn && state.route === 'browse' && !(state.user?.role === 'contractor' && state.user?.nafath);
  const Page: Page = (secondStep && AdminTwoStep) || (publicBrowse && PublicProjects) || (isLaunch && LAUNCH_PAGES[state.route]) || PAGES[state.route as Route] || PAGES.home;
  const skip = LAUNCH_COPY[lang].skip;

  return (
    <>
      {/* outside the design's own root, so the demo still renders exactly as the design does (tests/parity.mjs) */}
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); const main = document.getElementById('main'); main?.focus(); main?.scrollIntoView(); }}>{skip}</a>
      <div dir={vm.dir} data-launch={isLaunch ? '' : undefined} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header vm={vm} />
        <ShellBlocks vm={vm} />
        <main id="main" tabIndex={-1} style={{ flex: 1 }}>
          {isLaunch ? <LaunchNotice vm={vm} /> : null}
          {isLaunch && platformOn ? <VerifyBanner vm={vm} /> : null}
          {/* a sentence for the whole page (an account erased, a project that could not be withdrawn): it sits just below the
              fixed header — lower while the header floats over the home page's film — never under it */}
          {isLaunch && state.siteNotice ? (
            <div className="sitenotice" role={state.siteNoticeTone === 'warn' ? 'alert' : 'status'} data-tone={state.siteNoticeTone === 'warn' ? 'warn' : 'ok'} data-over={vm.overNav === 'true' ? 'true' : 'false'}>
              <span>{String(state.siteNotice)}</span>
              <button type="button" className="btn btn-s btn-sm" onClick={() => host.setLogicState({ siteNotice: '', siteNoticeTone: '' })}>{LAUNCH_COPY[lang].notFoundClose}</button>
            </div>
          ) : null}
          {isLaunch && state.notFound ? (
            <div className="wrap notfound" role="status" style={{ display: 'flex', gap: '14px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', margin: '14px auto 0', padding: '12px 16px', background: '#F7F6FC', border: '1px solid #E6E5F0', borderRadius: '14px', fontSize: '14px', color: '#3A385C' }}>
              <span>{LAUNCH_COPY[lang].notFound}</span>
              <button type="button" className="btn btn-s btn-sm" onClick={() => host.setLogicState({ notFound: false })}>{LAUNCH_COPY[lang].notFoundClose}</button>
            </div>
          ) : null}
          {/* The team's way into what has arrived. Only an account the owner marked admin in the database sees it. */}
          {isLaunch && state.user?.admin && state.route !== 'home' && state.route !== 'inbox' ? (
            <div style={{ background: '#1B1464', color: '#fff', fontSize: '13px' }}>
              <div className="wrap" style={{ display: 'flex', gap: '14px', alignItems: 'center', justifyContent: 'space-between', paddingBlock: '9px' }}>
                <span style={{ flex: 'none' }}>{lang === 'en' ? 'Tarmem team' : 'فريق ترميم'}</span>
                <a className="lnk" data-route="inbox" href={routeHref('inbox')} onClick={vm.go} style={{ color: '#FFB199', fontWeight: 600, cursor: 'pointer', whiteSpace: 'normal', textAlign: 'end', minWidth: 0 }}>{PLATFORM_COPY[lang].inboxOpen}</a>
              </div>
            </div>
          ) : null}
          <BackLink vm={vm} />
          <Suspense fallback={<div style={{ minHeight: '60vh' }} aria-busy="true" />}>
            <Page vm={vm} />
          </Suspense>
          <GiftModal vm={vm} />
          <HomeownerEditModal vm={vm} />
          <AdminApplicationModal vm={vm} />
          <AdminCaseModal vm={vm} />
          <AdminUserModal vm={vm} />
          <ContractorEditModal vm={vm} />
        </main>
        <Footer vm={vm} />
      </div>
    </>
  );
}
