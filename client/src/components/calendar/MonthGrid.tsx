import { addMonths } from 'date-fns/addMonths';
import { eachDayOfInterval } from 'date-fns/eachDayOfInterval';
import { endOfMonth } from 'date-fns/endOfMonth';
import { endOfWeek } from 'date-fns/endOfWeek';
import { format } from 'date-fns/format';
import { isSameMonth } from 'date-fns/isSameMonth';
import { startOfMonth } from 'date-fns/startOfMonth';
import { startOfWeek } from 'date-fns/startOfWeek';
import { hr } from 'date-fns/locale/hr';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { todayIso, toIso } from '@/lib/dates';
import type { CalendarItem, TaskKind } from '@/lib/types';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];

export function gridRange(month: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  };
}

interface MonthGridProps {
  month: Date;
  selected: string;
  items: CalendarItem[];
  onSelect: (iso: string) => void;
  onMonthChange: (month: Date) => void;
}

export const KIND_DOT: Record<TaskKind, string> = { deadline: 'bg-primary', event: 'bg-muted-foreground' };

export function MonthGrid({ month, selected, items, onSelect, onMonthChange }: MonthGridProps) {
  const { start, end } = gridRange(month);
  const days = eachDayOfInterval({ start, end });
  const today = todayIso();

  const kindsByDay = new Map<string, TaskKind[]>();
  for (const e of items) {
    if (e.status === 'done') continue;
    const list = kindsByDay.get(e.occurrence) ?? [];
    if (!list.includes(e.kind)) list.push(e.kind);
    kindsByDay.set(e.occurrence, list);
  }

  return (
    <div className="rounded-2xl bg-card p-3 md:p-4">
      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" aria-label="Prethodni mjesec" onClick={() => onMonthChange(addMonths(month, -1))}>
          <ChevronLeft />
        </Button>
        <button
          type="button"
          className="text-lg font-semibold first-letter:uppercase"
          onClick={() => {
            onMonthChange(new Date());
            onSelect(today);
          }}
          aria-label="Idi na današnji dan"
        >
          {format(month, 'LLLL yyyy.', { locale: hr })}
        </button>
        <Button variant="ghost" size="icon" aria-label="Sljedeći mjesec" onClick={() => onMonthChange(addMonths(month, 1))}>
          <ChevronRight />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-1 text-xs font-semibold text-muted-foreground">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const iso = toIso(d);
          const kinds = kindsByDay.get(iso) ?? [];
          const isSel = iso === selected;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              aria-label={format(d, 'd. MMMM yyyy.', { locale: hr })}
              aria-pressed={isSel}
              className={cn(
                'mx-auto flex h-12 w-full max-w-14 flex-col items-center justify-center gap-1 rounded-xl text-sm font-semibold transition-colors',
                !isSameMonth(d, month) && 'text-muted-foreground/40',
                iso === today && !isSel && 'text-primary ring-1 ring-primary/50',
                isSel ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary',
              )}
            >
              <span>{d.getDate()}</span>
              <span className="flex h-1.5 gap-0.5">
                {kinds.slice(0, 3).map((k) => (
                  <span key={k} className={cn('size-1.5 rounded-full', isSel ? 'bg-white' : KIND_DOT[k])} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
