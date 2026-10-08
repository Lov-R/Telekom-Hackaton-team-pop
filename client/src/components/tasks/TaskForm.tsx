import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateTask, useGoals, usePatchTask } from '@/hooks/queries';
import { KIND_LABELS, RECURRENCE_LABELS, TIERS, TIER_HP, TIER_LABELS } from '@/lib/labels';
import type { Recurrence, Task, TaskKind, Tier } from '@/lib/types';

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultGoalId?: string | null;
}

/** Uredi (SRS §5.3): title, date and tier; plus kind, time and repetition. */
export function TaskForm({ open, onOpenChange, task, defaultGoalId }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<TaskKind>('deadline');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [tier, setTier] = useState<Tier>(2);
  const [recurrence, setRecurrence] = useState<Recurrence>('none');
  const [goalId, setGoalId] = useState('none');
  const create = useCreateTask();
  const patch = usePatchTask();
  const { data: goals } = useGoals();

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setKind(task?.kind ?? 'deadline');
    setDate(task?.date ?? '');
    setTime(task?.time ?? '');
    setTier(task?.tier ?? 2);
    setRecurrence(task?.recurrence ?? 'none');
    setGoalId(task?.goalId ?? defaultGoalId ?? 'none');
  }, [open, task, defaultGoalId]);

  const pending = create.isPending || patch.isPending;

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    const body = {
      kind,
      title: title.trim(),
      description: description.trim() || null,
      tier,
      date: kind === 'event' ? date || null : null,
      time: kind === 'event' ? time || null : null,
      dueDate: kind === 'deadline' ? date || null : null,
      recurrence,
      goalId: goalId === 'none' ? null : goalId,
    };
    const done = (): void => {
      toast.success(task ? 'Zadatak spremljen.' : 'Zadatak dodan.');
      onOpenChange(false);
    };
    if (task) patch.mutate({ id: task.id, ...body }, { onSuccess: done });
    else create.mutate(body, { onSuccess: done });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? 'Uredi zadatak' : 'Novi zadatak'}</DialogTitle>
          <DialogDescription>Razina određuje koliko HP-a donosi i koliko boli propušten rok.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Naslov</Label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {(['deadline', 'event'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={kind === k}
                className={
                  kind === k
                    ? 'rounded-md bg-secondary py-1.5 text-sm font-medium'
                    : 'rounded-md py-1.5 text-sm text-muted-foreground'
                }
              >
                {KIND_LABELS[k]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-date">{kind === 'event' ? 'Datum' : 'Rok'}</Label>
              <Input
                id="task-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required={kind === 'event'}
              />
            </div>
            {kind === 'event' ? (
              <div className="space-y-1.5">
                <Label htmlFor="task-time">Vrijeme</Label>
                <Input id="task-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Ponavljanje</Label>
                <Select value={recurrence} onValueChange={(v) => setRecurrence(v as Recurrence)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(RECURRENCE_LABELS) as Recurrence[]).map((r) => (
                      <SelectItem key={r} value={r}>
                        {RECURRENCE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Razina</Label>
            <Select value={String(tier)} onValueChange={(v) => setTier(Number(v) as Tier)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIERS.map((t) => (
                  <SelectItem key={t} value={String(t)}>
                    {t} · {TIER_LABELS[t]} ({TIER_HP[t]} HP)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Opis (neobavezno)</Label>
            <Textarea id="task-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          {(goals?.length ?? 0) > 0 && (
            <div className="space-y-1.5">
              <Label>Cilj</Label>
              <Select value={goalId} onValueChange={setGoalId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Bez cilja</SelectItem>
                  {(goals ?? []).map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Odustani
            </Button>
            <Button type="submit" disabled={pending || !title.trim() || (kind === 'event' && !date)}>
              {task ? 'Spremi' : 'Dodaj zadatak'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
