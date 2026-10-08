import { useRef, useState, type DragEvent } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';
const MAX_BYTES = 10 * 1024 * 1024;

interface PdfDropzoneProps {
  onFile: (file: File) => void;
  busy: boolean;
}

export function PdfDropzone({ onFile, busy }: PdfDropzoneProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = (file: File | undefined): void => {
    if (!file) return;
    if (!ACCEPT.split(',').includes(file.type)) {
      toast.error('Podržani su samo PDF, JPEG, PNG i WebP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Datoteka je prevelika (najviše 10 MB).');
      return;
    }
    onFile(file);
  };

  const onDrop = (e: DragEvent): void => {
    e.preventDefault();
    setOver(false);
    take(e.dataTransfer.files[0]);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        'flex flex-col items-center gap-4 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors',
        over ? 'border-primary bg-secondary' : 'border-primary/30 bg-card/70',
      )}
    >
      <div className="flex size-16 items-center justify-center rounded-xl bg-secondary text-primary">
        {busy ? <Loader2 className="size-8 animate-spin" /> : <FileUp className="size-8" />}
      </div>
      <div className="space-y-1">
        <p className="text-lg font-semibold">{busy ? 'Učitavanje...' : 'Povuci PDF ovdje'}</p>
        <p className="text-sm text-muted-foreground">ili odaberi datoteku s uređaja (PDF, JPEG, PNG, WebP do 10 MB)</p>
      </div>
      <Button size="lg" disabled={busy} onClick={() => input.current?.click()}>
        Odaberi datoteku
      </Button>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
