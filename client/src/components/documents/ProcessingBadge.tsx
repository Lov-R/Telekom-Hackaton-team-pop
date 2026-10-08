import { CheckCircle2, CircleDashed, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { DocStatus } from '@/lib/types';

export function ProcessingBadge({ status }: { status: DocStatus }) {
  if (status === 'processing') {
    return (
      <Badge className="gap-1.5 border-transparent bg-warning/15 text-foreground">
        <Loader2 className="size-3 animate-spin" /> Obrada u tijeku
      </Badge>
    );
  }
  if (status === 'pending') {
    return (
      <Badge variant="secondary" className="gap-1.5 text-muted-foreground">
        <CircleDashed className="size-3" /> Nije pročitano
      </Badge>
    );
  }
  return (
    <Badge className="gap-1.5 border-transparent bg-success/10 text-success">
      <CheckCircle2 className="size-3" /> Spremno
    </Badge>
  );
}
