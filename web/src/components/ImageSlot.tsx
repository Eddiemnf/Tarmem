/* A fillable image placeholder.

   The prototype used Claude Design's <image-slot> element, which let the
   designer drop real photographs into the mockup. The same affordance is kept
   here so contractor cards, portfolios and the About page can be filled with
   real imagery: click or drop a file, and it persists per browser.

   When real photography ships, point `src` at the asset and the slot renders
   it directly — the drop behaviour is then just an editing convenience. */

import { useCallback, useRef, useState, type CSSProperties } from 'react';

const STORAGE_PREFIX = 'tarmem-image-slot:';

interface Props {
  /** Persistence key; must be unique per slot. */
  id: string;
  shape?: 'rect' | 'rounded' | 'circle' | 'pill';
  radius?: number;
  /** 'cover' fills the frame, 'contain' shows the whole image (used for logos). */
  fit?: 'cover' | 'contain';
  placeholder?: string;
  src?: string;
  style?: CSSProperties;
}

const RADII: Record<string, string> = { rect: '0', rounded: '12px', circle: '50%', pill: '999px' };

function readStored(id: string): string | null {
  try {
    return localStorage.getItem(STORAGE_PREFIX + id);
  } catch {
    return null;
  }
}

export function ImageSlot({
  id, shape = 'rounded', radius, fit = 'cover', placeholder = 'Drop an image', src, style,
}: Props) {
  const [entry, setEntry] = useState(() => ({ id, data: readStored(id) }));
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // A slot reused for a different id reloads that id's image (React's
  // documented way to reset state from a prop, rather than an effect).
  if (entry.id !== id) setEntry({ id, data: readStored(id) });
  const stored = entry.id === id ? entry.data : null;

  const accept = useCallback((file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result);
      setEntry({ id, data });
      try {
        localStorage.setItem(STORAGE_PREFIX + id, data);
      } catch {
        /* image too large for storage — it still shows for this session */
      }
    };
    reader.readAsDataURL(file);
  }, [id]);

  const image = stored || src;
  const borderRadius = radius !== undefined ? `${radius}px` : RADII[shape];

  return (
    <div
      onClick={() => input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        accept(e.dataTransfer.files?.[0]);
      }}
      title={placeholder}
      style={{
        position: 'relative', overflow: 'hidden', borderRadius, cursor: 'pointer',
        background: image ? 'transparent' : 'rgba(127,127,127,.08)',
        display: 'block', width: '100%', height: '100%', ...style,
      }}
    >
      {image ? (
        <img
          src={image}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: fit, display: 'block' }}
        />
      ) : (
        <span
          style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px',
            textAlign: 'center', fontSize: '12px', lineHeight: 1.5, color: '#6E685E',
            border: `1.5px dashed ${over ? '#FF5A3C' : 'currentColor'}`,
            opacity: over ? 1 : 0.75, borderRadius, userSelect: 'none',
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-4.5-4.5L3 21" />
          </svg>
          {placeholder}
        </span>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => accept(e.target.files?.[0])}
      />
    </div>
  );
}
