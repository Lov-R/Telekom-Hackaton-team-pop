import { useEffect, useMemo, useState } from 'react';

const COUNT = 52;
const DURATION_MS = 2800;

/**
 * relAI-UX "Prijelaz nakon ulaznog obrasca": after logging in, soap bubbles pop up across the screen in a wave,
 * rise and burst within 2.8 s. The map stays visible and tappable underneath; skipped with reduced motion.
 */
export function WelcomeBubbles({ onDone }: { onDone: () => void }) {
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const [bubbles] = useState(() =>
    Array.from({ length: COUNT }, (_, i) => ({
      left: Math.random() * 100,
      top: 20 + Math.random() * 75,
      size: 14 + Math.random() * 58,
      delay: (i / COUNT) * 900 + Math.random() * 300,
      duration: 1300 + Math.random() * 600,
    })),
  );

  useEffect(() => {
    const t = setTimeout(onDone, reduced ? 0 : DURATION_MS);
    return () => clearTimeout(t);
  }, [onDone, reduced]);

  if (reduced) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {bubbles.map((b, i) => (
        <span
          key={i}
          className="soap-bubble absolute"
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            width: b.size,
            height: b.size,
            animation: `bubble-rise ${b.duration}ms ease-out ${b.delay}ms both`,
          }}
        />
      ))}
    </div>
  );
}
