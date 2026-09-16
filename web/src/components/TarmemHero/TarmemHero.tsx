/* The approved landing-page hero (Saudi villa construction film).

   Ported from the design export's `react/TarmemHero.jsx` with the same DOM,
   class names and playback behaviour. Two adaptations for this site:

   - Text comes in through `copy` instead of being hard-coded Arabic, so the
     EN toggle works on the hero like it does everywhere else. The defaults are
     the export's approved Arabic, so the component still matches the design
     when rendered without copy.
   - `dir` / `lang` follow the site language rather than being fixed to Arabic.

   The header slot is unused here: this site has its own role-aware header
   (account menu, notifications, language) that must stay above every route, so
   it is kept outside the hero — the arrangement the export calls for when
   adapting the existing navigation would be a larger change. */

import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import './TarmemHero.css';

export interface HeroCopy {
  eyebrow: string;
  /** Headline first line, set in white. */
  titleLead: string;
  /** Headline second line, set in the lighter tone. */
  titleTail: string;
  /** Lines of the supporting paragraph; a break is inserted between them. */
  body: string[];
  primaryCta: string;
  actionNote: string;
  location: string;
  sceneLabel: string;
  contractorCta: string;
  pause: string;
  replay: string;
  play: string;
  homeLabel: string;
}

export const HERO_COPY_AR: HeroCopy = {
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

interface NavItem {
  label: string;
  href?: string;
  onClick?: (event: React.MouseEvent) => void;
}

interface Props {
  onStartProject: () => void;
  onJoinContractor?: () => void;
  navItems?: NavItem[];
  logoSrc?: string;
  homeHref?: string;
  header?: ReactNode | false;
  exploreHref?: string;
  videoSrc?: string;
  posterSrc?: string;
  copy?: HeroCopy;
  dir?: 'rtl' | 'ltr';
  lang?: string;
}

/** navigator.connection is not in the DOM lib; only saveData is used here. */
type SaveDataConnection = EventTarget & { saveData?: boolean };

export default function TarmemHero({
  onStartProject,
  onJoinContractor,
  navItems = [],
  logoSrc,
  homeHref = '/',
  header,
  exploreHref,
  videoSrc = '/tarmem-hero/villa-construction-1080p.mp4',
  posterSrc = '/tarmem-hero/villa-film-poster.webp',
  copy = HERO_COPY_AR,
  dir = 'rtl',
  lang = 'ar',
}: Props) {
  const id = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [playback, setPlayback] = useState<'paused' | 'playing' | 'ended'>('paused');
  const [videoFailed, setVideoFailed] = useState(false);
  const showMenu = navItems.length > 0 || Boolean(onJoinContractor);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;
    let active = true;
    setVideoFailed(false);
    setPlayback('paused');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & { connection?: SaveDataConnection }).connection;
    const pauseForPreference = () => {
      if (motion.matches || connection?.saveData) video.pause();
    };
    const pauseWhenHidden = () => {
      if (document.hidden) video.pause();
    };
    video.muted = true;
    video.defaultMuted = true;
    if (!motion.matches && !connection?.saveData && !document.hidden) {
      video.play().catch(() => { if (active) setPlayback('paused'); });
    }
    motion.addEventListener('change', pauseForPreference);
    connection?.addEventListener?.('change', pauseForPreference);
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => {
      active = false;
      video.pause();
      motion.removeEventListener('change', pauseForPreference);
      connection?.removeEventListener?.('change', pauseForPreference);
      document.removeEventListener('visibilitychange', pauseWhenHidden);
    };
  }, [videoSrc]);

  useEffect(() => {
    if (!menuOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [menuOpen]);

  // The export guards against shipping an inactive CTA; TypeScript makes the
  // prop required, and this keeps the guard for anything passed at runtime.
  if (typeof onStartProject !== 'function') {
    throw new Error('TarmemHero requires onStartProject: connect your existing project action.');
  }

  const toggleVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused && !video.ended) {
      video.pause();
    } else {
      if (video.ended) video.currentTime = 0;
      video.play().catch(() => setPlayback('paused'));
    }
  };

  const controlLabel = playback === 'playing' ? copy.pause
    : playback === 'ended' ? copy.replay : copy.play;
  const controlIcon = playback === 'playing' ? 'Ⅱ' : playback === 'ended' ? '↻' : '▷';

  const renderNavItem = (item: NavItem, index: number) => {
    const onClick = (event: React.MouseEvent) => {
      setMenuOpen(false);
      item.onClick?.(event);
    };
    return item.href ? (
      <a key={index} href={item.href} onClick={onClick}>{item.label}</a>
    ) : (
      <button key={index} type="button" onClick={onClick}>{item.label}</button>
    );
  };
  const joinContractor = () => { setMenuOpen(false); onJoinContractor?.(); };

  return (
    <div className="tmh-root" dir={dir} lang={lang}>
      <section className="tmh-hero" aria-labelledby={`${id}-title`}>
        <div className="tmh-hero-media" aria-hidden="true">
          <img className="tmh-villa" src={posterSrc} alt="" fetchPriority="high" width="1920" height="1080" />
          {videoSrc && <video
            ref={videoRef} src={videoSrc} muted playsInline preload="none"
            poster={posterSrc} hidden={videoFailed} tabIndex={-1}
            onPlay={() => setPlayback('playing')}
            onPause={(event) => setPlayback(event.currentTarget.ended ? 'ended' : 'paused')}
            onEnded={() => setPlayback('ended')}
            onError={() => setVideoFailed(true)}
          />}
        </div>
        <div className="tmh-hero-shade" aria-hidden="true" />
        {header === undefined ? (
          <header className="tmh-header">
            <a className="tmh-brand" href={homeHref} aria-label={copy.homeLabel}>
              {logoSrc ? <img className="tmh-official-logo" src={logoSrc} alt="ترميم" /> : <>
                <svg className="tmh-brand-symbol" viewBox="0 0 42 46" fill="none" aria-hidden="true"><path d="M5 25v3c0 10 6 15 15 15s16-6 16-16V4" stroke="currentColor" strokeWidth="5" /><path d="M23 9v15M12 17v10" stroke="currentColor" strokeWidth="5" /></svg>
                <span className="tmh-brand-type"><strong>ترميم</strong><span lang="en" dir="ltr">tarmem</span></span>
              </>}
            </a>
            <nav className="tmh-desktop-nav" aria-label="القائمة الرئيسية">{navItems.map(renderNavItem)}</nav>
            <div className="tmh-header-actions">
              {onJoinContractor && <button type="button" className="tmh-contractor-button" onClick={joinContractor}>{copy.contractorCta} <span aria-hidden="true">↖</span></button>}
              {showMenu && <button
                type="button" ref={menuRef} className="tmh-menu-button"
                aria-expanded={menuOpen} aria-controls={`${id}-menu`}
                aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
                onClick={() => setMenuOpen(!menuOpen)}
              ><span /><span /></button>}
            </div>
            <nav className="tmh-mobile-nav" id={`${id}-menu`} aria-label="القائمة الرئيسية للجوال" hidden={!menuOpen}>
              {navItems.map(renderNavItem)}
              {onJoinContractor && <button type="button" onClick={joinContractor}>{copy.contractorCta} ↖</button>}
            </nav>
          </header>
        ) : header}
        <div className="tmh-scene-label" dir="ltr"><span className="tmh-fine-line" /><span>{copy.sceneLabel}</span></div>
        <div className="tmh-hero-content">
          <div className="tmh-hero-heading">
            <p className="tmh-eyebrow"><span className="tmh-spark" aria-hidden="true">✳</span> {copy.eyebrow}</p>
            <h1 id={`${id}-title`}>{copy.titleLead}<br /><span>{copy.titleTail}</span></h1>
          </div>
          <div className="tmh-hero-action">
            <p>
              {copy.body.map((line, index) => (
                <Fragment key={index}>
                  {line}
                  {index < copy.body.length - 1
                    ? <br className={index === 1 ? 'tmh-desktop-break' : undefined} />
                    : null}
                </Fragment>
              ))}
            </p>
            <button type="button" className="tmh-primary-button" onClick={onStartProject}><span>{copy.primaryCta}</span><span className="tmh-arrow-disc" aria-hidden="true">↖</span></button>
            {/* In the approved design this button sits in the hero's own header.
                This site keeps its existing header above the hero instead, so
                the contractor route would otherwise vanish from the hero — it
                moves in beside the primary action, in the export's own style. */}
            {header === false && onJoinContractor ? (
              <button type="button" className="tmh-contractor-button tmh-contractor-inline" onClick={joinContractor}>{copy.contractorCta} <span aria-hidden="true">↖</span></button>
            ) : null}
            <span className="tmh-action-note">{copy.actionNote}</span>
          </div>
        </div>
        <footer className="tmh-hero-footer">
          <span className="tmh-location"><svg width="14" height="16" viewBox="0 0 14 18" fill="none" aria-hidden="true"><path d="M12.5 6.6C12.5 11 7 16 7 16S1.5 11 1.5 6.6a5.5 5.5 0 1 1 11 0Z" stroke="currentColor" /><circle cx="7" cy="6.5" r="1.7" stroke="currentColor" /></svg> {copy.location}</span>
          {videoSrc && !videoFailed && <button type="button" className="tmh-replay" onClick={toggleVideo} aria-label={controlLabel} title={controlLabel}><span className="tmh-control-label">{controlLabel}</span><span className="tmh-control-icon" aria-hidden="true">{controlIcon}</span></button>}
          {exploreHref && <a className="tmh-explore" href={exploreHref}>اكتشف التجربة <span aria-hidden="true">↓</span></a>}
        </footer>
      </section>
    </div>
  );
}
