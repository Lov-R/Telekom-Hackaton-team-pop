import { Link } from 'react-router';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatBytes, formatDate } from '@/lib/dates';
import { CATEGORY_ICON, CATEGORY_LABELS } from '@/lib/labels';
import type { DocumentItem } from '@/lib/types';
import { ProcessingBadge } from './ProcessingBadge';

export function DocumentCard({ doc }: { doc: DocumentItem }) {
  const Icon = CATEGORY_ICON[doc.category];
  return (
    <Link to={`/dokumenti/${doc.id}`} className="group block">
      <Card className="h-full gap-3 border-transparent p-4 transition-colors group-hover:bg-secondary">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 leading-snug font-semibold">{doc.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {CATEGORY_LABELS[doc.category]}
              {doc.subcategory ? ` / ${doc.subcategory}` : ''} · {formatDate(doc.createdAt.slice(0, 10))}
              {doc.sizeBytes ? ` · ${formatBytes(doc.sizeBytes)}` : ''}
            </p>
          </div>
        </div>
        {doc.status === 'processing' ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ) : (
          doc.summary && <p className="line-clamp-3 text-sm text-muted-foreground">{doc.summary}</p>
        )}
        {doc.status !== 'ready' && (
          <div>
            <ProcessingBadge status={doc.status} />
          </div>
        )}
      </Card>
    </Link>
  );
}
