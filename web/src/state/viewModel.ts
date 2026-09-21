/* The view model.

   Every value and handler the generated pages bind to (`vm.*`) comes from the
   design's own logic class — `renderVals()` in `designLogic.generated.ts`,
   carried over verbatim from project/Tarmem.dc.html. The markup and the logic
   are generated from the same file, so they cannot drift apart, and the fee,
   VAT and escrow arithmetic is exactly the design's.

   This module only binds that class to React: one instance for the app's
   lifetime, re-rendered whenever it calls `setState`. */

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { LAUNCH_COPY } from '../launch/copy';
import { openWhatsApp } from '../launch/deliver';
import { guardLaunchState, type SentRequest } from '../launch/guard';
import { isLaunch } from '../launch/mode';
import Component from './designLogic.generated';
import { LogicHost, type LogicState, type LogicVals } from './designRuntime';

/** The template's bindings are untyped in the design, so they are here too. */
export type VM = LogicVals;

const HostContext = createContext<LogicHost | null>(null);

/* The prototype's two editor props. On the site they can be given in the URL
   (`?lang=en&role=contractor`) to open a fresh visit in a language or role —
   they never override what a returning visitor already has saved. */
function startProps(): Record<string, unknown> {
  const query = new URLSearchParams(window.location.search);
  const lang = query.get('lang');
  const role = query.get('role');
  return {
    startLang: lang === 'ar' || lang === 'en' ? lang : undefined,
    // A role opens a signed-in demo account, so the public site never honours it.
    startRole: !isLaunch && role && ['guest', 'homeowner', 'contractor', 'admin'].includes(role) ? role : undefined,
  };
}

function createHost(): LogicHost {
  const logic = new Component(startProps());
  if (!isLaunch) return new LogicHost(logic);
  const initialPost = JSON.parse(JSON.stringify(logic.state.post)); // plain data; structuredClone needs Safari 15.4+
  return new LogicHost(logic, (prev, next) => guardLaunchState(prev, next, initialPost));
}

/** What the public site changes in the bindings: a flag the generated markup checks, and a few strings —
    including the footer's line about a licensed payment partner, which stays off until one is signed. */
function launchVals(vm: LogicVals, state: LogicState): LogicVals {
  if (!vm.t) return vm;
  const copy = LAUNCH_COPY[vm.dir === 'ltr' ? 'en' : 'ar'];
  return {
    ...vm,
    launch: true,
    /** The request last written into WhatsApp, for the page that follows it (src/launch/SentPage.tsx). */
    launchLast: state.launchLast,
    t: { ...vm.t, pages: { ...vm.t.pages, cSent: copy.contactSent }, footer: { ...vm.t.footer, note: '' } },
    post: vm.post?.step4 ? { ...vm.post, nextLabel: copy.sendWhatsApp } : vm.post,
  };
}

export function LogicProvider({ children }: { children: ReactNode }) {
  const [host] = useState(createHost);

  useEffect(() => {
    host.mount();
    return () => host.unmount();
  }, [host]);

  return createElement(HostContext.Provider, { value: host }, children);
}

function useHost(): LogicHost {
  const host = useContext(HostContext);
  if (!host) throw new Error('useViewModel must be used inside <LogicProvider>');
  return host;
}

/** Call once, from the app shell: it also drives the logic's post-commit lifecycle. */
export function useViewModel(): VM {
  const host = useHost();
  const version = useSyncExternalStore(host.subscribe, host.getVersion);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` is the change signal
  const vm = useMemo(() => (isLaunch ? launchVals(host.render(), host.logic.state) : host.render()), [host, version]);
  useEffect(() => {
    host.committed();
  });
  return vm;
}

/** The logic's current state, for the few shell concerns that are not bindings. */
export function useLogicState(): LogicState {
  const host = useHost();
  useSyncExternalStore(host.subscribe, host.getVersion);
  return host.logic.state;
}

/** For the public site's own pages: write a request into WhatsApp and show what happens next. */
export function useLaunchActions(): { send: (request: SentRequest) => void } {
  const host = useHost();
  return useMemo(() => ({
    send: (request: SentRequest) => {
      openWhatsApp(request.text);
      host.setLogicState({ route: 'sent', launchLast: request });
      window.scrollTo(0, 0);
    },
  }), [host]);
}
