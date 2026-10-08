import { useState } from 'react';
import { CheckCircle2, ListChecks, Plus, Target } from 'lucide-react';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { RecommendationCard } from '@/components/calendar/RecommendationCard';
import { TaskCalendar } from '@/components/calendar/TaskCalendar';
import { Segmented } from '@/components/common/Segmented';
import { GoalCard } from '@/components/tasks/GoalCard';
import { GoalForm } from '@/components/tasks/GoalForm';
import { TaskItem } from '@/components/tasks/TaskItem';
import { Button } from '@/components/ui/button';
import { useGoals, useRecommendations, useTasks, type TaskFilter } from '@/hooks/queries';
import { openNewTask } from '@/lib/taskDialogs';
import type { Goal } from '@/lib/types';

const FILTERS: { key: TaskFilter; label: string }[] = [
  { key: 'open', label: 'Otvoreni' },
  { key: 'overdue', label: 'Kasne' },
  { key: 'done', label: 'Dovršeni' },
];

function TasksTab() {
  const [filter, setFilter] = useState<TaskFilter>('open');
  const { data, isLoading, isError, error, refetch } = useTasks(filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Segmented<TaskFilter>
          label="Filtar"
          value={filter}
          options={FILTERS.map((f) => ({ value: f.key, label: f.label }))}
          onChange={setFilter}
          className="w-full"
        />
      </div>

      {isLoading && <ListSkeleton rows={4} />}
      {isError && <ErrorState message={error.message} onRetry={() => void refetch()} />}
      {data && data.length === 0 && (
        <EmptyState
          icon={filter === 'done' ? ListChecks : CheckCircle2}
          title={
            filter === 'open' ? 'Nema otvorenih zadataka' : filter === 'overdue' ? 'Ništa ne kasni' : 'Još nema dovršenih zadataka'
          }
          description={
            filter === 'done'
              ? 'Riješi zadatak i budući ti zakoračit će dalje po mapi.'
              : 'Slikaj dokument ili reci asistentu što trebaš napraviti.'
          }
        />
      )}
      <div className="space-y-2.5">
        {data?.map((t) => (
          <TaskItem key={t.id} task={t} />
        ))}
      </div>
    </div>
  );
}

function GoalsTab() {
  const { data, isLoading, isError, error, refetch } = useGoals();
  const [goalForm, setGoalForm] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setGoalForm(true);
          }}
        >
          <Plus /> Cilj
        </Button>
      </div>
      {isLoading && <ListSkeleton rows={2} />}
      {isError && <ErrorState message={error.message} onRetry={() => void refetch()} />}
      {data && data.length === 0 && (
        <EmptyState
          icon={Target}
          title="Još nemaš ciljeva"
          description="Postavi cilj, na primjer 'Srediti papirologiju', i veži uz njega zadatke."
        />
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {data?.map((g) => (
          <GoalCard
            key={g.id}
            goal={g}
            onEdit={(goal) => {
              setEditing(goal);
              setGoalForm(true);
            }}
            onAddTask={(g) => openNewTask({ goalId: g.id })}
          />
        ))}
      </div>
      <GoalForm open={goalForm} onOpenChange={setGoalForm} goal={editing} />
    </div>
  );
}

function RecommendationsSection() {
  const { data: recs } = useRecommendations();
  if (!recs || recs.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg">Preporuke</h2>
      {recs.map((r) => (
        <RecommendationCard key={r.id} rec={r} />
      ))}
    </section>
  );
}

type Tab = 'calendar' | 'list' | 'goals';

/** relAI-UX Zadaci: calendar (day/week/month), the filtered list and goals, with one main action: a new task. */
export default function Tasks() {
  const [tab, setTab] = useState<Tab>('calendar');
  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <h1 className="hero-title">
          Napravi prostor
          <span>za bitno.</span>
        </h1>
        <Button variant="warm" size="icon-lg" className="size-12 rounded-2xl" aria-label="Novi zadatak" onClick={() => openNewTask()}>
          <Plus className="size-6" />
        </Button>
      </header>
      <Segmented<Tab>
        label="Prikaz"
        value={tab}
        options={[
          { value: 'calendar', label: 'Kalendar' },
          { value: 'list', label: 'Popis' },
          { value: 'goals', label: 'Ciljevi' },
        ]}
        onChange={setTab}
      />
      {tab === 'calendar' && (
        <>
          <TaskCalendar />
          <RecommendationsSection />
        </>
      )}
      {tab === 'list' && <TasksTab />}
      {tab === 'goals' && <GoalsTab />}
    </div>
  );
}
