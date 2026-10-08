import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { GHOST_COLORS, moodFor } from '@/lib/labels';
import type { Accessory, GhostColor, Mood } from '@/lib/types';

interface GhostProps {
  /** 0-100 (SRS §6.4). Drives visibility and the face. */
  presence: number;
  color: GhostColor;
  accessory?: Accessory;
  /** 0 Sjena … 4 Legenda (SRS §6.3): aura and trail. */
  phaseIndex?: number;
  /** Bounce once whenever this number goes up (e.g. total HP). */
  pulse?: number;
  className?: string;
  /** Disable float animation (e.g. tiny avatars). */
  still?: boolean;
  /** Skip the presence fade (e.g. accessory previews). */
  solid?: boolean;
}

/** Aura colour and strength per phase; the trail appears from Srebrni trag on. */
const PHASE_STYLE = [
  { aura: null, trail: null },
  { aura: 'rgba(199,199,204,0.35)', trail: null },
  { aura: 'rgba(199,199,204,0.55)', trail: '#c7c7cc' },
  { aura: 'rgba(224,33,138,0.55)', trail: '#c7c7cc' },
  { aura: 'rgba(255,200,60,0.7)', trail: '#ffc83c' },
] as const;

const BODY =
  'M100 20C56 20 28 54 28 100L28 190C28 201 38 205 45 198L58 184C64 178 72 178 78 184L88 194C94 200 106 200 112 194L122 184C128 178 136 178 142 184L155 198C162 205 172 201 172 190L172 100C172 54 144 20 100 20Z';

function Eyes({ mood }: { mood: Mood }) {
  const ink = '#33236b';
  switch (mood) {
    case 'sretan':
      return (
        <g fill={ink}>
          <ellipse cx="76" cy="94" rx="8" ry="11" />
          <ellipse cx="124" cy="94" rx="8" ry="11" />
          <circle cx="79" cy="90" r="3" fill="#fff" />
          <circle cx="127" cy="90" r="3" fill="#fff" />
        </g>
      );
    case 'dobro':
      return (
        <g fill={ink}>
          <ellipse cx="76" cy="95" rx="7.5" ry="10" />
          <ellipse cx="124" cy="95" rx="7.5" ry="10" />
          <circle cx="78.5" cy="91.5" r="2.6" fill="#fff" />
          <circle cx="126.5" cy="91.5" r="2.6" fill="#fff" />
        </g>
      );
    case 'umoran':
      return (
        <g>
          <path d="M66 96q10 8 20 0" stroke={ink} strokeWidth="5" strokeLinecap="round" fill="none" />
          <path d="M114 96q10 8 20 0" stroke={ink} strokeWidth="5" strokeLinecap="round" fill="none" />
        </g>
      );
    case 'tuzan':
      return (
        <g>
          <ellipse cx="76" cy="98" rx="7" ry="9" fill={ink} />
          <ellipse cx="124" cy="98" rx="7" ry="9" fill={ink} />
          <circle cx="78" cy="95" r="2.4" fill="#fff" />
          <circle cx="126" cy="95" r="2.4" fill="#fff" />
          <path d="M62 82l24 6" stroke={ink} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M138 82l-24 6" stroke={ink} strokeWidth="4.5" strokeLinecap="round" />
        </g>
      );
    case 'bolestan':
      return (
        <g stroke={ink} strokeWidth="5" strokeLinecap="round">
          <path d="M68 88l16 16M84 88L68 104" />
          <path d="M116 88l16 16M132 88l-16 16" />
        </g>
      );
  }
}

function Mouth({ mood }: { mood: Mood }) {
  const ink = '#33236b';
  switch (mood) {
    case 'sretan':
      return <path d="M82 118q18 22 36 0z" fill={ink} stroke={ink} strokeWidth="4" strokeLinejoin="round" />;
    case 'dobro':
      return <path d="M86 120q14 14 28 0" stroke={ink} strokeWidth="5" strokeLinecap="round" fill="none" />;
    case 'umoran':
      return <path d="M88 124h24" stroke={ink} strokeWidth="5" strokeLinecap="round" />;
    case 'tuzan':
      return <path d="M86 130q14 -14 28 0" stroke={ink} strokeWidth="5" strokeLinecap="round" fill="none" />;
    case 'bolestan':
      return (
        <path
          d="M82 128q6 -8 12 0t12 0t12 0"
          stroke={ink}
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
  }
}

function AccessoryShape({ accessory }: { accessory: Accessory }) {
  switch (accessory) {
    case 'sesir':
      return (
        <g transform="rotate(-8 100 24)">
          <rect x="62" y="16" width="76" height="9" rx="4.5" fill="#33236b" />
          <path d="M76 18V-8Q76 -14 82 -14h36q6 0 6 6v26z" fill="#4b3a96" />
          <rect x="76" y="6" width="48" height="7" fill="#ff7aa8" />
        </g>
      );
    case 'naocale':
      return (
        <g fill="none" stroke="#33236b" strokeWidth="4">
          <circle cx="76" cy="95" r="17" fill="#ffffff55" />
          <circle cx="124" cy="95" r="17" fill="#ffffff55" />
          <path d="M93 95h14M59 92l-10 -4M141 92l10 -4" strokeLinecap="round" />
        </g>
      );
    case 'masna':
      return (
        <g transform="translate(100 154)">
          <path d="M0 0L-26 -14V14z" fill="#ff5d8f" />
          <path d="M0 0L26 -14V14z" fill="#ff5d8f" />
          <circle r="7" fill="#d93b6f" />
        </g>
      );
    case 'kruna':
      return (
        <g transform="translate(100 22)">
          <path d="M-30 4L-34 -26L-16 -10L0 -32L16 -10L34 -26L30 4z" fill="#ffd54a" stroke="#e0a800" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="0" cy="-8" r="4" fill="#ff5d8f" />
        </g>
      );
    case 'none':
      return null;
  }
}

const SPARKLES: [number, number, number][] = [
  [20, 40, 0],
  [180, 52, 0.12],
  [168, 150, 0.24],
  [30, 150, 0.08],
];

/** SVG ghost avatar: visibility from presence, aura and trail from phase. */
export function Ghost({
  presence,
  color,
  accessory = 'none',
  phaseIndex = 0,
  pulse,
  className,
  still = false,
  solid = false,
}: GhostProps) {
  const uid = useId().replace(/:/g, '');
  const palette = GHOST_COLORS[color];
  const mood = moodFor(presence);
  const [celebrate, setCelebrate] = useState(false);
  const prev = useRef(pulse);

  useEffect(() => {
    if (pulse !== undefined && prev.current !== undefined && pulse > prev.current) {
      setCelebrate(true);
      const t = window.setTimeout(() => setCelebrate(false), 1300);
      prev.current = pulse;
      return () => window.clearTimeout(t);
    }
    prev.current = pulse;
  }, [pulse]);

  // SRS §6.4: opacity = 0.25 + 0.75 × presence; below 30 % the ghost flickers.
  const opacity = solid ? 1 : 0.25 + 0.75 * (Math.max(0, Math.min(100, presence)) / 100);
  const flicker = !solid && presence < 30;
  const phase = PHASE_STYLE[Math.max(0, Math.min(4, phaseIndex))];
  const floatSeconds = 3 + ((100 - presence) / 100) * 3;
  const animation = celebrate
    ? 'ghost-bounce 0.9s ease-in-out'
    : still
      ? undefined
      : `ghost-float ${floatSeconds.toFixed(1)}s ease-in-out infinite`;

  return (
    <svg
      viewBox="0 0 200 224"
      role="img"
      aria-label={`Duh, raspoloženje: ${mood}`}
      className={cn('overflow-visible select-none', className)}
      style={{
        opacity,
        ['--ghost-opacity' as string]: opacity,
        filter: phase.aura ? `drop-shadow(0 0 14px ${phase.aura}) drop-shadow(0 0 4px ${phase.aura})` : undefined,
        animation: flicker ? 'ghost-flicker 2.4s steps(1) infinite' : undefined,
        transition: 'opacity 600ms ease-out',
      }}
    >
      <defs>
        <radialGradient id={`body-${uid}`} cx="40%" cy="30%" r="80%">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="0.35" stopColor={palette.body} />
          <stop offset="1" stopColor={palette.shade} />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="212" rx="46" ry="6" fill="#000" opacity="0.25" />
      {phase.trail && !still && (
        <g fill={phase.trail} className="ghost-trail">
          <circle cx="40" cy="196" r="6" opacity="0.5" />
          <circle cx="22" cy="204" r="4" opacity="0.35" />
          <circle cx="8" cy="210" r="2.5" opacity="0.2" />
        </g>
      )}
      <g style={{ animation, transformOrigin: '100px 120px', transformBox: 'view-box' }}>
        <g style={{ filter: mood === 'bolestan' || mood === 'tuzan' ? 'saturate(0.55)' : undefined }}>
          <ellipse cx="26" cy="132" rx="15" ry="9" fill={palette.shade} transform="rotate(28 26 132)" />
          <ellipse cx="174" cy="132" rx="15" ry="9" fill={palette.shade} transform="rotate(-28 174 132)" />
          <path d={BODY} fill={`url(#body-${uid})`} />
        </g>
        <Eyes mood={mood} />
        {mood !== 'bolestan' && mood !== 'umoran' && (
          <g fill={palette.cheek} opacity="0.7">
            <ellipse cx="58" cy="116" rx="9" ry="6" />
            <ellipse cx="142" cy="116" rx="9" ry="6" />
          </g>
        )}
        <Mouth mood={mood} />
        {mood === 'bolestan' && (
          <path d="M150 62q-9 14 0 22q9 -8 0 -22z" fill="#6ec1ff" stroke="#3a8fd6" strokeWidth="2" />
        )}
        <AccessoryShape accessory={accessory} />
        {celebrate &&
          SPARKLES.map(([x, y, delay]) => (
            <path
              key={`${x}-${y}`}
              d="M0 -10L3 -3L10 0L3 3L0 10L-3 3L-10 0L-3 -3z"
              transform={`translate(${x} ${y})`}
              fill="#ffd54a"
              style={{
                animation: `sparkle 1.1s ease-out ${delay}s both`,
                transformOrigin: `${x}px ${y}px`,
                transformBox: 'view-box',
              }}
            />
          ))}
      </g>
    </svg>
  );
}
