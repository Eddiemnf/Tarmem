/* Under a project's messages: which contractor the homeowner is talking to. A contractor has one thread with the
   homeowner; a homeowner has one per bidder, and one with the contractor the project is awarded to (supabase/019). */
import { PLATFORM_COPY } from './copy';
import { useLaunchActions, type VM } from '../state/viewModel';

export default function ThreadPicker({ vm }: { vm: VM }) {
  const { host } = useLaunchActions();
  const threads = (vm.msgThreads as { id: string; name: string; on: boolean }[] | undefined) || [];
  if (!vm.tab?.messages || threads.length < 2) return null;
  const copy = PLATFORM_COPY[vm.dir === 'ltr' ? 'en' : 'ar'];
  return (
    <div className="card thread-picker" style={{ maxWidth: '760px', padding: '14px 18px', gap: '10px', marginTop: '12px', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }} role="group" aria-label={copy.msgsWith}>
      <span className="muted" style={{ fontSize: '12.5px' }}>{copy.msgsWith}</span>
      {threads.map((t) => (
        <button key={t.id} type="button" className="tchip" aria-pressed={t.on ? 'true' : 'false'} onClick={() => host.setLogicState({ msgThread: t.id, msgDraft: '', msgError: '' })}>{t.name}</button>
      ))}
    </div>
  );
}
