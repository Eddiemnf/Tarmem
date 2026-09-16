/* The "وش ودّك تجدّد في بيتك؟" assistant entry.

   It used to sit inside the old hero. The new film hero replaces that block, so
   the bar moved here, directly beneath it — otherwise the planning workspace
   would have no way in, and the floating "ابدأ من هنا" pill would scroll to an
   element that no longer exists.

   Markup and classes are unchanged from the generated hero section. */

import React from 'react';
import type { VM } from '../state/viewModel';

export default function AssistantBar({ vm }: { vm: VM }) {
  return (
    <section className="v-wrap" style={{ paddingBlock: 'clamp(30px,3.6vw,52px) 0', maxWidth: '760px' }}>
      <label className="v-kick" htmlFor="v-ai-in" style={{ display: 'block', color: '#FF5A3C', letterSpacing: '.1em' }}>{vm.t.ai.label}</label>
      <div className="v-ai" style={{ marginTop: '12px' }}>
        <textarea id="v-ai-in" rows={2} value={vm.aiText} onChange={vm.setAi} placeholder={vm.t.ai.ph} />
        <div className="v-aifoot">
          <button className="v-icb" type="button" onClick={vm.aiAttach}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-4.5-4.5L3 21" /></svg>
            {vm.aiAttachLabel}
          </button>
          <button className="v-go" type="button" onClick={vm.startPlan} disabled={vm.aiEmpty}>
            {vm.t.ai.send}
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={vm.arrowPath} /></svg>
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '14px' }}>
        {(vm.aiSug || []).map((g, index) => (
          <React.Fragment key={index}>
            <button className="v-chip" type="button" data-q={g.q} onClick={vm.useSug}>{g.q}</button>
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}
