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
    startRole: role && ['guest', 'homeowner', 'contractor', 'admin'].includes(role) ? role : undefined,
  };
}

export function LogicProvider({ children }: { children: ReactNode }) {
  const [host] = useState(() => new LogicHost(new Component(startProps())));

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
  const vm = useMemo(() => host.render(), [host, version]);
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
