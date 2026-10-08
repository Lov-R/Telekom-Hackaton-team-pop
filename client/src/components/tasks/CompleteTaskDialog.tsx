import { useEffect, useRef, useState } from 'react';
import { Loader2, Paperclip, ShieldAlert, ShieldCheck } from 'lucide-react';
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
import { useCompleteTask } from '@/hooks/queries';
import { downscaleImage } from '@/lib/image';
import { TIER_HP } from '@/lib/labels';
import type { CompleteResponse, Task } from '@/lib/types';

interface Props {
  task: Task | null;
  onClose: () => void;
}

function announce(res: CompleteResponse): void {
  const r = res.result;
  if (!r) return;
  if (r.breakdown.capped) {
    toast('Riješeno, ali bez HP-a', { description: 'Danas si već riješio 3 zadatka bez dokaza.' });
  } else {
    toast.success(`+${r.amount} HP`, {
      description: [
        res.reason,
        r.bossDefeated && 'Boss pobijeđen! +10 HP.',
        r.mapsUnlocked > 0 && `Nova mapa: ${res.game.mapName}!`,
      ]
        .filter(Boolean)
        .join(' '),
    });
  }
}

/** SRS §6.6 / Tok C: "Riješeno" → attach proof (AI checks it) or finish without proof for ×0.3 HP. */
export function CompleteTaskDialog({ task, onClose }: Props) {
  const complete = useCompleteTask();
  const input = useRef<HTMLInputElement>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);

  useEffect(() => {
    if (task) setRejection(null);
  }, [task]);

  const send = (proof: File | null): void => {
    if (!task) return;
    complete.mutate(
      { id: task.id, proof },
      {
        onSuccess: (res) => {
          if (res.accepted) {
            announce(res);
            onClose();
          } else {
            setRejection(res.reason ?? 'Dokaz nije prihvaćen.');
          }
        },
      },
    );
  };

  const onFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    setRejection(null);
    setPreparing(true);
    try {
      send(file.type.startsWith('image/') ? await downscaleImage(file) : file);
    } finally {
      setPreparing(false);
    }
  };

  const busy = complete.isPending || preparing;
  const base = task ? TIER_HP[task.tier] : 0;

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Riješeno: {task?.title}</DialogTitle>
          <DialogDescription>
            Priloži dokaz (screenshot uplate, potvrdu, nalaz) za puni HP. Bez dokaza dobivaš trećinu.
          </DialogDescription>
        </DialogHeader>

        {busy && (
          <div className="flex items-center gap-3 rounded-lg bg-muted p-4 text-sm">
            <Loader2 className="size-5 animate-spin text-primary" /> Provjeravam dokaz...
          </div>
        )}
        {rejection && !busy && (
          <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-4 text-sm">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
            <p>{rejection}</p>
          </div>
        )}

        <input
          ref={input}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button size="lg" className="w-full" disabled={busy} onClick={() => input.current?.click()}>
            {rejection ? <Paperclip /> : <ShieldCheck />} {rejection ? 'Pokušaj s drugim dokazom' : 'Priloži dokaz'}
            <span className="ml-auto font-mono text-xs opacity-80">~{base} HP</span>
          </Button>
          <Button size="lg" variant="secondary" className="w-full" disabled={busy} onClick={() => send(null)}>
            Riješi bez dokaza
            <span className="ml-auto font-mono text-xs text-muted-foreground">~{Math.max(1, Math.round(base * 0.3))} HP</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
