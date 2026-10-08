import { useState } from 'react';
import { CheckCircle2, ListChecks, Plus, Target } from 'lucide-react';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/common/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { GoalCard } from '@/components/tasks/GoalCard';
import { GoalForm } from '@/components/tasks/GoalForm';
import { TaskItem } from '@/components/tasks/TaskItem';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGoals, useTasks, type TaskFilter } from '@/hooks/queries';
import { openNewTask } from '@/lib/taskDialogs';
import type { Goal } from '@/lib/types';
import { cn } from '@/lib/utils';

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
        <div className="flex gap-1 rounded-md bg-muted p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-sm px-3 py-1 text-sm font-medium transition-colors',
                filter === f.key ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => openNewTask()}>
          <Plus /> Zadatak
        </Button>
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
              ? 'Riješi zadatak i duh će se pomaknuti po mapi.'
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

export default function Tasks() {
  return (
    <>
      <PageHeader title="Zadaci i ciljevi" backTo="/" />
      <Tabs defaultValue="tasks" className="gap-4">
        <TabsList className="grid h-11 w-full grid-cols-2 rounded-lg">
          <TabsTrigger value="tasks" className="rounded-lg font-semibold">
            Zadaci
          </TabsTrigger>
          <TabsTrigger value="goals" className="rounded-lg font-semibold">
            Ciljevi
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tasks">
          <TasksTab />
        </TabsContent>
        <TabsContent value="goals">
          <GoalsTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
