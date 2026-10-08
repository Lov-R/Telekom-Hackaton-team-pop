import { useState } from 'react';
import { addDays } from 'date-fns/addDays';
import { addMonths } from 'date-fns/addMonths';
import { addWeeks } from 'date-fns/addWeeks';
import { eachDayOfInterval } from 'date-fns/eachDayOfInterval';
import { endOfMonth } from 'date-fns/endOfMonth';
import { endOfWeek } from 'date-fns/endOfWeek';
import { format } from 'date-fns/format';
import { isSameMonth } from 'date-fns/isSameMonth';
import { startOfMonth } from 'date-fns/startOfMonth';
import { startOfWeek } from 'date-fns/startOfWeek';
import { hr } from 'date-fns/locale/hr';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayAgenda } from '@/components/calendar/DayAgenda';
import { ErrorState } from '@/components/common/States';
import { Segmented } from '@/components/common/Segmented';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCalendar } from '@/hooks/queries';
import { todayIso, toIso } from '@/lib/dates';
import { setPref, usePrefs, type Prefs } from '@/lib/prefs';
import type { CalendarItem } from '@/lib/types';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['pon', 'uto', 'sri', 'čet', 'pet', 'sub', 'ned'];
const VIEW_LABEL: Record<Prefs['taskView'], string> = { day: 'Dnevni', week: 'Tjedni', month: 'Mjesečni' };
const fromIso = (iso: string): Date => new Date(`${iso}T12:00:00`);

function range(view: Prefs['taskView'], anchor: Date): { start: Date; end: Date } {
  if (view === 'day') return { start: anchor, end: anchor };
  if (view === 'week') return { start: startOfWeek(anchor, { weekStartsOn: 1 }), end: endOfWeek(anchor, { weekStartsOn: 1 }) };
  return {
    start: startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }),
  };
}

function title(view: Prefs['taskView'], anchor: Date): string {
  if (view === 'day') return format(anchor, 'EEEE, d. MMMM', { locale: hr });
  if (view === 'month') return format(anchor, 'LLLL yyyy.', { locale: hr });
  const { start, end } = range('week', anchor);
  return `${format(start, 'd.M.')} – ${format(end, 'd.M.yyyy.')}`;
}

function DayCell({
  date,
  count,
  selected,
  dim,
  onSelect,
  tall,
}: {
  date: Date;
  count: number;
  selected: boolean;
  dim?: boolean;
  onSelect: () => void;
  tall?: boolean;
}) {
  const iso = toIso(date);
  const today = iso === todayIso();
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${format(date, 'd. MMMM yyyy.', { locale: hr })}, ${count} zadataka`}
      className={cn(
        'mx-auto flex w-full max-w-14 flex-col items-center justify-center gap-0.5 rounded-xl border text-sm font-extrabold transition-colors',
        tall ? 'h-16' : 'h-12',
        selected ? 'border-primary/60 bg-primary/20' : 'border-transparent hover:bg-secondary',
        dim && 'text-muted-foreground/40',
      )}
    >
      <span>{date.getDate()}</span>
      <span className={cn('h-3 text-[10px] leading-3 font-bold', today ? 'text-warm' : 'text-primary')}>{count || ''}</span>
    </button>
  );
}

/** relAI-UX Zadaci calendar: daily, weekly or monthly view (Postavke), Monday first, counts per day. */
export function TaskCalendar() {
  const { taskView: view } = usePrefs();
  const [anchor, setAnchor] = useState<Date>(() => fromIso(todayIso()));
  const [selected, setSelected] = useState<string>(todayIso());
  const { start, end } = range(view, anchor);
  const { data: items, isError, error, refetch } = useCalendar(toIso(start), toIso(end));

  const open = (items ?? []).filter((e) => e.status !== 'done');
  const counts = new Map<string, number>();
  for (const e of open) counts.set(e.occurrence, (counts.get(e.occurrence) ?? 0) + 1);
  const day = view === 'day' ? toIso(anchor) : selected;
  const dayItems: CalendarItem[] = (items ?? []).filter((e) => e.occurrence === day);

  const shift = (dir: 1 | -1): void => {
    const next = view === 'day' ? addDays(anchor, dir) : view === 'week' ? addWeeks(anchor, dir) : addMonths(anchor, dir);
    setAnchor(next);
    if (view !== 'month') setSelected(toIso(view === 'week' ? startOfWeek(next, { weekStartsOn: 1 }) : next));
  };
  const goToday = (): void => {
    setAnchor(fromIso(todayIso()));
    setSelected(todayIso());
  };

  return (
    <div className="space-y-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-6 lg:space-y-0">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{VIEW_LABEL[view]} pregled</p>
          <Segmented<Prefs['taskView']>
            label="Pregled"
            value={view}
            options={[
              { value: 'day', label: 'D' },
              { value: 'week', label: 'T' },
              { value: 'month', label: 'M' },
            ]}
            onChange={(v) => setPref('taskView', v)}
            className="w-36"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" size="icon" aria-label="Prethodno" onClick={() => shift(-1)}>
            <ChevronLeft />
          </Button>
          <div className="text-center">
            <p className="text-base font-extrabold first-letter:uppercase">{title(view, anchor)}</p>
            <button type="button" onClick={goToday} className="text-xs font-bold text-warm">
              Danas
            </button>
          </div>
          <Button variant="secondary" size="icon" aria-label="Sljedeće" onClick={() => shift(1)}>
            <ChevronRight />
          </Button>
        </div>

        {isError && <ErrorState message={error.message} onRetry={() => void refetch()} />}
        {!items ? (
          <Skeleton className={cn('rounded-2xl', view === 'month' ? 'h-80' : 'h-24')} />
        ) : view === 'day' ? null : (
          <div className="rounded-2xl border bg-card p-3">
            <div className="grid grid-cols-7 gap-y-1 text-center">
              {WEEKDAYS.map((d) => (
                <div key={d} className="pb-1 text-[11px] font-semibold text-muted-foreground">
                  {d}
                </div>
              ))}
              {eachDayOfInterval({ start, end }).map((d) => {
                const iso = toIso(d);
                return (
                  <DayCell
                    key={iso}
                    date={d}
                    count={counts.get(iso) ?? 0}
                    selected={iso === selected}
                    dim={view === 'month' && !isSameMonth(d, anchor)}
                    tall={view === 'week'}
                    onSelect={() => setSelected(iso)}
                  />
                );
              })}
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Broj otvorenih zadataka · <span className="text-warm">narančasto</span> = danas
            </p>
          </div>
        )}
      </div>
      <DayAgenda date={day} items={dayItems} />
    </div>
  );
}
