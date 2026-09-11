/* Copy added by the implementation, kept separate from the approved design copy
   in tarmem-data.ts so the two never blur together.

   Only new functionality gets a string here: the prototype ran the assistant
   inside Claude Design, and a deployed build needs to say honestly when no
   assistant endpoint is connected. */

import type { Lang } from '../state/types';

export const EXTRA = {
  en: {
    /** Shown in the planning workspace when VITE_AI_ENDPOINT is not configured. */
    aiNotConnected:
      'The assistant is not connected in this build. Fill the brief in yourself below, or post the project through the ordinary form — both work without it.',
  },
  ar: {
    aiNotConnected:
      'المساعد غير متصل في هذه النسخة. اكتب تفاصيل المشروع بنفسك في الحقول أدناه، أو انشر المشروع عبر النموذج المعتاد — كلاهما يعمل بدون المساعد.',
  },
} satisfies Record<Lang, Record<string, string>>;
