import { CalendarClock, MoreVertical, Pencil, Plus, Target, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { useDeleteGoal, usePatchGoal } from '@/hooks/queries';
import { formatDate } from '@/lib/dates';
import type { Goal } from '@/lib/types';
import { cn } from '@/lib/utils';

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onAddTask: (goal: Goal) => void;
}

export function GoalCard({ goal, onEdit, onAddTask }: GoalCardProps) {
  const patch = usePatchGoal();
  const del = useDeleteGoal();
  const { done, total } = goal.progress;
  const pct = total === 0 ? (goal.completed ? 100 : 0) : Math.round((done / total) * 100);

  return (
    <Card className={cn('gap-3 p-4', goal.completed && 'opacity-70')}>
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
          <Target className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn('leading-snug font-semibold', goal.completed && 'line-through')}>{goal.title}</p>
          {goal.description && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{goal.description}</p>}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Više opcija" className="-mr-1">
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(goal)}>
              <Pencil /> Uredi
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => del.mutate(goal.id, { onSuccess: () => toast.success('Cilj obrisan.') })}
            >
              <Trash2 /> Obriši
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="space-y-1.5">
        <Progress value={pct} className="h-1.5" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {total === 0 ? 'Još nema zadataka' : `${done} od ${total} zadataka`}
          </span>
          {goal.targetDate && (
            <span className="flex items-center gap-1">
              <CalendarClock className="size-3.5" /> {formatDate(goal.targetDate)}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => onAddTask(goal)} disabled={goal.completed}>
          <Plus /> Zadatak
        </Button>
        <Button
          variant={goal.completed ? 'outline' : 'default'}
          size="sm"
          disabled={patch.isPending}
          onClick={() =>
            patch.mutate(
              { id: goal.id, completed: !goal.completed },
              { onSuccess: () => !goal.completed && toast.success('Cilj postignut! Bravo!') },
            )
          }
        >
          {goal.completed ? 'Ponovno otvori' : 'Označi kao postignut'}
        </Button>
      </div>
    </Card>
  );
}
