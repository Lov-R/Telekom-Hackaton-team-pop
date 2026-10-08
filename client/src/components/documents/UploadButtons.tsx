import { useRef, useState } from 'react';
import { Camera, FileUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useUploadDocument } from '@/hooks/queries';
import { downscaleImage } from '@/lib/image';

const MAX_PDF_BYTES = 10 * 1024 * 1024;

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
      toast.error('PDF je prevelik (najviše 10 MB).');
      return;
    }
    upload.mutate(toSend, { onSuccess: () => toast('Čitam dokument...', { description: 'Za par sekundi bit će u svojoj mapi.' }) });
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button size="lg" disabled={busy} onClick={() => camera.current?.click()}>
          {busy ? <Loader2 className="animate-spin" /> : <Camera />} Slikaj dokument
        </Button>
        <Button size="lg" variant="secondary" disabled={busy} onClick={() => picker.current?.click()}>
          <FileUp /> Uploadaj datoteku
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Položi dokument na stol i slikaj odozgo, cijeli u kadru.</p>
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
