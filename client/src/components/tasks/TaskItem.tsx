import { CalendarClock, Check, FileText, MoreVertical, Pencil, Repeat, Share2, ShieldCheck, Trash2, Users } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useDeleteTask } from '@/hooks/queries';
import { dueLabel, formatDate } from '@/lib/dates';
import { TIER_LABELS } from '@/lib/labels';
import { openCompleteTask, openShareTask, openTaskEditor } from '@/lib/taskDialogs';
import type { Task } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TaskItemProps {
  task: Task;
  compact?: boolean;
}

/** One task card: a single clear main action ("Riješeno"), details in small print (SRS §11). */
export function TaskItem({ task, compact = false }: TaskItemProps) {
  const del = useDeleteTask();
  const done = task.status === 'done';
  const missed = task.status === 'missed' || task.overdue;

  return (
    <div className={cn('flex items-start gap-3 rounded-lg bg-card p-3.5', done && 'opacity-60')}>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className={cn('leading-snug font-medium', done && 'line-through')}>{task.title}</p>
        {!compact && task.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{task.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          {task.date && !done && (
            <Badge
              className={cn(
                'border-transparent font-mono',
                missed ? 'bg-destructive/15 text-destructive' : 'bg-secondary text-secondary-foreground',
              )}
            >
              {task.kind === 'event'
                ? `${formatDate(task.date, 'd. MMM')}${task.time ? ` ${task.time}` : ''}`
                : dueLabel(task.date)}
            </Badge>
          )}
          <Badge className="border-transparent bg-secondary text-muted-foreground">
            R{task.tier} · {TIER_LABELS[task.tier]}
          </Badge>
          {task.recurrence !== 'none' && (
            <Badge className="gap-1 border-transparent bg-secondary text-muted-foreground">
              <Repeat className="size-3" />
            </Badge>
          )}
          {task.remindAt && !done && task.kind === 'deadline' && !compact && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarClock className="size-3" /> podsjetnik {formatDate(task.remindAt, 'd. MMM')}
            </span>
          )}
          {task.documentId && !compact && (
            <Link to={`/dokumenti/${task.documentId}`}>
              <Badge variant="outline" className="gap-1 text-muted-foreground hover:text-foreground">
                <FileText className="size-3" /> Iz dokumenta
              </Badge>
            </Link>
          )}
        </div>
        {task.sourceText && !compact && !done && (
          <p className="text-xs text-muted-foreground italic">„{task.sourceText}”</p>
        )}
        {task.shared && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <Users className="size-3.5 shrink-0" />
            {task.shared.map((m) => (
              <span key={m.userId} className={cn(m.status === 'done' && 'font-bold text-success')}>
                {m.displayName}
                {m.status === 'done' && <Check className="ml-0.5 inline size-3" />}
              </span>
            ))}
          </p>
        )}
        {done && task.proofReason && (
          <p className="flex items-start gap-1 text-xs text-success">
            <ShieldCheck className="mt-px size-3.5 shrink-0" /> {task.proofReason}
          </p>
        )}
      </div>
      {!done && (
        <Button size="sm" variant="secondary" className="shrink-0" onClick={() => openCompleteTask(task)}>
          <Check /> Riješeno
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Više opcija" className="-mr-1 shrink-0">
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!done && (
            <DropdownMenuItem onSelect={() => openTaskEditor(task)}>
              <Pencil /> Uredi
            </DropdownMenuItem>
          )}
          {!done && (
            <DropdownMenuItem onSelect={() => openShareTask(task)}>
              <Share2 /> Podijeli s prijateljima
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => del.mutate(task.id, { onSuccess: () => toast.success('Zadatak obrisan.') })}
          >
            <Trash2 /> Obriši
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
