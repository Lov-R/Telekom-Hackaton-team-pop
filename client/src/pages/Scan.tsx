import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { CameraCapture } from '@/components/scan/CameraCapture';
import { PageEditor } from '@/components/scan/PageEditor';
import { PdfDropzone } from '@/components/scan/PdfDropzone';
import { buildPdf } from '@/components/scan/buildPdf';
import type { ScanPage } from '@/components/scan/imageProcessing';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUploadDocument } from '@/hooks/queries';

export default function Scan() {
  const navigate = useNavigate();
  const upload = useUploadDocument();
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [building, setBuilding] = useState(false);

  const send = (file: File): void => {
    upload.mutate(file, {
      onSuccess: (doc) => {
        toast('Čitam dokument...');
        setPages([]);
        void navigate(`/dokumenti/${doc.id}`);
      },
    });
  };

  const save = async (): Promise<void> => {
    setBuilding(true);
    try {
      send(await buildPdf(pages));
    } catch {
      toast.error('PDF se nije mogao izraditi.');
    } finally {
      setBuilding(false);
    }
  };

  return (
    <>
      <PageHeader title="Skeniraj" subtitle="Više stranica u jedan PDF" backTo="/dokumenti" />
      <Tabs defaultValue="pdf" className="gap-4">
        <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl">
          <TabsTrigger value="pdf" className="rounded-lg font-semibold">
            PDF datoteka
          </TabsTrigger>
          <TabsTrigger value="camera" className="rounded-lg font-semibold">
            Kamera
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pdf">
          <PdfDropzone onFile={send} busy={upload.isPending} />
        </TabsContent>
        <TabsContent value="camera" className="space-y-4">
          {pages.length > 0 && (
            <PageEditor pages={pages} onChange={setPages} onSave={() => void save()} saving={building || upload.isPending} />
          )}
          <CameraCapture hasPages={pages.length > 0} onPages={(added) => setPages((cur) => [...cur, ...added])} />
        </TabsContent>
      </Tabs>
    </>
  );
}
