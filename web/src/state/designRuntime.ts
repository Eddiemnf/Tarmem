/* The host the design's logic class runs on.

   The Claude Design prototype is one template plus one logic class
   (`class Component extends DCLogic`). Its runtime gives that class a small,
   React-like contract: `props`, `state`, `setState(update, callback)`, the three
   lifecycle methods, and `renderVals()` — the flat object every `{{ binding }}`
   in the template resolves against.

   `tools/convert-template.py` carries the class over verbatim into
   `designLogic.generated.ts`; this file is the contract it extends, kept
   identical to the prototype runtime (project/support.js, `StreamableLogic`) so
   the logic behaves here exactly as it does in the design. */

import { AiUnavailableError, complete, type CompletionRequest } from '../ai/client';
import { EXTRA } from '../data/extra-copy';

/* eslint-disable @typescript-eslint/no-explicit-any -- the design's state and bindings are untyped */
export type LogicState = Record<string, any>;
export type LogicVals = Record<string, any>;
export type StateUpdate = LogicState | ((prev: LogicState) => LogicState | null | undefined);

export class DCLogic {
  props: Record<string, unknown>;
  state: LogicState = {};
  /** Back-pointer to the host, installed after construction. */
  __host: LogicHost | null = null;

  constructor(props?: Record<string, unknown>) {
    this.props = props || {};
  }

  setState(update: StateUpdate, callback?: () => void): void {
    this.__host?.setLogicState(update, callback);
  }

  forceUpdate(): void {
    this.__host?.bump();
  }

  componentDidMount(): void | Promise<void> {}
  componentDidUpdate(_prevProps?: Record<string, unknown>): void {}
  componentWillUnmount(): void {}

  /** The flat object the template renders against (merged over props). */
  renderVals(): LogicVals {
    return {};
  }
}

/** Owns one logic instance and tells React when its state has changed. */
export class LogicHost {
  readonly logic: DCLogic;
  /** The project form as it starts out, for putting it back after a request is sent (public site only). */
  initialPost: unknown = null;
  private version = 0;
  private readonly listeners = new Set<() => void>();
  private callbacks: (() => void)[] = [];

  /** Corrects every state before the logic adopts it; the public site uses it (src/launch/guard.ts). */
  private readonly guard: ((prev: LogicState, next: LogicState) => LogicState) | null;

  constructor(logic: DCLogic, guard: ((prev: LogicState, next: LogicState) => LogicState) | null = null) {
    this.logic = logic;
    this.guard = guard;
    logic.__host = this;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getVersion = (): number => this.version;

  setLogicState(update: StateUpdate, callback?: () => void): void {
    const prev = this.logic.state;
    const patch = typeof update === 'function' ? update(prev) : update;
    const next = { ...prev, ...patch };
    this.logic.state = this.guard ? this.guard(prev, next) : next;
    if (callback) this.callbacks.push(callback);
    this.bump();
  }

  bump(): void {
    this.version += 1;
    for (const listener of this.listeners) listener();
  }

  /** Template values: `renderVals()` merged over props, as the prototype runtime does. */
  render(): LogicVals {
    return { ...this.logic.props, ...this.logic.renderVals() };
  }

  /* The logic guards its listeners and timers with "already started" flags that
     its unmount never resets, so it must mount exactly once. React's StrictMode
     mounts, unmounts and re-mounts every effect in development; the unmount is
     therefore deferred a tick and cancelled by the immediate re-mount. */
  private mounted = false;
  private pendingUnmount: number | null = null;

  mount(): void {
    if (this.pendingUnmount !== null) {
      window.clearTimeout(this.pendingUnmount);
      this.pendingUnmount = null;
    }
    if (this.mounted) return;
    this.mounted = true;
    void this.logic.componentDidMount();
  }

  /** Runs after every commit: the logic's own didUpdate, then queued setState callbacks. */
  committed(): void {
    this.logic.componentDidUpdate(this.logic.props);
    if (!this.callbacks.length) return;
    const queued = this.callbacks;
    this.callbacks = [];
    for (const callback of queued) callback();
  }

  unmount(): void {
    this.pendingUnmount = window.setTimeout(() => {
      this.pendingUnmount = null;
      this.mounted = false;
      this.logic.componentWillUnmount();
    }, 0);
  }
}

/* The prototype called `window.claude.complete` inside Claude Design. A deployed
   site has no such runtime and must never hold a model key, so the generated
   logic is pointed at this object instead (see LOGIC_PATCHES in the converter). */
export const claude = {
  complete: (request: CompletionRequest): Promise<string> => complete(request),
};

/** The message for a failed assistant call: say so plainly when none is configured. */
export function aiErrorText(error: unknown, lang: string, fallback: string): string {
  if (error instanceof AiUnavailableError) return EXTRA[lang === 'en' ? 'en' : 'ar'].aiNotConnected;
  return fallback;
}
