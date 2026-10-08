import { useEffect, useState } from 'react';
import { FileSearch, FileText, ScanLine, Search } from 'lucide-react';
import { Link } from 'react-router';
import { CategoryFilter } from '@/components/documents/CategoryFilter';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { UploadButtons } from '@/components/documents/UploadButtons';
import { EmptyState, ErrorState } from '@/components/common/States';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDocuments } from '@/hooks/queries';
import type { CategoryKey } from '@/lib/types';

export default function Documents() {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<CategoryKey | ''>('');
  const [subcategory, setSubcategory] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setQ(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, error, refetch } = useDocuments({ category, subcategory, q });
  const filtering = !!q || !!category || !!subcategory;

  return (
    <>
      <PageHeader
        title="Dokumenti"
        actions={
          <Button asChild size="sm" variant="ghost" className="text-muted-foreground">
            <Link to="/skeniraj">
              <ScanLine /> Više stranica
            </Link>
          </Button>
        }
      />
      <div className="space-y-4">
        <UploadButtons />
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pretraži dokumente..."
            className="pl-10"
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

        {isLoading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-36 rounded-lg" />
            ))}
          </div>
        )}
        {isError && <ErrorState message={error.message} onRetry={() => void refetch()} />}
        {data && data.length === 0 && (
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
        {data && data.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((d) => (
              <DocumentCard key={d.id} doc={d} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
