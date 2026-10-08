import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Images, Video, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { loadPage, pageFromCanvas, type ScanPage } from './imageProcessing';

interface CameraCaptureProps {
  onPages: (pages: ScanPage[]) => void;
  hasPages: boolean;
}

export function CameraCapture({ onPages, hasPages }: CameraCaptureProps) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [live, setLive] = useState(false);
  const canLive = window.isSecureContext && !!navigator.mediaDevices?.getUserMedia;

  const stop = useCallback((): void => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setLive(false);
  }, []);

  useEffect(() => stop, [stop]);

  const handleFiles = async (files: FileList | null): Promise<void> => {
    if (!files?.length) return;
    try {
      const pages = await Promise.all([...files].map((f) => loadPage(f)));
      onPages(pages);
    } catch {
      toast.error('Slika se nije mogla učitati.');
    }
  };

  const startLive = async (): Promise<void> => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      stream.current = s;
      setLive(true);
      requestAnimationFrame(() => {
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
      });
    } catch {
      toast.error('Kamera nije dostupna. Provjeri dozvole preglednika.');
    }
  };

  const snap = (): void => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d')?.drawImage(v, 0, 0);
    onPages([pageFromCanvas(c)]);
    toast.success('Stranica dodana.');
  };

  return (
    <div className="space-y-3">
      {live ? (
        <div className="overflow-hidden rounded-xl bg-black">
          <video ref={video} playsInline muted className="aspect-[3/4] w-full object-cover md:aspect-video" />
          <div className="flex items-center justify-center gap-3 bg-black/80 p-3">
            <Button size="lg" onClick={snap}>
              <Camera /> Slikaj
            </Button>
            <Button size="lg" variant="outline" onClick={stop}>
              <X /> Zatvori
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-primary/30 bg-card/70 px-6 py-10 text-center">
          <div className="flex size-16 items-center justify-center rounded-xl bg-secondary text-primary">
            <Camera className="size-8" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold">{hasPages ? 'Dodaj još stranica' : 'Slikaj dokument'}</p>
            <p className="text-sm text-muted-foreground">
              Fotografiraj jednu ili više stranica, uredi ih i spremi kao čisti PDF.
            </p>
          </div>
          <div className="flex w-full max-w-xs flex-col gap-2">
            <Button size="lg" onClick={() => cameraInput.current?.click()}>
              <Camera /> Otvori kameru
            </Button>
            <Button size="lg" variant="outline" onClick={() => galleryInput.current?.click()}>
              <Images /> Iz galerije
            </Button>
            {canLive && (
              <Button variant="ghost" onClick={() => void startLive()}>
                <Video /> Kamera uživo
              </Button>
            )}
          </div>
        </div>
      )}
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
