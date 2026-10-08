import { useEffect, useRef, useState } from 'react';
import {
  CalendarDays,
  ClipboardList,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { ErrorState } from '@/components/common/States';
import { ProcessingBadge } from '@/components/documents/ProcessingBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { TaskItem } from '@/components/tasks/TaskItem';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useCategories,
  useDeleteDocument,
  useDocument,
  usePatchDocument,
  useProcessDocument,
} from '@/hooks/queries';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { fileUrl } from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/dates';
import { CATEGORY_LABELS, KEY_DATE_LABELS } from '@/lib/labels';
import type { CategoryKey } from '@/lib/types';

export default function DocumentDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: doc, isLoading, isError, error, refetch } = useDocument(id);
  const patch = usePatchDocument(id);
  const processDoc = useProcessDocument(id);
  const del = useDeleteDocument();
  const desktop = useMediaQuery('(min-width: 1024px)');
  const [title, setTitle] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const { data: categories } = useCategories();

  const docTitle = doc?.title;
  useEffect(() => {
    if (docTitle !== undefined) setTitle(docTitle);
  }, [docTitle]);

  // Documents are read by the AI when first opened; a failed attempt is retried only by the button.
  const attempted = useRef<string | null>(null);
  const docStatus = doc?.status;
  useEffect(() => {
    if (docStatus !== 'pending' || attempted.current === id) return;
    attempted.current = id;
    processDoc.mutate(false);
  }, [docStatus, id, processDoc]);

  const docSub = doc?.subcategory;
  useEffect(() => {
    if (docSub !== undefined) setSubcategory(docSub ?? '');
  }, [docSub]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }
  if (isError || !doc) {
    return (
      <>
        <PageHeader title="Dokument" backTo="/dokumenti" />
        <ErrorState message={error?.message ?? 'Dokument nije pronađen.'} onRetry={() => void refetch()} />
      </>
    );
  }

  const isPdf = doc.mimeType === 'application/pdf';
  const url = fileUrl(doc.id);

  const saveTitle = (): void => {
    const t = title.trim();
    if (!t) setTitle(doc.title);
    else if (t !== doc.title) patch.mutate({ title: t });
  };

  const saveSubcategory = (): void => {
    const v = subcategory.trim();
    if (v !== (doc.subcategory ?? '')) patch.mutate({ subcategory: v || null });
  };
  const suggestions = categories?.find((c) => c.key === doc.category)?.subcategories ?? [];

  return (
    <>
      <PageHeader
        title={doc.title}
        backTo="/dokumenti"
        actions={
          <Button asChild variant="outline" size="sm">
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink /> {isPdf ? 'Otvori PDF' : 'Otvori datoteku'}
            </a>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,26rem)]">
        <div className="space-y-4">
          <Card className="gap-4 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <ProcessingBadge status={processDoc.isPending ? 'processing' : doc.status} />
              {doc.docType && <Badge variant="secondary">{doc.docType}</Badge>}
              <span className="text-xs text-muted-foreground">
                {formatDate(doc.createdAt.slice(0, 10))}
                {doc.sizeBytes ? ` · ${formatBytes(doc.sizeBytes)}` : ''}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="doc-title" className="text-xs font-semibold text-muted-foreground">
                  Naslov
                </label>
                <Input
                  id="doc-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">Kategorija</span>
                <Select value={doc.category} onValueChange={(v) => patch.mutate({ category: v as CategoryKey })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CATEGORY_LABELS) as CategoryKey[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {CATEGORY_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label htmlFor="doc-subcategory" className="text-xs font-semibold text-muted-foreground">
                  Podkategorija
                </label>
                <Input
                  id="doc-subcategory"
                  list="doc-subcategory-options"
                  value={subcategory}
                  placeholder="npr. Struja"
                  maxLength={80}
                  onChange={(e) => setSubcategory(e.target.value)}
                  onBlur={saveSubcategory}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                />
                <datalist id="doc-subcategory-options">
                  {suggestions.map((s) => (
                    <option key={s.name} value={s.name} />
                  ))}
                </datalist>
              </div>
            </div>
          </Card>

          {(doc.status === 'processing' || processDoc.isPending) && (
            <Card className="items-center gap-3 p-6 text-center">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="font-semibold">Čitam dokument...</p>
              <p className="text-sm text-muted-foreground">Obično traje desetak sekundi.</p>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </Card>
          )}

          {doc.status === 'pending' && !processDoc.isPending && attempted.current === id && (
            <Card className="gap-3 p-5">
              <p className="font-semibold">Dokument još nije pročitan</p>
              <p className="text-sm text-muted-foreground">
                {processDoc.error?.message ?? doc.error ?? 'Čitanje nije uspjelo.'}
              </p>
              <div>
                <Button onClick={() => processDoc.mutate(false)}>
                  <RefreshCw /> Pokušaj ponovno
                </Button>
              </div>
            </Card>
          )}

          {doc.status === 'ready' && (
            <>
              <Card className="gap-2 p-4">
                <CardHeader className="p-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="size-4 text-primary" /> Sažetak
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 text-sm leading-relaxed">{doc.summary || 'Nema sažetka.'}</CardContent>
              </Card>

              {(doc.documentDate || doc.expiryDate || doc.keyFields.length > 0) && (
                <Card className="gap-3 p-4">
                  <CardHeader className="p-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ClipboardList className="size-4 text-primary" /> Ključni podaci
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <dl className="divide-y">
                      {doc.documentDate && (
                        <div className="flex items-baseline justify-between gap-3 py-2">
                          <dt className="text-sm text-muted-foreground">Datum dokumenta</dt>
                          <dd className="font-mono text-sm tabular-nums">{formatDate(doc.documentDate)}</dd>
                        </div>
                      )}
                      {doc.expiryDate && (
                        <div className="flex items-baseline justify-between gap-3 py-2">
                          <dt className="text-sm text-muted-foreground">Vrijedi do</dt>
                          <dd className="font-mono text-sm tabular-nums">{formatDate(doc.expiryDate)}</dd>
                        </div>
                      )}
                      {doc.keyFields.map((f, i) => (
                        <div key={`${f.label}-${i}`} className="flex items-baseline justify-between gap-3 py-2">
                          <dt className="text-sm text-muted-foreground">{f.label}</dt>
                          <dd className="text-right text-sm font-medium break-all">{f.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
              )}

              {doc.keyDates.length > 0 && (
                <Card className="gap-3 p-4">
                  <CardHeader className="p-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CalendarDays className="size-4 text-primary" /> Važni datumi
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 p-0">
                    {doc.keyDates.map((k, i) => (
                      <div key={`${k.date}-${i}`} className="flex items-center justify-between gap-3 border-b py-2 last:border-0">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{k.label}</p>
                          <p className="text-xs text-muted-foreground">{KEY_DATE_LABELS[k.type] ?? 'Ostalo'}</p>
                        </div>
                        <span className="shrink-0 font-mono text-sm tabular-nums">{formatDate(k.date)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {doc.people.length > 0 && (
                <Card className="gap-3 p-4">
                  <CardHeader className="p-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Users className="size-4 text-primary" /> Osobe i organizacije
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2 p-0">
                    {doc.people.map((p, i) => (
                      <Badge key={`${p.name}-${i}`} variant="secondary" className="gap-1.5 py-1 text-sm">
                        <span className="font-semibold">{p.name}</span>
                        {p.role && <span className="text-muted-foreground">· {p.role}</span>}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>
              )}

              {doc.tasks.length > 0 ? (
                <section className="space-y-2">
                  <h2 className="text-base font-semibold">Obaveze iz dokumenta</h2>
                  {doc.tasks.map((t) => (
                    <TaskItem key={t.id} task={t} />
                  ))}
                </section>
              ) : (
                doc.followUp && !doc.followUp.found && (
                  <p className="text-sm text-muted-foreground">U dokumentu nema obaveze s rokom.</p>
                )
              )}
            </>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {doc.status === 'ready' && (
              <Button
                variant="outline"
                onClick={() => processDoc.mutate(true)}
                disabled={processDoc.isPending}
              >
                <RefreshCw /> Ponovno obradi
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive">
                  <Trash2 /> Obriši dokument
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Obrisati dokument?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Dokument će biti trajno obrisan zajedno sa zadacima koji su iz njega izvučeni. Osvojeni HP ostaje.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Odustani</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={() =>
                      del.mutate(doc.id, {
                        onSuccess: () => {
                          toast.success('Dokument obrisan.');
                          void navigate('/dokumenti');
                        },
                      })
                    }
                  >
                    Obriši
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <aside className="space-y-3">
          {desktop ? (
            <div className="sticky top-6 overflow-hidden rounded-lg border bg-card shadow-sm">
              {isPdf ? (
                <iframe src={url} title={doc.title} className="h-[75vh] w-full" />
              ) : (
                <img src={url} alt={doc.title} className="max-h-[75vh] w-full object-contain" />
              )}
            </div>
          ) : (
            !isPdf && <img src={url} alt={doc.title} className="w-full rounded-lg border object-contain" />
          )}
        </aside>
      </div>
    </>
  );
}
