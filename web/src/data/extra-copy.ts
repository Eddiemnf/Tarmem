/* Copy added by the implementation, kept separate from the approved design copy
   in tarmem-data.ts so the two never blur together. */

import type { HeroCopy } from '../components/TarmemHero/TarmemHero';
import type { Lang } from '../state/types';

/* The landing-page hero.

   The Arabic is the approved wording from the hero export, verbatim. The
   English is a translation written here so the EN toggle works on the hero like
   the rest of the site — it has NOT been through the same approval as the
   Arabic, so have it read before the English page goes in front of customers. */
const HERO_AR: HeroCopy = {
  eyebrow: 'لبيتك فصل جديد',
  titleLead: 'بيتك، كما تتخيّله.',
  titleTail: 'مع مقاول تثق فيه.',
  body: [
    'كل تجديد جميل يبدأ بخطوة.',
    'شاركنا فكرتك، قارن عروض المقاولين،',
    'وابدأ رحلة تجديد بيتك بثقة.',
  ],
  primaryCta: 'ابدأ مشروعك',
  actionNote: 'من أول فكرة، لآخر تفصيلة.',
  location: 'رؤية مستوحاة من بيوتنا في السعودية',
  sceneLabel: 'SAUDI HOMES. REIMAGINED.',
  contractorCta: 'انضم كمقاول',
  pause: 'إيقاف مؤقت',
  replay: 'إعادة المشاهدة',
  play: 'تشغيل الفيلم',
  homeLabel: 'ترميم — الرئيسية',
};

const HERO_EN: HeroCopy = {
  eyebrow: 'A new chapter for your home',
  titleLead: 'Your home, as you picture it.',
  titleTail: 'With a contractor you trust.',
  body: [
    'Every renovation starts with one step.',
    'Share your idea, compare bids,',
    'and renovate with confidence.',
  ],
  primaryCta: 'Start your project',
  actionNote: 'From the first idea to the last detail.',
  location: 'A vision drawn from our own homes in Saudi Arabia',
  sceneLabel: 'SAUDI HOMES. REIMAGINED.',
  contractorCta: 'Join as a contractor',
  pause: 'Pause',
  replay: 'Watch again',
  play: 'Play the film',
  homeLabel: 'Tarmem — home',
};

export const EXTRA = {
  en: {
    /** Shown in the planning workspace when VITE_AI_ENDPOINT is not configured. */
    aiNotConnected:
      'The assistant is not connected in this build. Fill the brief in yourself below, or post the project through the ordinary form — both work without it.',
    hero: HERO_EN,
  },
  ar: {
    aiNotConnected:
      'المساعد غير متصل في هذه النسخة. اكتب تفاصيل المشروع بنفسك في الحقول أدناه، أو انشر المشروع عبر النموذج المعتاد — كلاهما يعمل بدون المساعد.',
    hero: HERO_AR,
  },
} satisfies Record<Lang, { aiNotConnected: string; hero: HeroCopy }>;
