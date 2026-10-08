import { useRef, useState } from 'react';
import { Camera, FileUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useUploadDocument } from '@/hooks/queries';
import { downscaleImage } from '@/lib/image';

/** Netlify accepts request bodies up to ~4.5 MB of binary data. */
const MAX_PDF_BYTES = 4 * 1024 * 1024;

/** The file input's id, so other buttons (the Dokumenti header) can open the same picker with a <label>. */
export const PICKER_ID = 'document-picker';

/** SRS §5.2: "Slikaj dokument" (camera) and "Uploadaj datoteku" (image or PDF). */
export function UploadButtons() {
  const camera = useRef<HTMLInputElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const upload = useUploadDocument();
  const [preparing, setPreparing] = useState(false);
  const busy = preparing || upload.isPending;

  const take = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    let toSend = file;
    if (file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name)) {
      setPreparing(true);
      try {
        toSend = await downscaleImage(file);
      } finally {
        setPreparing(false);
      }
    } else if (file.type !== 'application/pdf') {
      toast.error('Podržane su slike (JPG, PNG) i PDF.');
      return;
    } else if (file.size > MAX_PDF_BYTES) {
      toast.error('PDF je prevelik (najviše 4 MB).');
      return;
    }
    upload.mutate(toSend, {
      onSuccess: () => toast('Dokument je spremljen', { description: 'Sažetak i rokove pročitam kad ga otvoriš.' }),
    });
  };

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <FileUp className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="font-extrabold">Dodaj datoteke</p>
          <p className="text-xs text-muted-foreground">PDF ili fotografija · do 4 MB · pročitam ih kad ih otvoriš</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="warm" disabled={busy} onClick={() => camera.current?.click()}>
          {busy ? <Loader2 className="animate-spin" /> : <Camera />} Slikaj
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => picker.current?.click()}>
          <FileUp /> Datoteka
        </Button>
      </div>
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          void take(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={picker}
        id={PICKER_ID}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          void take(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
