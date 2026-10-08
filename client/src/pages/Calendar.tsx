import { useState } from 'react';
import { DayAgenda } from '@/components/calendar/DayAgenda';
import { KIND_DOT, MonthGrid, gridRange } from '@/components/calendar/MonthGrid';
import { RecommendationCard } from '@/components/calendar/RecommendationCard';
import { ErrorState } from '@/components/common/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { useCalendar, useRecommendations } from '@/hooks/queries';
import { todayIso, toIso } from '@/lib/dates';
import { KIND_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';

export default function Calendar() {
  const [month, setMonth] = useState<Date>(() => new Date());
  const [selected, setSelected] = useState<string>(todayIso());

  const { start, end } = gridRange(month);
  const { data: items, isError, error, refetch } = useCalendar(toIso(start), toIso(end));
  const { data: recs } = useRecommendations();

  const dayItems = (items ?? []).filter((e) => e.occurrence === selected);

  return (
    <>
      <PageHeader title="Kalendar" />
      {isError && <ErrorState message={error.message} onRetry={() => void refetch()} />}
      <div className="space-y-5 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-6 lg:space-y-0">
        <div className="space-y-3">
          {items ? (
            <MonthGrid month={month} selected={selected} items={items} onSelect={setSelected} onMonthChange={setMonth} />
          ) : (
            <Skeleton className="h-96 rounded-2xl" />
          )}
          <div className="flex gap-4 px-1 text-xs text-muted-foreground">
            {(['deadline', 'event'] as const).map((k) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className={cn('size-2 rounded-full', KIND_DOT[k])} /> {KIND_LABELS[k]}
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <DayAgenda date={selected} items={dayItems} />
          {recs && recs.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Preporuke</h2>
              {recs.map((r) => (
                <RecommendationCard key={r.id} rec={r} />
              ))}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
