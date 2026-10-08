import { TaskItem } from '@/components/tasks/TaskItem';
import { formatDate, todayIso } from '@/lib/dates';
import type { CalendarItem } from '@/lib/types';

interface DayAgendaProps {
  date: string;
  items: CalendarItem[];
}

/** SRS §5.5: the list for the selected day. Items are added only by documents and the assistant. */
export function DayAgenda({ date, items }: DayAgendaProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg first-letter:uppercase">{date === todayIso() ? 'Danas' : formatDate(date, 'EEEE, d. MMMM')}</h2>
        <span className="text-xs text-muted-foreground">{items.length} zadataka</span>
      </div>
      {items.length === 0 ? (
        <p className="rounded-2xl border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          Ovaj dan je slobodan. Reci asistentu ako želiš nešto zapisati.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((t) => (
            <TaskItem key={`${t.id}-${t.occurrence}`} task={t} />
          ))}
        </div>
      )}
    </section>
  );
}
