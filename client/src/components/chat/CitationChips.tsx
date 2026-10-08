import { FileText } from 'lucide-react';
import { Link } from 'react-router';
import type { Citation } from '@/lib/types';

export function CitationChips({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {citations.map((c) => (
        <Link
          key={c.documentId}
          to={`/dokumenti/${c.documentId}`}
          className="inline-flex max-w-full items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs font-medium text-accent-foreground transition-colors hover:border-primary/40"
        >
          <FileText className="size-3 shrink-0" />
          <span className="truncate">{c.title}</span>
        </Link>
      ))}
    </div>
  );
}
