import { useEffect, useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { Link } from 'react-router';
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
import { useFriends, useShareTask } from '@/hooks/queries';
import { FriendAvatar } from '@/components/social/FriendAvatar';
import type { Task } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
  task: Task | null;
  onClose: () => void;
}

/** Joint task: every chosen friend gets their own copy and everyone hears when someone finishes. */
export function ShareTaskDialog({ task, onClose }: Props) {
  const { data } = useFriends();
  const share = useShareTask();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  useEffect(() => setPicked(new Set()), [task?.id]);

  const members = new Set(task?.shared?.map((m) => m.userId) ?? []);
  const friends = data?.friends ?? [];
  const toggle = (id: string): void =>
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = (): void => {
    if (!task || picked.size === 0) return;
    share.mutate(
      { id: task.id, friendIds: [...picked] },
      {
        onSuccess: () => {
          toast.success(picked.size === 1 ? 'Zadatak podijeljen.' : `Zadatak podijeljen s ${picked.size} prijatelja.`);
          onClose();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Podijeli zadatak</DialogTitle>
          <DialogDescription>
            {task ? `„${task.title}”. ` : ''}Svatko dobiva svoju kopiju i svoj HP. Javit ću vam kad netko završi.
          </DialogDescription>
        </DialogHeader>
        {friends.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Još nemaš prijatelja.{' '}
            <Link to="/prijatelji" onClick={onClose} className="font-bold text-primary">
              Pozovi nekoga
            </Link>
            .
          </p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {friends.map((f) => {
              const already = members.has(f.id);
              const on = already || picked.has(f.id);
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    disabled={already}
                    onClick={() => toggle(f.id)}
                    aria-pressed={on}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors',
                      on ? 'border-primary bg-primary/10' : 'hover:border-primary/50',
                      already && 'opacity-60',
                    )}
                  >
                    <FriendAvatar friend={f} className="size-9" />
                    <span className="min-w-0 flex-1 truncate font-medium">{f.displayName}</span>
                    {already ? (
                      <span className="text-xs text-muted-foreground">već sudjeluje</span>
                    ) : (
                      on && <Check className="size-4 text-primary" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Odustani
          </Button>
          <Button disabled={picked.size === 0 || share.isPending} onClick={submit}>
            <Share2 /> Podijeli
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
