/* App shell: header, the current route, footer, and the two profile dialogs.

   Routing is in-memory, exactly as the prototype worked — `state.route` picks
   the page. Two ambient effects come from the prototype too: a scroll watcher
   that reveals the floating assistant pill, and a pointer watcher that feeds
   the hero's parallax custom properties. */

import { useEffect } from 'react';
import BackLink from './components/BackLink';
import ContractorEditModal from './components/ContractorEditModal';
import Footer from './components/Footer';
import Header from './components/Header';
import HomeownerEditModal from './components/HomeownerEditModal';
import { PAGES, type Route } from './routes';
import { useStore } from './state/store';
import { useViewModel } from './state/viewModel';

/** The assistant pill appears once the hero's AI bar has scrolled away. */
function useScrollWatcher() {
  const { stateRef, setState } = useStore();
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const on = window.scrollY > 640;
        if (on !== stateRef.current.scrolled) setState({ scrolled: on });
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [setState, stateRef]);
}

/** Eased pointer parallax for the hero's three depth layers. */
function usePointerWatcher() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, frame = 0;
    let stage: HTMLElement | null = null;
    const get = () => {
      if (!stage || !stage.isConnected) stage = document.querySelector('.v-stage');
      return stage;
    };
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    const loop = () => {
      cx += (tx - cx) * 0.075;
      cy += (ty - cy) * 0.075;
      const el = get();
      if (el) {
        el.style.setProperty('--px', cx.toFixed(4));
        el.style.setProperty('--py', cy.toFixed(4));
      }
      frame = (Math.abs(tx - cx) > 0.0015 || Math.abs(ty - cy) > 0.0015)
        ? requestAnimationFrame(loop) : 0;
    };
    const onMove = (event: PointerEvent) => {
      const el = get();
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (!rect.width) return;
      tx = clamp(((event.clientX - rect.left) / rect.width - 0.5) * 2);
      ty = clamp(((event.clientY - rect.top) / rect.height - 0.5) * 2);
      if (!frame) frame = requestAnimationFrame(loop);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}

export default function App() {
  const vm = useViewModel();
  const { state } = useStore();
  useScrollWatcher();
  usePointerWatcher();

  useEffect(() => {
    document.documentElement.lang = state.lang;
    document.documentElement.dir = vm.dir;
  }, [state.lang, vm.dir]);

  const Page = PAGES[state.route as Route] ?? PAGES.home;

  return (
    <div dir={vm.dir} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header vm={vm} />
      <main style={{ flex: 1 }}>
        {vm.showBack ? <BackLink vm={vm} /> : null}
        <Page vm={vm} />
        {vm.hed.open ? <HomeownerEditModal vm={vm} /> : null}
        {vm.ed.open ? <ContractorEditModal vm={vm} /> : null}
      </main>
      <Footer vm={vm} />
    </div>
  );
}
