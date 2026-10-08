import { cn } from '@/lib/utils';

/** relAI-UX pill switch (Solo/Ekipni, Dnevni/Tjedni/Mjesečni...): the selected option glows light blue. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('flex gap-1 rounded-2xl border bg-card p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded-xl px-3 py-2 text-sm font-bold transition-colors',
            value === o.value ? 'bg-glow text-[#0b1420]' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
