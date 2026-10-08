import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Crop as CropIcon, FileDown, Loader2, RotateCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { CropEditor } from './CropEditor';
import {
  FULL_CROP,
  previewUrl,
  rotatedPreviewUrl,
  type Rotation,
  type ScanFilter,
  type ScanPage,
} from './imageProcessing';

const FILTERS: { key: ScanFilter; label: string }[] = [
  { key: 'original', label: 'Original' },
  { key: 'sivo', label: 'Sivo' },
  { key: 'sken', label: 'Sken' },
];

interface PageEditorProps {
  pages: ScanPage[];
  onChange: (pages: ScanPage[]) => void;
  onSave: () => void;
  saving: boolean;
}

function Thumb({ page }: { page: ScanPage }) {
  const url = useMemo(
    () => previewUrl(page),
    [page.id, page.rotation, page.crop, page.filter],
  );
  return <img src={url} alt="Stranica" className="h-full w-full object-contain" />;
}

export function PageEditor({ pages, onChange, onSave, saving }: PageEditorProps) {
  const [editId, setEditId] = useState<string | null>(null);
  const editing = pages.find((p) => p.id === editId) ?? null;

  const update = (id: string, patch: Partial<ScanPage>): void =>
    onChange(pages.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const moveBy = (index: number, delta: number): void => {
    const next = [...pages];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const rotate = (page: ScanPage): void =>
    update(page.id, { rotation: ((page.rotation + 90) % 360) as Rotation, crop: FULL_CROP });

  const editUrl = useMemo(
    () => (editing ? rotatedPreviewUrl(editing) : ''),
    [editing?.id, editing?.rotation],
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {pages.map((p, i) => (
          <div key={p.id} className="space-y-1.5 rounded-lg border bg-card p-2 shadow-sm">
            <button
              type="button"
              onClick={() => setEditId(p.id)}
              className="relative block aspect-[3/4] w-full overflow-hidden rounded-xl bg-muted"
              aria-label={`Uredi stranicu ${i + 1}`}
            >
              <Thumb page={p} />
              <span className="absolute top-1.5 left-1.5 rounded-sm bg-foreground/80 px-1.5 py-0.5 font-mono text-xs text-background">
                {i + 1}
              </span>
            </button>
            <div className="flex items-center justify-between">
              <div className="flex">
                <Button variant="ghost" size="icon-sm" onClick={() => moveBy(i, -1)} disabled={i === 0} aria-label="Pomakni lijevo">
                  <ArrowLeft />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => moveBy(i, 1)} disabled={i === pages.length - 1} aria-label="Pomakni desno">
                  <ArrowRight />
                </Button>
              </div>
              <div className="flex">
                <Button variant="ghost" size="icon-sm" onClick={() => setEditId(p.id)} aria-label="Uredi">
                  <CropIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive"
                  onClick={() => onChange(pages.filter((x) => x.id !== p.id))}
                  aria-label="Obriši stranicu"
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button size="lg" className="w-full" onClick={onSave} disabled={saving || pages.length === 0}>
        {saving ? <Loader2 className="animate-spin" /> : <FileDown />}
        {saving ? 'Spremanje...' : `Spremi kao PDF (${pages.length} str.)`}
      </Button>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Uredi stranicu</DialogTitle>
            <DialogDescription>Povuci kutove za obrezivanje, zarotiraj ili odaberi filter.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <CropEditor src={editUrl} crop={editing.crop} onChange={(crop) => update(editing.id, { crop })} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button variant="outline" size="sm" onClick={() => rotate(editing)}>
                  <RotateCw /> Zarotiraj 90°
                </Button>
                <div className="flex gap-1 rounded-md bg-muted p-1">
                  {FILTERS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => update(editing.id, { filter: f.key })}
                      className={cn(
                        'rounded-sm px-3 py-1 text-sm font-medium transition-colors',
                        editing.filter === f.key ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground',
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mx-auto aspect-[3/4] h-40 overflow-hidden rounded-xl border bg-muted">
                <Thumb page={editing} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setEditId(null)}>Gotovo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
