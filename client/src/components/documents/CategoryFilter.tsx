import { useCategories } from '@/hooks/queries';
import { CATEGORY_ICON, CATEGORY_LABELS } from '@/lib/labels';
import type { CategoryKey } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CategoryFilterProps {
  value: CategoryKey | '';
  onChange: (value: CategoryKey | '') => void;
  subcategory: string;
  onSubcategoryChange: (value: string) => void;
}

export function CategoryFilter({ value, onChange, subcategory, onSubcategoryChange }: CategoryFilterProps) {
  const { data } = useCategories();
  const total = data?.reduce((n, c) => n + c.count, 0) ?? 0;
  const chip = (active: boolean): string =>
    cn(
      'flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors',
      active
        ? 'border-foreground bg-foreground text-background'
        : 'bg-card text-muted-foreground hover:text-foreground',
    );
  const subs = data?.find((c) => c.key === value)?.subcategories ?? [];
  const rowClass =
    '-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0';
  return (
    <div className="space-y-2">
    <div className={rowClass}>
      <button type="button" className={chip(value === '')} onClick={() => onChange('')}>
        Sve <span className="font-mono text-xs tabular-nums opacity-60">{total}</span>
      </button>
      {(data ?? [])
        .filter((c) => c.count > 0 || c.key === value)
        .map((c) => {
          const Icon = CATEGORY_ICON[c.key];
          return (
            <button key={c.key} type="button" className={chip(value === c.key)} onClick={() => onChange(c.key)}>
              <Icon className="size-3.5" />
              {CATEGORY_LABELS[c.key]}
              <span className="font-mono text-xs tabular-nums opacity-60">{c.count}</span>
            </button>
          );
        })}
    </div>
    {subs.length > 0 && (
      <div className={rowClass} aria-label="Podkategorije">
        <button type="button" className={chip(subcategory === '')} onClick={() => onSubcategoryChange('')}>
          Sve podkategorije
        </button>
        {subs.map((s) => (
          <button
            key={s.name}
            type="button"
            className={chip(subcategory === s.name)}
            onClick={() => onSubcategoryChange(s.name)}
          >
            {s.name}
            <span className="font-mono text-xs tabular-nums opacity-60">{s.count}</span>
          </button>
        ))}
      </div>
    )}
    </div>
  );
}
