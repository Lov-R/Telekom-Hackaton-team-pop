import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
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
  if (status === 'error') {
    return (
      <Badge className="gap-1.5 border-transparent bg-destructive/10 text-destructive">
        <AlertCircle className="size-3" /> Greška
      </Badge>
    );
  }
  return (
    <Badge className="gap-1.5 border-transparent bg-success/10 text-success">
      <CheckCircle2 className="size-3" /> Spremno
    </Badge>
  );
}
