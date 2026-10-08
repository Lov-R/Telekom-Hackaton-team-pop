export type ScanFilter = 'original' | 'sivo' | 'sken';
export type Rotation = 0 | 90 | 180 | 270;

/** Crop rectangle as fractions (0..1) of the rotated image. */
export interface Crop {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ScanPage {
  id: string;
  /** Downscaled (<= 2000px) original used for the final PDF. */
  source: HTMLCanvasElement;
  /** Small copy (<= 480px) used for fast previews. */
  preview: HTMLCanvasElement;
  rotation: Rotation;
  crop: Crop;
  filter: ScanFilter;
}

export const FULL_CROP: Crop = { x: 0, y: 0, w: 1, h: 1 };
const MAX_SIDE = 2000;
const PREVIEW_SIDE = 480;
const JPEG_QUALITY = 0.85;

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function context(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas nije podržan u ovom pregledniku.');
  return ctx;
}

function scaled(src: CanvasImageSource, w: number, h: number, maxSide: number): HTMLCanvasElement {
  const ratio = Math.min(1, maxSide / Math.max(w, h));
  const c = makeCanvas(w * ratio, h * ratio);
  const ctx = context(c);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

export function pageFromCanvas(canvas: HTMLCanvasElement): ScanPage {
  const source = scaled(canvas, canvas.width, canvas.height, MAX_SIDE);
  return {
    id: crypto.randomUUID(),
    source,
    preview: scaled(source, source.width, source.height, PREVIEW_SIDE),
    rotation: 0,
    crop: FULL_CROP,
    filter: 'original',
  };
}

/** Decode an image file (EXIF orientation respected) into a scan page. */
export async function loadPage(file: Blob): Promise<ScanPage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const c = makeCanvas(bitmap.width, bitmap.height);
    context(c).drawImage(bitmap, 0, 0);
    return pageFromCanvas(c);
  } finally {
    bitmap.close();
  }
}

export function rotateCanvas(src: HTMLCanvasElement, rotation: Rotation): HTMLCanvasElement {
  if (rotation === 0) return src;
  const swap = rotation === 90 || rotation === 270;
  const c = makeCanvas(swap ? src.height : src.width, swap ? src.width : src.height);
  const ctx = context(c);
  ctx.translate(c.width / 2, c.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  return c;
}

function percentile(hist: Uint32Array, total: number, p: number): number {
  const target = total * p;
  let acc = 0;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc >= target) return i;
  }
  return 255;
}

/** Grayscale + auto-levels (2nd to 98th percentile); "sken" adds a contrast curve that whitens paper. */
export function applyFilter(canvas: HTMLCanvasElement, filter: ScanFilter): void {
  if (filter === 'original') return;
  const ctx = context(canvas);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const lum = new Uint8Array(d.length / 4);
  const hist = new Uint32Array(256);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const l = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    lum[p] = l;
    hist[l]++;
  }
  const lo = percentile(hist, lum.length, 0.02);
  const hi = Math.max(lo + 1, percentile(hist, lum.length, 0.98));
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    const leveled = Math.min(255, Math.max(0, ((v - lo) * 255) / (hi - lo)));
    if (filter === 'sivo') {
      lut[v] = leveled;
    } else {
      lut[v] = leveled >= 200 ? 255 : 255 * Math.pow(leveled / 200, 1.6);
    }
  }
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const v = lut[lum[p]];
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
}

/** Render a page (rotate, crop, filter) from the full-size source or the fast preview. */
export function renderPage(page: ScanPage, quality: 'full' | 'preview' = 'full'): HTMLCanvasElement {
  const rotated = rotateCanvas(quality === 'full' ? page.source : page.preview, page.rotation);
  const { x, y, w, h } = page.crop;
  const sx = Math.round(x * rotated.width);
  const sy = Math.round(y * rotated.height);
  const sw = Math.max(1, Math.round(w * rotated.width));
  const sh = Math.max(1, Math.round(h * rotated.height));
  const out = makeCanvas(sw, sh);
  context(out).drawImage(rotated, sx, sy, sw, sh, 0, 0, sw, sh);
  applyFilter(out, page.filter);
  return out;
}

export function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Pretvorba slike nije uspjela.'));
          return;
        }
        void blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
      },
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}

export function previewUrl(page: ScanPage): string {
  return renderPage(page, 'preview').toDataURL('image/jpeg', 0.7);
}

/** The rotated, uncropped, unfiltered preview used by the crop editor. */
export function rotatedPreviewUrl(page: ScanPage): string {
  return rotateCanvas(page.preview, page.rotation).toDataURL('image/jpeg', 0.8);
}
