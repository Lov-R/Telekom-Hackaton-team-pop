import { Check, Lightbulb, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAcceptRecommendation, useDismissRecommendation } from '@/hooks/queries';
import { formatDate } from '@/lib/dates';
import type { Recommendation } from '@/lib/types';

export function RecommendationCard({ rec }: { rec: Recommendation }) {
  const accept = useAcceptRecommendation();
  const dismiss = useDismissRecommendation();
  const busy = accept.isPending || dismiss.isPending;
  return (
    <div className="flex gap-3 rounded-lg border border-l-4 border-l-primary bg-card p-4">
      <Lightbulb className="mt-0.5 size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <p className="leading-snug font-semibold">{rec.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{rec.reason}</p>
          {rec.suggestedDate && (
            <p className="mt-2 font-mono text-xs text-foreground">
              Predloženo: {formatDate(rec.suggestedDate)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={busy}
            onClick={() =>
              accept.mutate(
                { id: rec.id },
                { onSuccess: () => toast.success('Dodano u kalendar, a zadatak je napravljen.') },
              )
            }
          >
            <Check /> Prihvati
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => dismiss.mutate(rec.id, { onSuccess: () => toast('Preporuka odbačena.') })}
          >
            <X /> Odbaci
          </Button>
        </div>
      </div>
    </div>
  );
}
