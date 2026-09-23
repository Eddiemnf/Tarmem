/* What the public early-access site does differently from the full product.

   The design's logic is the whole marketplace: sign-in, dashboards, wallets, an
   admin console, all running on invented data. None of that may reach a real
   visitor. Rather than fork the logic, the public site lets it run and corrects
   its state on the way through `setState`, which every navigation passes through:

   - routes that are not public never become current — they are redirected to
     the request form, the contractor application, or home;
   - nobody can be signed in;
   - publishing a project, and sending the contact form, deliver a real message
     to the Tarmem team (src/launch/deliver.ts) instead of updating seed data. */

import * as D from '../data/tarmem-data';
import { platformOn } from '../platform/client';
import { currentAccount, isRecovering, needsMobileCode, signOut } from '../platform/session';
import type { LogicState } from '../state/designRuntime';
import { LAUNCH_COPY } from './copy';
import { openWhatsApp } from './deliver';

/** Pages that need a real, signed-in account. They exist only once the database is connected. */
const ACCOUNT_ROUTES = new Set(['hdash', 'cdash', 'browse', 'project', 'admin', 'inbox', 'settings', 'homeowner', 'contractor', 'wallet']);

/** Work the guard starts but cannot finish inside a click: it needs the network (src/platform/bind.ts). */
export interface GuardEffects {
  contact: (form: LogicState, lang: 'ar' | 'en') => void;
  withdraw: (dbId: string) => void;
}

/** Pages a visitor can be on. `join` and `sent` exist only on the public site. */
export const PUBLIC_ROUTES = new Set([
  'home', 'how', 'pricing', 'about', 'help', 'faq', 'contact', 'rules', 'terms', 'privacy', 'post', 'join', 'sent',
]);

export interface SentRequest {
  kind: 'project' | 'join' | 'contact';
  text: string;
  files: number;
  /** Set when the request was saved to the database instead: the sentence that confirms it. */
  saved?: string;
}

type Lang = 'ar' | 'en';
const langOf = (state: LogicState): Lang => (state.lang === 'en' ? 'en' : 'ar');
const fmt = (n: unknown) => (Number(n) || 0).toLocaleString('en-US');
const label = (list: { id: string; ar: string; en: string }[], id: string, lang: Lang) =>
  list.find((x) => x.id === id)?.[lang] || id;

const paragraphs = (...blocks: (string | false | undefined)[][]) =>
  blocks.map((lines) => lines.filter(Boolean).join('\n')).filter(Boolean).join('\n\n');

/** The project form, written out as the message the homeowner sends. */
export function projectMessage(state: LogicState): SentRequest {
  const lang = langOf(state);
  const c = LAUNCH_COPY[lang].request;
  const f = state.post.f;
  const files = (state.post.files || []).length;
  const address = String(f.address || '').trim();
  const budget = lang === 'ar' ? `من ${fmt(f.min)} إلى ${fmt(f.max)} ريال` : `SAR ${fmt(f.min)} – ${fmt(f.max)}`;
  const timing = (D.T as LogicState)[lang].post[f.timing] || f.timing;
  const text = paragraphs(
    [c.heading],
    [
      `${c.title}: ${f.title}`,
      `${c.trade}: ${label(D.TRADES, f.trade, lang)}`,
      `${c.city}: ${label(D.CITIES, f.city, lang)}`,
      address && `${c.address}: ${address}`,
      `${c.budget}: ${budget}`,
      `${c.timing}: ${timing}`,
    ],
    [`${c.desc}:`, String(f.desc || '').trim()],
    [files > 0 && `${c.files}: ${files} — ${c.filesNote}`],
  );
  return { kind: 'project', text, files };
}

function contactMessage(state: LogicState): SentRequest {
  const lang = langOf(state);
  const c = LAUNCH_COPY[lang].contact;
  const f = state.contact;
  const text = paragraphs(
    [c.heading],
    [
      `${c.name}: ${f.name}`,
      f.phone && `${c.phone}: ${f.phone}`,
      f.email && `${c.email}: ${f.email}`,
      f.topic && `${c.topic}: ${f.topic}`,
    ],
    [`${c.msg}:`, String(f.msg || '').trim()],
  );
  return { kind: 'contact', text, files: 0 };
}

/** Correct a state the logic is about to adopt. Runs synchronously inside the click that caused it. */
export function guardLaunchState(prev: LogicState, next: LogicState, initialPost: unknown, effects?: GuardEffects): LogicState {
  let state = next;
  const patch = (extra: LogicState) => { state = { ...state, ...extra }; };

  /* Who is signed in is decided by the database session and by nothing else: the design's own
     sign-in (a code it shows on screen, the demo buttons) can never put anybody in. */
  if (platformOn && prev.user && !state.user && currentAccount()) signOut(); // the account menu's "sign out"
  const user = platformOn ? currentAccount()?.logicUser ?? null : null;
  if (state.user !== user) patch({ user });
  if (platformOn && !user && state.projects?.length) patch({ projects: [] });

  // "Withdraw project" removes it from the list. For a real project that is a change of status in the database.
  if (effects && user && prev.user && prev.withdrawAsk && !state.withdrawAsk && prev.projects?.length === (state.projects?.length ?? 0) + 1) {
    const gone = prev.projects.find((p: LogicState) => p.id === prev.curId && !state.projects.some((q: LogicState) => q.id === p.id));
    if (gone?.dbId) effects.withdraw(gone.dbId);
  }

  // The contact form "sends" by flipping a flag. Here it really sends.
  if (state.contact?.sent && !prev.contact?.sent) {
    if (platformOn && effects) {
      // `delivered` marks the flip that follows a saved message; any other flip starts the save instead.
      if (!state.contact.delivered) {
        patch({ contact: { ...state.contact, sent: false, busy: true, error: '' } });
        if (!prev.contact?.busy) effects.contact(state.contact, langOf(state));
      }
    } else {
      const message = contactMessage(state);
      openWhatsApp(message.text);
      patch({ launchLast: message });
    }
  }

  // Somebody who opened a "reset your password" link chooses the new password before anything else.
  if (platformOn && isRecovering() && user) return state.route === 'reset' ? state : { ...state, route: 'reset' };

  const wantsContractorSignup = state.route === 'auth' && state.auth?.mode === 'signup' && state.auth?.role === 'contractor';
  const allowed = PUBLIC_ROUTES.has(state.route) || (platformOn && !wantsContractorSignup && (
    (state.route === 'auth' && !user)
    // right after sign-up, the mobile-code step holds the sign-in page until the code is in or skipped
    || (state.route === 'auth' && state.auth?.mode === 'signup' && needsMobileCode())
    // the reset-password page itself says when its link has expired
    || state.route === 'reset'
    || (state.route === 'hdash' && user?.role === 'homeowner')
    // a contractor has their dashboard from the moment they apply; the open projects once an admin has verified them
    || (state.route === 'settings' && (user?.role === 'homeowner' || user?.role === 'contractor'))
    // "my profile": a homeowner's own. Other people's profiles wait for reviews to exist.
    || (state.route === 'homeowner' && user?.role === 'homeowner' && (!state.curId || state.curId === 'h1'))
    // a verified contractor's profile: their own, or a bidder on the homeowner's projects — never an id the page does not already hold
    || (state.route === 'contractor' && Boolean(user) && state.contractors?.some((c: LogicState) => c.id === state.curId && c.verified))
    // the wallet opens with payments
    || (state.route === 'wallet' && (user?.role === 'homeowner' || user?.role === 'contractor') && Boolean(currentAccount()?.paymentsLive))
    || (state.route === 'cdash' && user?.role === 'contractor')
    || (state.route === 'browse' && user?.role === 'contractor' && Boolean(user.nafath))
    || (state.route === 'project' && Boolean(user) && state.projects?.some((p: LogicState) => p.id === state.curId))
    // the designed admin console, and the plain contact list beside it: only for an account marked admin in the database
    || ((state.route === 'admin' || state.route === 'inbox') && user?.role === 'admin')));
  const ownHome = user?.role === 'admin' ? 'admin' : user?.role === 'contractor' ? 'cdash' : 'hdash';

  if (!allowed) {
    const target = state.route;
    if (platformOn && target === 'auth' && user) {
      patch({ route: ownHome });
    } else if (platformOn && ACCOUNT_ROUTES.has(target)) {
      // signed out: sign in first. Signed in, but not their page (somebody else's project, the team's console): their own home.
      patch(user ? { route: ownHome } : { route: 'auth', auth: { ...state.auth, mode: 'signin', role: 'homeowner', error: '' } });
    } else if (target === 'auth' && state.pendingPost) {
      // A guest pressed "publish" on the last step of the project form.
      const message = projectMessage(state);
      openWhatsApp(message.text);
      patch({ route: 'sent', pendingPost: false, launchLast: message, post: initialPost });
    } else if (wantsContractorSignup) {
      // contractors apply; the role is put back so a later "sign in" is not mistaken for another application
      patch({ route: 'join', auth: { ...state.auth, mode: 'signin', role: 'homeowner' } });
    } else if (target === 'auth' || target === 'plan' || target === 'contractors') {
      // "Describe your project", a trade tile, or any other way in: all lead to the request form.
      const f = { ...state.post.f };
      if (target === 'plan') {
        // The assistant page is not public. What the visitor typed (the logic has already moved
        // it into the assistant's conversation) becomes the request's description instead, and
        // the conversation is emptied so the queued assistant call finds nothing to send.
        const typed = String(state.plan?.msgs?.[0]?.text || state.aiText || '').trim();
        if (typed && !String(f.desc || '').trim()) f.desc = typed;
        patch({ aiText: '', plan: { ...state.plan, msgs: [], busy: false } });
      }
      const trade = state.filt?.trade;
      if (target === 'contractors' && trade && (D.TRADES as { id: string }[]).some((x) => x.id === trade)) f.trade = trade;
      patch({ route: 'post', post: { ...state.post, f } });
    } else {
      patch({ route: 'home' });
    }
    // A project waiting for its owner to sign in survives the sign-in itself (src/platform/AuthPage.tsx publishes it).
    if (state.pendingPost && state.route !== 'auth' && !(platformOn && user)) patch({ pendingPost: false });
  }
  return state;
}
