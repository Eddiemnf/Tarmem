/* Joins the database session to the design's logic.

   The logic keeps running exactly as designed; this module feeds it the signed-in person and
   their projects, and replaces the three places where the prototype only pretended to save:
   publishing a project, withdrawing one, and sending the contact form. */

import type { GuardEffects } from '../launch/guard';
import type { LogicHost, LogicState } from '../state/designRuntime';
import { supabase } from './client';
import { PLATFORM_COPY } from './copy';
import { runtimeData, toLogicProject } from './data';
import { createProject, currentAccount, onAccountChange, sendContact, withdrawProject } from './session';

const langOf = (state: LogicState): 'ar' | 'en' => (state.lang === 'en' ? 'en' : 'ar');

/** The signed-in person and their projects, as the logic's own state. */
function accountState(): LogicState {
  const account = currentAccount();
  return { user: account?.logicUser ?? null, projects: (account?.projects || []).map(toLogicProject) };
}

export function guardEffects(getHost: () => LogicHost | null): GuardEffects {
  return {
    contact: (form, lang) => {
      void sendContact({ name: form.name, email: form.email, mobile: form.phone, topic: form.topic, message: form.msg, lang }).then((result) => {
        getHost()?.setLogicState((s) => ({ contact: result.ok
          ? { ...s.contact, sent: true, delivered: true, busy: false, error: '' }
          : { ...s.contact, sent: false, busy: false, error: PLATFORM_COPY[langOf(s)].contactFailed } }));
      });
    },
    withdraw: (dbId) => {
      // If the database refuses, the project comes back into the list rather than silently staying posted.
      void withdrawProject(dbId).then((result) => { if (!result.ok) getHost()?.setLogicState(accountState()); });
    },
  };
}

export function bindPlatform(host: LogicHost, initialPost: LogicState): () => void {
  if (!supabase) return () => undefined;
  const logic = host.logic as unknown as LogicState;
  let publishing = false;

  // The design adds the project to a list in memory. Here it is saved, and the saved row is what opens.
  logic.publishPost = async () => {
    if (publishing) return;
    const state = host.logic.state;
    const copy = PLATFORM_COPY[langOf(state)];
    const f = state.post.f;
    const fail = (error: string) => host.setLogicState((s) => ({ post: { ...s.post, error }, pendingPost: false }));
    const min = Math.round(Number(f.min)), max = Math.round(Number(f.max));
    if (String(f.title || '').trim().length < 3) return fail(copy.err.title);
    if (String(f.desc || '').trim().length < 3) return fail(copy.err.desc);
    if (!(min >= 0) || !(max >= min) || max > 1000000) return fail(copy.err.budget);
    publishing = true;
    host.setLogicState((s) => ({ post: { ...s.post, error: '', busy: true } }));
    const result = await createProject({ title: f.title, trade: f.trade, desc: f.desc, city: f.city, address: f.address || '', min, max, timing: f.timing });
    publishing = false;
    if (!result.ok) {
      host.setLogicState((s) => ({ post: { ...s.post, busy: false, error: copy.err[result.error] }, pendingPost: false, route: 'post' }));
      return;
    }
    const project = toLogicProject(result.ok);
    host.setLogicState((s) => ({ projects: [project, ...s.projects], post: initialPost, pendingPost: false, justPosted: project.id }));
    logic.nav('project', { curId: project.id, tab: 'overview' });
  };

  const apply = () => {
    logic.D = runtimeData(currentAccount()?.profile ?? null);
    host.setLogicState(accountState());
  };
  apply();
  return onAccountChange(apply);
}
