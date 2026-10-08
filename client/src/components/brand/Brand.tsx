import { cn } from '@/lib/utils';
import { usePrefs, type Prefs } from '@/lib/prefs';

/** Solid wordmark for light backgrounds, as on the relAI-UX intro: navy "rel", blue "AI", Montserrat 800. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-extrabold tracking-[-0.04em] select-none', className)} aria-label="relAI">
      <span className="text-[#1f4a7d]">rel</span>
      <span className="text-[#3271be]">AI</span>
    </span>
  );
}

/** The relAI wordmark: the supplied blue/silver artwork on dark, the solid wordmark on the light theme. */
export function Logo({ className, onDark = false }: { className?: string; /** Always on a dark surface (the map). */ onDark?: boolean }) {
  const { theme } = usePrefs();
  if (theme === 'light' && !onDark) return <Wordmark className={cn('block text-[1.9rem] leading-none', className)} />;
  return <img src="/ux/relai-logo.svg" alt="relAI" className={cn('h-8 w-auto select-none', className)} draggable={false} />;
}

const FIGURE_SRC: Record<Prefs['figure'], string> = {
  female: '/ux/avatar-female.webp',
  male: '/ux/avatar-male.webp',
};

interface FigureProps {
  /** 0–1: HP presence. Always visible, even at 0 (relAI-UX: "uvijek vidljivi"). */
  presence: number;
  className?: string;
  /** Soft ring of light under the feet. */
  aura?: boolean;
}

/** The chosen future-self figure. Low presence makes it paler and more transparent, never invisible. */
export function Figure({ presence, className, aura = false }: FigureProps) {
  const { figure } = usePrefs();
  const p = Math.max(0, Math.min(1, presence));
  return (
    <div className={cn('relative', className)}>
      {aura && (
        <div
          aria-hidden
          className="absolute bottom-0 left-1/4 h-3 w-1/2 rounded-[50%] border border-glow/70 shadow-[0_0_14px_4px_rgb(117_159_210/0.4)] [animation:aura-pulse_2.8s_ease-in-out_infinite]"
        />
      )}
      <img
        src={FIGURE_SRC[figure]}
        alt=""
        draggable={false}
        className="relative size-full object-contain object-bottom drop-shadow-[0_0_10px_rgb(229_237_246/0.35)] transition-[opacity,filter] duration-500 select-none"
        style={{ opacity: 0.45 + p * 0.55, filter: `grayscale(${1 - p}) brightness(${0.85 + p * 0.15})` }}
      />
    </div>
  );
}

/** Round crop of the figure's face, for the assistant button and chat replies. */
export function FigureHead({ className }: { className?: string }) {
  const { figure } = usePrefs();
  return (
    <span
      className={cn(
        'relative block shrink-0 overflow-hidden rounded-full border border-warm/70 bg-gradient-to-b from-[#c1dcf7] to-[#8ebef4]',
        className,
      )}
    >
      <img
        src={FIGURE_SRC[figure]}
        alt=""
        draggable={false}
        className="absolute top-[4%] left-1/2 w-[230%] max-w-none -translate-x-1/2 select-none"
      />
    </span>
  );
}
