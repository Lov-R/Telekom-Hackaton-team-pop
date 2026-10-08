import { useRef, type PointerEvent } from 'react';
import type { Crop } from './imageProcessing';

type Corner = 'tl' | 'tr' | 'bl' | 'br';
const MIN = 0.1;

interface CropEditorProps {
  src: string;
  crop: Crop;
  onChange: (crop: Crop) => void;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Rectangular crop with draggable corner handles; crop is stored as fractions of the image. */
export function CropEditor({ src, crop, onChange }: CropEditorProps) {
  const box = useRef<HTMLDivElement>(null);

  const move = (corner: Corner) => (e: PointerEvent<HTMLButtonElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId) || !box.current) return;
    const r = box.current.getBoundingClientRect();
    const px = clamp((e.clientX - r.left) / r.width, 0, 1);
    const py = clamp((e.clientY - r.top) / r.height, 0, 1);
    const right = crop.x + crop.w;
    const bottom = crop.y + crop.h;
    let { x, y } = crop;
    let x2 = right;
    let y2 = bottom;
    if (corner === 'tl' || corner === 'bl') x = Math.min(px, right - MIN);
    else x2 = Math.max(px, crop.x + MIN);
    if (corner === 'tl' || corner === 'tr') y = Math.min(py, bottom - MIN);
    else y2 = Math.max(py, crop.y + MIN);
    onChange({ x, y, w: x2 - x, h: y2 - y });
  };

  const handle = (corner: Corner, left: number, top: number) => (
    <button
      key={corner}
      type="button"
      aria-label="Povuci kut za obrezivanje"
      onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
      onPointerMove={move(corner)}
      className="absolute size-7 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-[3px] border-white bg-primary shadow-lg"
      style={{ left: `${left * 100}%`, top: `${top * 100}%` }}
    />
  );

  return (
    <div className="flex justify-center">
      <div ref={box} className="relative inline-block max-w-full select-none">
        <img src={src} alt="Stranica za obrezivanje" draggable={false} className="block max-h-[55dvh] max-w-full rounded-lg" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg">
          <div
            className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(20,10,60,0.55)]"
            style={{
              left: `${crop.x * 100}%`,
              top: `${crop.y * 100}%`,
              width: `${crop.w * 100}%`,
              height: `${crop.h * 100}%`,
            }}
          />
        </div>
        {handle('tl', crop.x, crop.y)}
        {handle('tr', crop.x + crop.w, crop.y)}
        {handle('bl', crop.x, crop.y + crop.h)}
        {handle('br', crop.x + crop.w, crop.y + crop.h)}
      </div>
    </div>
  );
}
