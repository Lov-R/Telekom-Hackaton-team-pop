import { Wordmark } from '@/components/brand/Brand';

/**
 * relAI-UX intro: fingertips behind frosted glass, the relAI wordmark growing in the middle. Only a tap on the
 * wordmark continues. Always light, whatever the theme (it is the "glass" the user steps through).
 */
export default function Intro({ onContinue }: { onContinue: () => void }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#e9f1fa] px-6 pt-safe pb-safe text-[#243e59]">
      <img
        src="/ux/intro.webp"
        alt=""
        aria-hidden
        className="absolute inset-0 size-full object-cover [animation:intro-fingers_3.2s_ease-out_both]"
      />
      <div aria-hidden className="absolute inset-0 bg-white/30 backdrop-blur-[3px]" />

      <button
        type="button"
        onClick={onContinue}
        className="relative rounded-2xl px-4 py-2 transition-transform [animation:intro-logo_1.6s_ease-out_0.3s_both] hover:scale-[1.03] focus-visible:outline-[#2f6db3] active:scale-95"
        aria-label="Dodirni relAI i napravi prvi korak"
      >
        <Wordmark className="text-7xl sm:text-8xl" />
      </button>
      <p className="relative mt-5 max-w-64 text-center text-[15px] leading-relaxed [animation:fade-up_0.8s_ease-out_1.2s_both]">
        Na budućeg sebe se uvijek možeš osloniti.
      </p>

      <div className="absolute inset-x-0 bottom-[calc(2.5rem+max(env(safe-area-inset-bottom),var(--host-badge)))] text-center [animation:fade-up_0.8s_ease-out_1.8s_both]">
        <p className="text-[10px] font-extrabold tracking-[0.25em] uppercase">Dodirni relAI</p>
        <p className="mt-1.5 text-xs text-[#4d6a88]">i napravi prvi korak</p>
      </div>
    </main>
  );
}
