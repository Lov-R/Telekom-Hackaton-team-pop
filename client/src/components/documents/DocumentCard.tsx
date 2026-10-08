import type { CSSProperties } from 'react';
import { ArrowUpRight, FileText, Image, Loader2 } from 'lucide-react';
import { Link } from 'react-router';
import { formatDate, todayIso } from '@/lib/dates';
import { CATEGORY_LABELS } from '@/lib/labels';
import type { DocumentItem } from '@/lib/types';
import { cn } from '@/lib/utils';

/** "Isteklo", "Istječe danas/sutra", "Još N d" within 30 days, otherwise the date (relAI-UX bubble tag). */
function expiryLabel(expiry: string | null): { text: string; urgent: boolean } | null {
  if (!expiry) return null;
  const days = Math.round((Date.parse(expiry) - Date.parse(todayIso())) / 86_400_000);
  if (days < 0) return { text: 'Isteklo', urgent: true };
  if (days === 0) return { text: 'Istječe danas', urgent: true };
  if (days === 1) return { text: 'Istječe sutra', urgent: true };
  if (days <= 30) return { text: `Još ${days} d`, urgent: true };
  return { text: `do ${formatDate(expiry)}`, urgent: false };
}

/** relAI-UX: every document is its own soap bubble, popping in one after another. */
export function DocumentCard({ doc, index = 0 }: { doc: DocumentItem; index?: number }) {
  const photo = doc.mimeType?.startsWith('image/');
  const Kind = photo ? Image : FileText;
  const expiry = expiryLabel(doc.expiryDate);
  return (
    <Link
      to={`/dokumenti/${doc.id}`}
      className={cn(
        'soap-bubble animate-bubble-in group relative mx-auto flex aspect-square w-full max-w-60 flex-col items-center justify-center gap-1.5 p-[14%] text-center transition-transform hover:scale-[1.03]',
        index % 2 === 1 && 'mt-10',
      )}
      style={{ animationDelay: `${Math.min(index, 12) * 70}ms` } as CSSProperties}
    >
      <span className="flex items-center gap-1 text-[10px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
        {doc.status === 'processing' ? <Loader2 className="size-3 animate-spin" /> : <Kind className="size-3.5" />}
        {photo ? 'Foto' : 'PDF'}
      </span>
      <p className="line-clamp-3 text-sm leading-snug font-extrabold break-words">{doc.title}</p>
      <p className="line-clamp-1 text-[11px] text-muted-foreground">{doc.subcategory ?? CATEGORY_LABELS[doc.category]}</p>
      {expiry ? (
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-bold',
            expiry.urgent ? 'bg-warm/20 text-warm' : 'bg-secondary text-muted-foreground',
          )}
        >
          {expiry.text}
        </span>
      ) : doc.status === 'pending' ? (
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">Nije pročitano</span>
      ) : (
        <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
      )}
    </Link>
  );
}
