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
import { Textarea } from '@/components/ui/textarea';
import { useCreateGoal, usePatchGoal } from '@/hooks/queries';
import type { Goal } from '@/lib/types';

interface GoalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
}

export function GoalForm({ open, onOpenChange, goal }: GoalFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const create = useCreateGoal();
  const patch = usePatchGoal();

  useEffect(() => {
    if (!open) return;
    setTitle(goal?.title ?? '');
    setDescription(goal?.description ?? '');
    setTargetDate(goal?.targetDate ?? '');
  }, [open, goal]);

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    const body = { title: title.trim(), description: description.trim() || null, targetDate: targetDate || null };
    const done = (): void => {
      toast.success(goal ? 'Cilj spremljen.' : 'Cilj dodan.');
      onOpenChange(false);
    };
    if (goal) patch.mutate({ id: goal.id, ...body }, { onSuccess: done });
    else create.mutate(body, { onSuccess: done });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{goal ? 'Uredi cilj' : 'Novi cilj'}</DialogTitle>
          <DialogDescription>Cilj grupira zadatke i prati tvoj napredak.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="goal-title">Naslov</Label>
            <Input id="goal-title" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goal-desc">Opis (neobavezno)</Label>
            <Textarea id="goal-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goal-date">Ciljani datum</Label>
            <Input id="goal-date" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Odustani
            </Button>
            <Button type="submit" disabled={create.isPending || patch.isPending || !title.trim()}>
              {goal ? 'Spremi' : 'Dodaj cilj'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
