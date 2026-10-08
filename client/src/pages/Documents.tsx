import { useEffect, useState } from 'react';
import { FileSearch, FileText, Lock, ScanLine, Search, Upload } from 'lucide-react';
import { Link } from 'react-router';
import { CategoryFilter } from '@/components/documents/CategoryFilter';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { PICKER_ID, UploadButtons } from '@/components/documents/UploadButtons';
import { EmptyState, ErrorState } from '@/components/common/States';
import { Segmented } from '@/components/common/Segmented';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocuments } from '@/hooks/queries';
import type { CategoryKey } from '@/lib/types';

type Kind = 'all' | 'photo' | 'pdf';

/** relAI-UX Dokumenti: "Sve tvoje. Na svom mjestu." with each document as a soap bubble. */
export default function Documents() {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<Kind>('all');
  const [category, setCategory] = useState<CategoryKey | ''>('');
  const [subcategory, setSubcategory] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setQ(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  const { data: all } = useDocuments({});
  const { data, isLoading, isError, error, refetch } = useDocuments({ category, subcategory, q });
  const isPhoto = (m: string | null): boolean => !!m?.startsWith('image/');
  const shown = (data ?? []).filter((d) => kind === 'all' || (kind === 'photo') === isPhoto(d.mimeType));
  const photos = (all ?? []).filter((d) => isPhoto(d.mimeType)).length;
  const filtering = !!q || !!category || !!subcategory || kind !== 'all';

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="hero-title">
            Sve tvoje.
            <span>Na svom mjestu.</span>
          </h1>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5" /> Samo za tebe · {all?.length ?? 0} datoteka
          </p>
        </div>
        <Button asChild variant="warm" size="icon-lg" className="size-12 rounded-2xl" aria-label="Dodaj datoteku">
          <label htmlFor={PICKER_ID}>
            <Upload className="size-6" />
          </label>
        </Button>
      </header>

      <Segmented<Kind>
        label="Vrsta"
        value={kind}
        options={[
          { value: 'all', label: `Sve ${all?.length ?? ''}` },
          { value: 'photo', label: `Fotografije ${photos || ''}` },
          { value: 'pdf', label: `PDF ${(all?.length ?? 0) - photos || ''}` },
        ]}
        onChange={setKind}
      />

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pretraži..."
          className="h-12 rounded-2xl bg-card pl-11"
          aria-label="Pretraži dokumente"
        />
      </div>
      <CategoryFilter
        value={category}
        onChange={(c) => {
          setCategory(c);
          setSubcategory('');
        }}
        subcategory={subcategory}
        onSubcategoryChange={setSubcategory}
      />

      <UploadButtons />

      <div className="flex items-baseline justify-between">
        <h2 className="text-lg">Tvoja zbirka</h2>
        <Link to="/skeniraj" className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground">
          <ScanLine className="size-3.5" /> Više stranica
        </Link>
      </div>

      {isLoading && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-full" />
          ))}
        </div>
      )}
      {isError && <ErrorState message={error.message} onRetry={() => void refetch()} />}
      {data && shown.length === 0 && (
        <EmptyState
          icon={filtering ? FileSearch : FileText}
          title={filtering ? 'Nema rezultata' : 'Još nemaš dokumenata'}
          description={
            filtering
              ? 'Pokušaj s drugim pojmom ili kategorijom.'
              : 'Slikaj dokument i sam ću ga složiti u mapu i pronaći rok koji iz njega proizlazi.'
          }
        />
      )}
      {shown.length > 0 && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 pb-10 lg:grid-cols-4">
          {shown.map((d, i) => (
            <DocumentCard key={d.id} doc={d} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
